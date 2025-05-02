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
  private state: AgentState;
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
    this.state = {
      messages: [{
        role: 'system',
        content: config.systemPrompt
      }],
      toolCalls: []
    };
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
      const response = await this.llmClient.createChatCompletion({
        model: this.config.model ?? 'anthropic/claude-3-opus:beta', // Default model if none specified
        messages: this.state.messages,
        tools: tools.length > 0 ? tools : undefined,
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens
      });

      const assistantMessage = response.choices[0].message;
      this.state.messages.push(assistantMessage);

      // Handle tool calls if present
      // Tool calls are stored in the assistantMessage but need to be accessed in a type-safe way
      const assistantMessageWithToolCalls = assistantMessage as unknown as { tool_calls?: ToolCall[] };
      const toolCalls = assistantMessageWithToolCalls.tool_calls || [];
      const toolsUsed: string[] = [];

      if (toolCalls.length > 0) {
        this.emit(AgentEvent.THINKING, 'Agent is executing tools...');

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
      const args = JSON.parse(toolCall.function.arguments);
      
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
    this.state = {
      messages: [{
        role: 'system',
        content: this.config.systemPrompt
      }],
      toolCalls: []
    };
  }

  /**
   * Get the current conversation history
   */
  getConversationHistory(): Message[] {
    return [...this.state.messages];
  }
}
