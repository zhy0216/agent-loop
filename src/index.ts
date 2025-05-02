import { Agent } from './agent';
import { ToolRegistry } from './tools';
import { WeatherTool, CalculatorTool, SearchTool } from './tools';
import { env } from './config/env';
import readline from 'readline';
import { AgentEvent } from './agent/types';

// Create default system prompt
const DEFAULT_SYSTEM_PROMPT = `You are a helpful AI assistant that can use tools to accomplish tasks. 
You have access to the following tools:
- Weather information
- Calculator for mathematical operations
- Web search for finding information

Always use the available tools when appropriate to complete user tasks.
Be concise and helpful in your responses.`;

// Create tool registry and register tools
const toolRegistry = new ToolRegistry();
toolRegistry.registerTools([
  new WeatherTool(),
  new CalculatorTool(),
  new SearchTool()
]);

// Create the agent with configuration from .env
const agent = new Agent(
  {
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
    model: env.OPENROUTER_MODEL,
    temperature: env.TEMPERATURE,
    maxTokens: env.MAX_TOKENS
  },
  toolRegistry
);

// Subscribe to agent events
agent.on(AgentEvent.THINKING, (_, message) => {
  console.log(`🤔 ${message}`);
});

agent.on(AgentEvent.TOOL_START, (_, data) => {
  console.log(`🛠️ Using tool: ${data.tool}`);
});

agent.on(AgentEvent.TOOL_END, (_, data) => {
  console.log(`✓ Tool ${data.tool} returned result`);
});

// Create command line interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * Main function to run the agent CLI
 */
async function main() {
  console.log('=== AI Agent CLI ===');
  console.log('Type your message to interact with the agent.');
  console.log('Type "exit" to quit the program.');
  console.log('');
  console.log(`Using model: ${env.OPENROUTER_MODEL}`);
  console.log('');

  await promptUser();
}

/**
 * Prompt the user for input
 */
async function promptUser() {
  rl.question('User: ', async (input) => {
    // Check if user wants to exit
    if (input.toLowerCase() === 'exit') {
      console.log('Goodbye!');
      rl.close();
      return;
    }

    try {
      // Process user input
      console.log('\nAgent is thinking...');
      const response = await agent.processInput({ message: input });

      // Display agent response
      console.log('\nAgent:', response.message);

      if (response.toolsUsed.length > 0) {
        console.log(`(Used tools: ${response.toolsUsed.join(', ')})`);
      }
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error));
    }

    console.log(''); // Empty line for readability
    promptUser(); // Prompt for next input
  });
}

// Run the main function
main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
