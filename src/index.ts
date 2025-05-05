import { Agent } from './agent';
import { ToolRegistry } from './tools';
import { weatherTool, calculatorTool, searchTool } from './tools';
import { env } from './config/env';
import readline from 'readline';
import { AgentEvent } from './agent/types';

// Create default system prompt
const DEFAULT_SYSTEM_PROMPT = `You are a helpful AI assistant that can use tools to accomplish tasks. 

You have access to the following tools:
- Weather information: Use this to get weather for a specific location (use get_weather)
- Calculator: Use this for mathematical calculations (use calculator)
- Web search: Use this to find information on the internet (use web_search)

WHEN AND HOW TO USE TOOLS:
1. If a user asks about weather, ALWAYS use the get_weather tool
2. If a user asks for calculations, ALWAYS use the calculator tool
3. If a user asks for information you're not 100% certain about, ALWAYS use the web_search tool

TOOL USAGE FORMAT:
- To use a tool, you must specify the tool name and provide the required parameters
- NEVER invent tool names or parameters that don't exist
- Wait for tool results before providing a final response

Examples:
- For weather: "To check the weather in New York, I'll use the get_weather tool."
- For calculations: "To calculate 237 * 15, I'll use the calculator tool."
- For search: "Let me search for the latest information about that."

Be concise and helpful in your responses. Always prefer using tools over making assumptions.`;

// Create tool registry and register tools
const toolRegistry = new ToolRegistry();
toolRegistry.registerTools([
  weatherTool,
  calculatorTool,
  searchTool
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
