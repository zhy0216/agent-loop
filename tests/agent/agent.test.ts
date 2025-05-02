import { Agent } from '../../src/agent';
import { ToolRegistry } from '../../src/tools/toolRegistry';
import { BaseTool } from '../../src/tools/baseTool';
import { AgentEvent } from '../../src/agent/types';
import { z } from 'zod';
import { OpenRouterClient } from '../../src/llm/openrouter';
import { Message } from '../../src/llm/types';

// Mock the OpenRouterClient
jest.mock('../../src/llm/openrouter');

// Create a mock tool for testing
class MockTool implements BaseTool {
  name: string;
  description: string;
  schema: z.ZodType;

  constructor(name: string) {
    this.name = name;
    this.description = `Mock tool ${name}`;
    this.schema = z.object({ param: z.string() });
  }

  async execute(args: any): Promise<any> {
    return { result: `Executed ${this.name} with ${args.param}` };
  }

  getFunctionDefinition() {
    return {
      type: 'function' as const,
      function: {
        name: this.name,
        description: this.description,
        parameters: {
          type: 'object',
          properties: {
            param: { type: 'string' }
          },
          required: ['param']
        }
      }
    };
  }
}

describe('Agent', () => {
  let agent: Agent;
  let toolRegistry: ToolRegistry;
  let mockLlmClient: jest.Mocked<OpenRouterClient>;
  let mockTool: MockTool;

  beforeEach(() => {
    // Set up mocks
    mockLlmClient = new OpenRouterClient() as jest.Mocked<OpenRouterClient>;
    
    // Mock the createChatCompletion method
    mockLlmClient.createChatCompletion = jest.fn().mockImplementation(async (options) => {
      // A basic mock response for most cases
      const basicResponse = {
        id: 'mock-response-id',
        object: 'chat.completion',
        created: Date.now(),
        model: 'mock-model',
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: 'This is a mock response'
          },
          finish_reason: 'stop'
        }],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30
        }
      };

      // Check if the messages contain a tool call and simulate a function call response
      if (options.tools && options.tools.length > 0 && 
          options.messages.some((m: Message) => m.role === 'user' && 
                               typeof m.content === 'string' && 
                               m.content.includes('use tool'))) {
        return {
          ...basicResponse,
          choices: [{
            index: 0,
            message: {
              role: 'assistant',
              content: null,
              tool_calls: [{
                id: 'mock-tool-call-id',
                type: 'function',
                function: {
                  name: 'mock_tool',
                  arguments: JSON.stringify({ param: 'test_value' })
                }
              }]
            },
            finish_reason: 'tool_calls'
          }]
        };
      }

      return basicResponse;
    });

    // Initialize test objects
    toolRegistry = new ToolRegistry();
    mockTool = new MockTool('mock_tool');
    toolRegistry.registerTool(mockTool);

    agent = new Agent(
      {
        systemPrompt: 'You are a test assistant',
        model: 'test-model',
        temperature: 0.5,
        maxTokens: 1000
      },
      toolRegistry,
      mockLlmClient
    );
  });

  describe('processInput', () => {
    it('should process user input and return a response', async () => {
      const response = await agent.processInput({ message: 'Hello' });
      
      expect(response.message).toBe('This is a mock response');
      expect(response.toolsUsed).toEqual([]);
      expect(mockLlmClient.createChatCompletion).toHaveBeenCalledTimes(1);
    });

    it('should process tool calls when the LLM requests them', async () => {
      // Spy on the processToolCall method
      const processToolCallSpy = jest.spyOn(agent as any, 'processToolCall');
      
      const response = await agent.processInput({ message: 'Please use tool' });
      
      expect(mockLlmClient.createChatCompletion).toHaveBeenCalledTimes(2); // Initial call + final response
      expect(processToolCallSpy).toHaveBeenCalled();
    });
  });

  describe('events', () => {
    it('should emit events during processing', async () => {
      const thinkingListener = jest.fn();
      const toolStartListener = jest.fn();
      const toolEndListener = jest.fn();
      const errorListener = jest.fn();
      
      agent.on(AgentEvent.THINKING, thinkingListener);
      agent.on(AgentEvent.TOOL_START, toolStartListener);
      agent.on(AgentEvent.TOOL_END, toolEndListener);
      agent.on(AgentEvent.ERROR, errorListener);
      
      await agent.processInput({ message: 'Please use tool' });
      
      expect(thinkingListener).toHaveBeenCalled();
      expect(toolStartListener).toHaveBeenCalled();
      expect(toolEndListener).toHaveBeenCalled();
      expect(errorListener).not.toHaveBeenCalled();
    });
  });

  describe('tool handling', () => {
    it('should extract tool calls from different formats', async () => {
      // Test the private extractToolCalls method using any type assertion
      const agentAny = agent as any;
      
      // Test OpenAI format
      const openaiMessage = {
        role: 'assistant',
        content: null,
        tool_calls: [{
          id: 'call-id',
          type: 'function',
          function: {
            name: 'mock_tool',
            arguments: '{"param":"test"}'
          }
        }]
      };
      
      const openaiToolCalls = agentAny.extractToolCalls(openaiMessage);
      expect(openaiToolCalls).toHaveLength(1);
      expect(openaiToolCalls[0].function.name).toBe('mock_tool');
      
      // Test function_call format
      const functionCallMessage = {
        role: 'assistant',
        content: null,
        function_call: {
          name: 'mock_tool',
          arguments: '{"param":"test"}'
        }
      };
      
      const functionCallToolCalls = agentAny.extractToolCalls(functionCallMessage);
      expect(functionCallToolCalls).toHaveLength(1);
      expect(functionCallToolCalls[0].function.name).toBe('mock_tool');
      
      // Test content with JSON format
      const contentMessage = {
        role: 'assistant',
        content: 'I need to use a tool\n```json\n{"name":"mock_tool","arguments":{"param":"test"}}\n```'
      };
      
      const contentToolCalls = agentAny.extractToolCalls(contentMessage);
      expect(contentToolCalls).toHaveLength(1);
      expect(contentToolCalls[0].function.name).toBe('mock_tool');
    });
  });

  describe('system prompt management', () => {
    it('should update system prompt with tool definitions', () => {
      // Test the private updateSystemPromptWithTools method
      const agentAny = agent as any;
      agentAny.updateSystemPromptWithTools();
      
      // Check if the first message is updated
      const systemMessage = agentAny.state.messages[0];
      expect(systemMessage.role).toBe('system');
      expect(systemMessage.content).toContain('You are a test assistant');
      expect(systemMessage.content).toContain('mock_tool');
      expect(systemMessage.content).toContain('IMPORTANT INSTRUCTIONS FOR USING TOOLS');
    });
  });

  describe('reset', () => {
    it('should reset the agent state', async () => {
      // First, add some messages to the state
      await agent.processInput({ message: 'Hello' });
      
      // Then reset
      agent.reset();
      
      // Check that the conversation history only contains the system message
      const history = agent.getConversationHistory();
      expect(history).toHaveLength(1);
      expect(history[0].role).toBe('system');
    });
  });
});
