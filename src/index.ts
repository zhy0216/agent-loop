import { OpenRouterClient } from './llm/openrouter';
import { Agent } from './agent';
import { weatherTool, calculatorTool, searchTool } from './tools/exampleTools';
import { env } from './config/env';
import readline from 'readline';
import { AgentEvent } from './agent/types';
import { ToolManager } from './tools/toolManager';

// Setup agent event handling
const handleAgentEvent = (event: string, data: any) => {
  if (event === AgentEvent.THINKING) {
    console.log(`\n🔍 ${data}`);
  }
};

// Create the agent with configuration from .env
const agent = new Agent(
  {
    model: env.OPENROUTER_MODEL,
    temperature: env.TEMPERATURE,
    maxTokens: env.MAX_TOKENS
  },
  [weatherTool, calculatorTool, searchTool]
);

// Subscribe to agent events
agent.on(AgentEvent.THINKING, handleAgentEvent);

// Create CLI interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Function to run the agent
const runAgent = async () => {
  try {
    console.log('🤖 AI Agent started. Type "exit" to quit.\n');
    promptUser();
  } catch (error) {
    console.error('Error starting agent:', error);
    rl.close();
    process.exit(1);
  }
};

// Prompt the user for input
const promptUser = () => {
  rl.question('You: ', async (input) => {
    if (input.toLowerCase() === 'exit') {
      console.log('\nGoodbye! 👋');
      rl.close();
      return;
    }
    
    try {
      console.log('\n⏳ Processing...');
      const response = await agent.processInput({ message: input });
      console.log(`\n🤖 AI: ${response.message}`);
      
      if (response.toolsUsed.length > 0) {
        console.log(`\n🛠️  Tools used: ${response.toolsUsed.join(', ')}`);
      }
    } catch (error) {
      console.error('\n❌ Error:', error);
    }
    
    promptUser();
  });
};

// If this file is run directly, start the agent CLI
if (require.main === module) {
  runAgent();
}

// For module exports
export {
  agent,
  Agent,
  OpenRouterClient,
  ToolManager
};
