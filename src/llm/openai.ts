import OpenAI from 'openai';
import { env } from '../config/env';

/**
 * Create and export a configured OpenAI client
 * Uses environment variables for configuration
 */
export const openai = new OpenAI({
  apiKey: env.OPENROUTER_API_KEY,
  baseURL: env.OPENAI_BASE_URL,
  defaultHeaders: {
    'HTTP-Referer': 'https://github.com/ai-agent-project',
    'X-Title': 'AI Agent Project'
  }
});

// Re-export types from OpenAI SDK for use in the application
export {
  ChatCompletionMessage,
  ChatCompletion,
  ChatCompletionCreateParams,
  ChatCompletionMessageParam,
  ChatCompletionTool
} from 'openai/resources/chat/completions';

export {
  FunctionDefinition,
  FunctionParameters
} from 'openai/resources';

/**
 * Create a chat completion with logging in dev mode
 */
export async function createChatCompletion(params: OpenAI.ChatCompletionCreateParams) {
  const isDevMode = env.DEV === 'true';
  const model = params.model || env.OPENROUTER_MODEL;
  
  if (isDevMode) {
    console.log('\n[DEV] OpenAI Request:', JSON.stringify({
      model,
      messages: params.messages,
      tools: params.tools ? `${params.tools.length} tools provided` : 'no tools',
      temperature: params.temperature,
      max_tokens: params.max_tokens
    }, null, 2));
  }

  try {
    // Create a new params object without the model property to avoid duplication
    const { model: _, ...otherParams } = params;
    
    const response = await openai.chat.completions.create({
      model,
      ...otherParams
    });

    if (isDevMode && 'id' in response) {
      const chatCompletion = response as OpenAI.ChatCompletion;
      console.log('\n[DEV] OpenAI Response:', JSON.stringify({
        id: chatCompletion.id,
        model: chatCompletion.model,
        choices: chatCompletion.choices.map(choice => ({
          index: choice.index,
          finish_reason: choice.finish_reason,
          message: { 
            role: choice.message.role,
            content: choice.message.content,
            tool_calls: choice.message.tool_calls ? 
              `${choice.message.tool_calls.length} tool calls` : undefined
          }
        }))
      }, null, 2));
    }

    return response;
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    throw error;
  }
}
