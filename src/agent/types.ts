import { Message, Tool } from '../llm/types';

/**
 * Agent state to maintain conversation history and context
 */
export interface AgentState {
  messages: Message[];
  toolCalls: Array<{
    id: string;
    name: string;
    args: any;
    response?: any;
  }>;
}

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
 * User input for the agent
 */
export interface UserInput {
  message: string;
  attachments?: string[];
}

/**
 * Agent response to the user
 */
export interface AgentResponse {
  message: string;
  toolsUsed: string[];
  thinking?: string;
}

/**
 * Agent events that can be subscribed to
 */
export enum AgentEvent {
  THINKING = 'thinking',
  TOOL_START = 'tool_start',
  TOOL_END = 'tool_end',
  RESPONSE = 'response',
  ERROR = 'error'
}

/**
 * Listener for agent events
 */
export type AgentEventListener = (event: AgentEvent, data: any) => void;
