import { Agent } from '../../src/agent';
import { ToolManager } from '../../src/tools/toolManager';
import { Tool } from '../../src/tools/baseTool';
import { AgentEvent } from '../../src/agent/types';
import { z } from 'zod';
import * as openaiModule from '../../src/llm/openai';

// Mock the OpenAI module
jest.mock('../../src/llm/openai', () => {
  return {
    createChatCompletion: jest.fn(),
    openai: {
      chat: {
        completions: {
          create: jest.fn()
        }
      }
    }
  };
});

// Helper to create test tools
class MockTool extends Tool<z.ZodObject<{
  param: z.ZodString;
}>> {
  constructor(name: string) {
    super(
      name,
      'A mock tool for testing',
      z.object({
        param: z.string().describe('Test parameter')
      })
    );
  }

  async execute(args: { param: string }): Promise<any> {
    return { result: args.param };
  }
}

describe('Agent', () => {
  let agent: Agent;
  let mockTool: MockTool;
  let mockCreateChatCompletion: jest.Mock;

  beforeEach(() => {
    // Create mocks
    mockCreateChatCompletion = openaiModule.createChatCompletion as jest.Mock;
    mockCreateChatCompletion.mockImplementation(async (options) => {
      return {
        id: 'test-id',
        model: 'test-model',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'This is a test response'
            },
            finish_reason: 'stop'
          }
        ],
        usage: {
          prompt_tokens: 100,
          completion_tokens: 50,
          total_tokens: 150
        }
      };
    });

    // Initialize test objects
    mockTool = new MockTool('mock_tool');

    agent = new Agent(
      {
        systemPrompt: 'You are a test assistant',
        temperature: 0.5,
        maxTokens: 1000
      },
      [mockTool]
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should initialize with a system prompt', () => {
    const history = agent.getConversationHistory();
    expect(history.length).toBeGreaterThan(0);
    expect(history[0].role).toBe('system');
    expect(typeof history[0].content).toBe('string');
  });

  test('should process user input', async () => {
    const response = await agent.processInput({ message: 'Hello' });
    expect(response.message).toBe('This is a test response');
    expect(response.toolsUsed).toEqual([]);
    
    // Verify chat completion was called
    expect(mockCreateChatCompletion).toHaveBeenCalledTimes(1);
  });

  test('should update system prompt with tool definitions', () => {
    const history = agent.getConversationHistory();
    
    // Check that tool information is included in the system prompt
    expect(history[0].content).toContain('mock_tool');
    expect(history[0].content).toContain('A mock tool for testing');
  });

  test('should register additional tools', () => {
    const newTool = new MockTool('new_tool');
    agent.registerTools([newTool]);
    
    const history = agent.getConversationHistory();
    expect(history[0].content).toContain('new_tool');
    expect(history[0].content).toContain('A mock tool for testing');
  });

  test('should process tool calls', async () => {
    // Mock for tool call response
    mockCreateChatCompletion.mockImplementationOnce(async () => {
      return {
        id: 'test-tool-call',
        model: 'test-model',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'I need to use a tool',
              tool_calls: [
                {
                  id: 'call_1',
                  type: 'function',
                  function: {
                    name: 'mock_tool',
                    arguments: JSON.stringify({ param: 'test value' })
                  }
                }
              ]
            },
            finish_reason: 'tool_calls'
          }
        ],
        usage: {
          prompt_tokens: 150,
          completion_tokens: 75,
          total_tokens: 225
        }
      };
    });
    
    // Mock for final response after tool execution
    mockCreateChatCompletion.mockImplementationOnce(async () => {
      return {
        id: 'test-final-response',
        model: 'test-model',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'Tool execution complete'
            },
            finish_reason: 'stop'
          }
        ],
        usage: {
          prompt_tokens: 200,
          completion_tokens: 100,
          total_tokens: 300
        }
      };
    });
    
    const response = await agent.processInput({ message: 'Use mock_tool' });
    
    // Check that the agent used the tool and returned the final response
    expect(response.toolsUsed).toEqual(['mock_tool']);
    expect(response.message).toBe('Tool execution complete');
    
    // Verify LLM was called twice (initial + after tool)
    expect(mockCreateChatCompletion).toHaveBeenCalledTimes(2);
  });

  test('should handle events', () => {
    const mockListener = jest.fn();
    agent.on(AgentEvent.THINKING, mockListener);
    
    // Manually trigger the event
    (agent as any).emit(AgentEvent.THINKING, 'Processing...');
    
    expect(mockListener).toHaveBeenCalledWith(AgentEvent.THINKING, 'Processing...');
  });

  test('should reset state', () => {
    // Add some messages
    agent.processInput({ message: 'Test message' });
    
    // Reset the state
    agent.reset();
    
    // Check that the conversation has been reset to just the system message
    const history = agent.getConversationHistory();
    expect(history.length).toBe(1);
    expect(history[0].role).toBe('system');
  });
});
