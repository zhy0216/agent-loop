import OpenAI from 'openai';
import { env } from '../config/env';
import { ChatCompletionOptions, ChatCompletionResponse } from './types';

/**
 * OpenRouter API client for interacting with various LLMs using OpenAI's SDK
 */
export class OpenRouterClient {
  private client: OpenAI;
  private defaultModel: string;
  private isDevMode: boolean;

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
    this.isDevMode = env.DEV === 'true';
  }

  /**
   * Create a chat completion using OpenRouter API
   */
  async createChatCompletion(options: ChatCompletionOptions): Promise<ChatCompletionResponse> {
    try {
      if (this.isDevMode) {
        console.log('\n[DEV] OpenRouter Request:', JSON.stringify({
          model: options.model || this.defaultModel,
          messages: options.messages,
          tools: options.tools ? `${options.tools.length} tools provided` : 'no tools',
          temperature: options.temperature,
          max_tokens: options.max_tokens
        }, null, 2));
      }

      const response = await this.client.chat.completions.create({
        model: options.model || this.defaultModel,
        messages: options.messages,
        tools: options.tools,
        temperature: options.temperature,
        max_tokens: options.max_tokens,
        stream: options.stream || false
      });
      
      if (this.isDevMode) {
        console.log('\n[DEV] OpenRouter Response:', JSON.stringify(response, null, 2));
      }
      
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
      if (this.isDevMode) {
        console.log('\n[DEV] OpenRouter Stream Request:', JSON.stringify({
          model: options.model || this.defaultModel,
          messages: options.messages,
          tools: options.tools ? `${options.tools.length} tools provided` : 'no tools',
          temperature: options.temperature,
          max_tokens: options.max_tokens,
          stream: true
        }, null, 2));
      }

      const stream = await this.client.chat.completions.create({
        model: options.model || this.defaultModel,
        messages: options.messages,
        tools: options.tools,
        temperature: options.temperature,
        max_tokens: options.max_tokens,
        stream: true
      });

      for await (const chunk of stream) {
        if (this.isDevMode) {
          console.log('\n[DEV] OpenRouter Stream Chunk:', JSON.stringify(chunk, null, 2));
        }
        callback(chunk);
      }
    } catch (error) {
      console.error('OpenRouter API Streaming Error:', error);
      throw error;
    }
  }
}
