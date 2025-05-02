import OpenAI from 'openai';
import { env } from '../config/env';
import { ChatCompletionOptions, ChatCompletionResponse } from './types';

/**
 * OpenRouter API client for interacting with various LLMs using OpenAI's SDK
 */
export class OpenRouterClient {
  private client: OpenAI;
  private defaultModel: string;

  constructor(apiKey = env.OPENROUTER_API_KEY, defaultModel = env.OPENROUTER_MODEL) {
    this.client = new OpenAI({
      apiKey: apiKey,
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer': 'https://github.com/ai-agent-project', // Replace with your site URL
        'X-Title': 'AI Agent Project' // Replace with your project name
      }
    });
    this.defaultModel = defaultModel;
  }

  /**
   * Create a chat completion using OpenRouter API
   */
  async createChatCompletion(options: ChatCompletionOptions): Promise<ChatCompletionResponse> {
    try {
      const response = await this.client.chat.completions.create({
        model: options.model || this.defaultModel,
        messages: options.messages,
        tools: options.tools,
        temperature: options.temperature,
        max_tokens: options.max_tokens,
        stream: options.stream || false
      });
      
      return response as unknown as ChatCompletionResponse;
    } catch (error) {
      console.error('OpenRouter API Error:', error);
      throw error;
    }
  }

  /**
   * Stream chat completion responses from OpenRouter API
   */
  async streamChatCompletion(options: ChatCompletionOptions, callback: (chunk: any) => void): Promise<void> {
    try {
      const stream = await this.client.chat.completions.create({
        model: options.model || this.defaultModel,
        messages: options.messages,
        tools: options.tools,
        temperature: options.temperature,
        max_tokens: options.max_tokens,
        stream: true
      });

      for await (const chunk of stream) {
        callback(chunk);
      }
    } catch (error) {
      console.error('OpenRouter API Streaming Error:', error);
      throw error;
    }
  }
}
