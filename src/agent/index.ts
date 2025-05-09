import { createChatCompletion, ChatCompletion } from '../llm/openai';
import { ToolManager } from '../tools/toolManager';
import { Tool } from '../tools/baseTool';
import { AgentConfig, AgentEvent, AgentEventListener, AgentResponse, AgentState, UserInput } from './types';
import { ChatCompletionMessageParam, ChatCompletionTool } from 'openai/resources/chat/completions';
import { env } from '../config/env';

/**
 * Agent class for handling user inputs and executing tasks using LLM and tools
 */
export class Agent {
  private toolManager: ToolManager;
  private state: AgentState = { messages: [], toolCalls: [] }; // Initialize with default empty state
  private config: AgentConfig;
  private eventListeners: Map<AgentEvent, AgentEventListener[]> = new Map();

  constructor(
    config: AgentConfig,
    tools: Tool[] = []
  ) {
    this.toolManager = new ToolManager();
    this.toolManager.registerTools(tools);
    this.config = config;
    
    // Initialize the state with an enhanced system message including detailed tool instructions
    this.resetState();
  }

  /**
   * Process user input and return a response
   */
  async processInput(input: UserInput): Promise<AgentResponse> {
    try {
      // Add user message to conversation history
      this.state.messages.push({
        role: 'user',
        content: input.message
      });

      // Get response from LLM
      const tools = this.toolManager.getFunctionDefinitions();
      
      if (tools.length > 0) {
        this.emit(AgentEvent.THINKING, `Agent has access to ${tools.length} tools`);
      }
      
      // Make sure the system prompt includes the latest tool definitions
      this.updateSystemPromptWithTools();
      
      const response = await createChatCompletion({
        model: this.config.model || env.OPENROUTER_MODEL,
        messages: this.state.messages,
        tools: tools.length > 0 ? tools as ChatCompletionTool[] : undefined,
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens
      });

      // Handle the response as ChatCompletion
      const chatCompletion = response as ChatCompletion;
      const assistantMessage = chatCompletion.choices[0].message;
      this.state.messages.push(assistantMessage as ChatCompletionMessageParam);

      // Extract tool calls from the response
      const toolCalls = assistantMessage.tool_calls || [];
      const toolsUsed: string[] = [];

      if (toolCalls.length > 0) {
        this.emit(AgentEvent.THINKING, `Agent is executing ${toolCalls.length} tools...`);

        // Process each tool call
        for (const toolCall of toolCalls) {
          await this.processToolCall(toolCall);
          toolsUsed.push(toolCall.function.name);
        }

        // Get final response after tool usage
        return await this.getFinalResponse(toolsUsed);
      }

      // Return the response if no tools were used
      return {
        message: typeof assistantMessage.content === 'string' 
          ? assistantMessage.content 
          : JSON.stringify(assistantMessage.content) ?? '',
        toolsUsed: []
      };
    } catch (error) {
      this.emit(AgentEvent.ERROR, error);
      throw error;
    }
  }

  /**
   * Update the system prompt to include detailed tool definitions and generate examples
   */
  private updateSystemPromptWithTools(): void {
    const tools = this.toolManager.getAllTools();
    
    if (tools.length === 0) {
      return;
    }
    
    // Always preserve the original prompt
    let basePrompt = this.config.systemPrompt || 'You are a helpful AI assistant that can use tools to accomplish tasks.';
    
    // Create a full dynamic system prompt
    let systemPrompt = `${basePrompt}\n\n`;
    
    // Add tool descriptions
    systemPrompt += `You have access to the following tools:\n`;
    
    for (const tool of tools) {
      const functionDef = tool.getFunctionDefinition().function;
      
      systemPrompt += `Tool: ${functionDef.name}\n`;
      systemPrompt += `Description: ${functionDef.description}\n`;
      
      // Add parameter details
      if (functionDef.parameters && functionDef.parameters.properties) {
        systemPrompt += 'Parameters:\n';
        
        for (const [paramName, paramDetails] of Object.entries(functionDef.parameters.properties)) {
          const details = paramDetails as any;
          systemPrompt += `- ${paramName}`;
          
          if (details.type) {
            systemPrompt += ` (${details.type})`;
          }
          
          if (details.description) {
            systemPrompt += `: ${details.description}`;
          }
          
          if (details.enum) {
            systemPrompt += ` [${details.enum.join(', ')}]`;
          }
          
          systemPrompt += '\n';
        }
      }
      
      systemPrompt += '\n';
    }
    
    // Add usage instructions
    systemPrompt += `IMPORTANT INSTRUCTIONS FOR USING TOOLS:\n`;
    systemPrompt += `1. When a task requires using a tool, identify the appropriate tool\n`;
    systemPrompt += `2. Call the tool with the required parameters\n`;
    systemPrompt += `3. Wait for the tool execution to complete before providing your final response\n`;
    systemPrompt += `4. Base your response on the tool's output\n\n`;
    
    // Add specific instructions for each tool
    systemPrompt += `WHEN TO USE SPECIFIC TOOLS:\n`;
    tools.forEach((tool, index) => {
      systemPrompt += `- If a user asks about ${tool.name.replace(/_/g, ' ')}, use the ${tool.name} tool\n`;
    });
    systemPrompt += `\n`;
    
    // Generate examples only for tools that have them
    const toolsWithExamples = tools
      .map(tool => ({ tool, example: tool.generateUsageExample() }))
      .filter(item => item.example !== undefined);
    
    if (toolsWithExamples.length > 0) {
      systemPrompt += `EXAMPLES:\n`;
      for (const { tool, example } of toolsWithExamples) {
        systemPrompt += `- For ${tool.name}: "${example}"\n`;
      }
    }
    
    // Update the system message in the conversation history
    if (this.state.messages.length > 0 && this.state.messages[0].role === 'system') {
      this.state.messages[0].content = systemPrompt;
    } else {
      // If there's no system message yet, add it
      this.state.messages.unshift({
        role: 'system',
        content: systemPrompt
      });
    }
  }

  /**
   * Process a single tool call
   */
  private async processToolCall(toolCall: any): Promise<void> {
    const toolName = toolCall.function.name;
    const tool = this.toolManager.getTool(toolName);

    if (!tool) {
      console.warn(`Tool "${toolName}" not found`);
      return;
    }

    try {
      // Parse arguments from JSON string
      let args;
      try {
        args = JSON.parse(toolCall.function.arguments);
      } catch (e) {
        // If JSON parsing fails, maybe it's already an object
        if (typeof toolCall.function.arguments === 'object') {
          args = toolCall.function.arguments;
        } else {
          throw e;
        }
      }
      
      this.emit(AgentEvent.TOOL_START, {
        tool: toolName,
        args
      });

      // Execute the tool
      const result = await this.toolManager.executeTool(toolName, args);
      
      this.emit(AgentEvent.TOOL_END, {
        tool: toolName,
        result
      });

      // Add tool response to messages
      this.state.messages.push({
        role: 'tool',
        content: JSON.stringify(result),
        tool_call_id: toolCall.id
      });

      // Store the tool call and its response in state
      this.state.toolCalls.push({
        id: toolCall.id,
        name: toolName,
        args,
        response: result
      });
    } catch (error) {
      console.error(`Error executing tool "${toolName}":`, error);
      
      // Add error message as tool response
      this.state.messages.push({
        role: 'tool',
        content: `Error: ${error instanceof Error ? error.message : String(error)}`,
        tool_call_id: toolCall.id
      });
    }
  }

  /**
   * Get final response after tool usage
   */
  private async getFinalResponse(toolsUsed: string[]): Promise<AgentResponse> {
    // Get response from LLM with tool results
    const response = await createChatCompletion({
      model: this.config.model || env.OPENROUTER_MODEL,
      messages: this.state.messages,
      temperature: this.config.temperature,
      max_tokens: this.config.maxTokens
    });

    // Handle the response as ChatCompletion
    const chatCompletion = response as ChatCompletion;
    const assistantMessage = chatCompletion.choices[0].message;
    this.state.messages.push(assistantMessage as ChatCompletionMessageParam);

    this.emit(AgentEvent.RESPONSE, assistantMessage);

    return {
      message: typeof assistantMessage.content === 'string' 
        ? assistantMessage.content 
        : JSON.stringify(assistantMessage.content) ?? '',
      toolsUsed
    };
  }

  /**
   * Register tools for the agent to use
   */
  registerTools(tools: Tool[]): void {
    this.toolManager.registerTools(tools);
    
    // Update the system prompt with the new tools
    this.updateSystemPromptWithTools();
  }

  /**
   * Subscribe to agent events
   */
  on(event: AgentEvent, listener: AgentEventListener): void {
    const listeners = this.eventListeners.get(event) || [];
    listeners.push(listener);
    this.eventListeners.set(event, listeners);
  }

  /**
   * Emit an event to all listeners
   */
  private emit(event: AgentEvent, data: any): void {
    const listeners = this.eventListeners.get(event) || [];
    for (const listener of listeners) {
      listener(event, data);
    }
  }

  /**
   * Reset the agent state
   */
  reset(): void {
    this.resetState();
  }
  
  /**
   * Initialize or reset the agent state
   */
  private resetState(): void {
    // Create initial state with system message
    this.state = {
      messages: [{
        role: 'system',
        content: this.config.systemPrompt ?? ''
      }],
      toolCalls: []
    };
    
    // Update the system prompt with tool definitions
    this.updateSystemPromptWithTools();
  }

  /**
   * Get the current conversation history
   */
  getConversationHistory(): ChatCompletionMessageParam[] {
    return [...this.state.messages];
  }
}
