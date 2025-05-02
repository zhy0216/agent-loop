import { OpenRouterClient } from '../llm/openrouter';
import { ToolRegistry } from '../tools/toolRegistry';
import { BaseTool } from '../tools/baseTool';
import { AgentConfig, AgentEvent, AgentEventListener, AgentResponse, AgentState, UserInput } from './types';
import { Message, ToolCall } from '../llm/types';

/**
 * Agent class for handling user inputs and executing tasks using LLM and tools
 */
export class Agent {
  private llmClient: OpenRouterClient;
  private toolRegistry: ToolRegistry;
  private state: AgentState = { messages: [], toolCalls: [] }; // Initialize with default empty state
  private config: AgentConfig;
  private eventListeners: Map<AgentEvent, AgentEventListener[]> = new Map();

  constructor(
    config: AgentConfig,
    toolRegistry: ToolRegistry,
    llmClient?: OpenRouterClient
  ) {
    this.llmClient = llmClient || new OpenRouterClient();
    this.toolRegistry = toolRegistry;
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
      const tools = this.toolRegistry.getFunctionDefinitions();
      
      if (tools.length > 0) {
        this.emit(AgentEvent.THINKING, `Agent has access to ${tools.length} tools`);
      }
      
      // Make sure the system prompt includes the latest tool definitions
      this.updateSystemPromptWithTools();
      
      const response = await this.llmClient.createChatCompletion({
        model: this.config.model ?? 'anthropic/claude-3-opus:beta', // Default model if none specified
        messages: this.state.messages,
        tools: tools.length > 0 ? tools : undefined,
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens
      });

      const assistantMessage = response.choices[0].message;
      this.state.messages.push(assistantMessage);

      // Extract tool calls from the response
      const toolCalls = this.extractToolCalls(assistantMessage);
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
   * Update the system prompt to include detailed tool definitions
   */
  private updateSystemPromptWithTools(): void {
    const tools = this.toolRegistry.getAllTools();
    
    if (tools.length === 0) {
      return;
    }
    
    // Build a detailed tools description
    let toolsDescription = 'You have access to the following tools:\n\n';
    
    for (const tool of tools) {
      const functionDef = tool.getFunctionDefinition().function;
      
      toolsDescription += `Tool: ${functionDef.name}\n`;
      toolsDescription += `Description: ${functionDef.description}\n`;
      
      // Add parameter details
      if (functionDef.parameters && functionDef.parameters.properties) {
        toolsDescription += 'Parameters:\n';
        
        for (const [paramName, paramDetails] of Object.entries(functionDef.parameters.properties)) {
          const details = paramDetails as any;
          toolsDescription += `- ${paramName}`;
          
          if (details.type) {
            toolsDescription += ` (${details.type})`;
          }
          
          if (details.description) {
            toolsDescription += `: ${details.description}`;
          }
          
          if (details.enum) {
            toolsDescription += ` Options: ${details.enum.join(', ')}`;
          }
          
          toolsDescription += '\n';
        }
      }
      
      // Add example usage
      toolsDescription += `Example usage: Call the ${functionDef.name} function with the proper parameters\n\n`;
    }
    
    // Add clear instructions
    toolsDescription += `\nIMPORTANT INSTRUCTIONS FOR USING TOOLS:
1. When a user's request requires information that can be obtained through one of these tools, you MUST use the appropriate tool
2. You can call a tool by specifying the tool name and providing the required parameters
3. After receiving the tool's response, use that information to give a complete answer to the user
4. You CANNOT make up information. If you need data, use a tool to get it
5. NEVER invent parameters or options that don't exist in the tool definitions above
6. Always wait for tool results before providing a final response\n`;

    // Update the first system message
    if (this.state.messages.length > 0 && this.state.messages[0].role === 'system') {
      const baseSystemPrompt = this.config.systemPrompt || 'You are a helpful AI assistant that can use tools to accomplish tasks.';
      this.state.messages[0].content = `${baseSystemPrompt}\n\n${toolsDescription}`;
    }
  }

  /**
   * Extract tool calls from different possible formats
   */
  private extractToolCalls(assistantMessage: Message): ToolCall[] {
    // Different models might return tool calls in different formats
    // Check if it's available directly in the message
    const messageAny = assistantMessage as any;
    
    // Format 1: OpenAI format with tool_calls property
    if (Array.isArray(messageAny.tool_calls)) {
      return messageAny.tool_calls;
    }
    
    // Format 2: Some models might use function_call instead
    if (messageAny.function_call) {
      return [{
        id: `call_${Date.now()}`,
        type: 'function',
        function: {
          name: messageAny.function_call.name,
          arguments: messageAny.function_call.arguments
        }
      }];
    }
    
    // Format 3: Check if content contains tool calls in JSON format
    if (typeof messageAny.content === 'string') {
      try {
        // Some models might embed function calls in content
        const contentStr = messageAny.content;
        const functionCallMatch = contentStr.match(/```json\s*(\{[\s\S]*?\})\s*```/);
        
        if (functionCallMatch && functionCallMatch[1]) {
          const parsedJson = JSON.parse(functionCallMatch[1]);
          
          if (parsedJson.name && parsedJson.arguments) {
            return [{
              id: `call_${Date.now()}`,
              type: 'function',
              function: {
                name: parsedJson.name,
                arguments: typeof parsedJson.arguments === 'string' 
                  ? parsedJson.arguments 
                  : JSON.stringify(parsedJson.arguments)
              }
            }];
          }
        }
      } catch (e) {
        console.warn('Failed to parse potential function call from content:', e);
      }
    }
    
    // No tool calls found
    return [];
  }

  /**
   * Process a single tool call
   */
  private async processToolCall(toolCall: ToolCall): Promise<void> {
    const toolName = toolCall.function.name;
    const tool = this.toolRegistry.getTool(toolName);

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
      const result = await this.toolRegistry.executeTool(toolName, args);
      
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
    const response = await this.llmClient.createChatCompletion({
      model: this.config.model ?? 'anthropic/claude-3-opus:beta', // Default model if none specified
      messages: this.state.messages,
      temperature: this.config.temperature,
      max_tokens: this.config.maxTokens
    });

    const assistantMessage = response.choices[0].message;
    this.state.messages.push(assistantMessage);

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
  registerTools(tools: BaseTool[]): void {
    this.toolRegistry.registerTools(tools);
    
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
        content: this.config.systemPrompt
      }],
      toolCalls: []
    };
    
    // Update the system prompt with tool definitions
    this.updateSystemPromptWithTools();
  }

  /**
   * Get the current conversation history
   */
  getConversationHistory(): Message[] {
    return [...this.state.messages];
  }
}
