import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

/**
 * Agent event types
 */
export enum AgentEvent {
  THINKING = 'thinking',
  TOOL_START = 'tool_start',
  TOOL_END = 'tool_end',
  RESPONSE = 'response',
  ERROR = 'error'
}

/**
 * Agent event listener function
 */
export type AgentEventListener = (event: AgentEvent, data: any) => void;

/**
 * Configuration options for the agent
 */
export interface AgentConfig {
  systemPrompt?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Input from a user to the agent
 */
export interface UserInput {
  message: string;
}

/**
 * Response from the agent to a user
 */
export interface AgentResponse {
  message: string;
  toolsUsed: string[];
}

/**
 * Tool call record for tracking execution and results
 */
export interface ToolCallRecord {
  id: string;
  name: string;
  args: any;
  response: any;
}

/**
 * Internal state of the agent
 */
export interface AgentState {
  messages: ChatCompletionMessageParam[];
  toolCalls: ToolCallRecord[];
}
