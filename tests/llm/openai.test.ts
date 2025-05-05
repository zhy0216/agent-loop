import * as openaiModule from '../../src/llm/openai';
import { env } from '../../src/config/env';
import OpenAI from 'openai';
import { ChatCompletionCreateParams } from 'openai/resources/chat/completions';

// Mock the OpenAI client and environment
jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn(() => ({
      chat: {
        completions: {
          create: jest.fn()
        }
      }
    }))
  };
});

jest.mock('../../src/config/env', () => ({
  env: {
    OPENROUTER_API_KEY: 'test-api-key',
    OPENROUTER_MODEL: 'test-model',
    MAX_TOKENS: 100,
    TEMPERATURE: 0.5,
    DEV: 'false'
  }
}));

describe('OpenAI Client', () => {
  let mockCreate: jest.Mock;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup the mock for OpenAI completions.create
    mockCreate = openaiModule.openai.chat.completions.create as jest.Mock;
    mockCreate.mockResolvedValue({
      id: 'test-completion-id',
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
        prompt_tokens: 50,
        completion_tokens: 25,
        total_tokens: 75
      }
    });
  });

  describe('createChatCompletion', () => {
    it('should create a chat completion with default parameters', async () => {
      const params: ChatCompletionCreateParams = {
        model: 'test-model',
        messages: [
          { role: 'user', content: 'Hello' }
        ]
      };

      const result = await openaiModule.createChatCompletion(params);
      const chatCompletion = result as OpenAI.ChatCompletion;

      expect(mockCreate).toHaveBeenCalledWith({
        model: env.OPENROUTER_MODEL,
        messages: params.messages
      });
      
      expect(chatCompletion).toHaveProperty('choices');
      expect(chatCompletion.choices[0].message.content).toBe('This is a test response');
    });

    it('should create a chat completion with custom parameters', async () => {
      const params: ChatCompletionCreateParams = {
        model: 'custom-model',
        messages: [
          { role: 'user', content: 'Hello' }
        ],
        temperature: 0.7,
        max_tokens: 200,
        tools: [
          {
            type: 'function',
            function: {
              name: 'test_function',
              description: 'A test function',
              parameters: {
                type: 'object',
                properties: {
                  param: { type: 'string' }
                }
              }
            }
          }
        ]
      };

      await openaiModule.createChatCompletion(params);

      expect(mockCreate).toHaveBeenCalledWith({
        model: 'custom-model',
        messages: params.messages,
        temperature: 0.7,
        max_tokens: 200,
        tools: params.tools
      });
    });

    it('should log request and response in dev mode', async () => {
      // Override DEV to be true for this test
      const originalDev = env.DEV;
      (env as any).DEV = 'true';
      
      // Spy on console.log
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const params: ChatCompletionCreateParams = {
        model: 'test-model',
        messages: [
          { role: 'user', content: 'Hello' }
        ]
      };

      await openaiModule.createChatCompletion(params);
      
      // Verify logs were created
      expect(consoleSpy).toHaveBeenCalledTimes(2);
      expect(consoleSpy.mock.calls[0][0]).toContain('[DEV] OpenAI Request:');
      expect(consoleSpy.mock.calls[1][0]).toContain('[DEV] OpenAI Response:');
      
      // Restore original env and console
      (env as any).DEV = originalDev;
      consoleSpy.mockRestore();
    });

    it('should handle errors from the OpenAI API', async () => {
      // Setup mock to throw an error
      mockCreate.mockRejectedValueOnce(new Error('API Error'));
      
      // Spy on console.error
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const params: ChatCompletionCreateParams = {
        model: 'test-model',
        messages: [
          { role: 'user', content: 'Hello' }
        ]
      };

      await expect(openaiModule.createChatCompletion(params)).rejects.toThrow('API Error');
      
      expect(consoleSpy).toHaveBeenCalledWith('Error calling OpenAI API:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });
});
