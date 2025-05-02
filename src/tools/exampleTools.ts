import { z } from 'zod';
import { Tool } from './baseTool';

/**
 * Weather Tool - Example tool to fetch weather information
 */
export class WeatherTool extends Tool<
  z.ZodObject<{
    location: z.ZodString;
    unit: z.ZodEnum<['celsius', 'fahrenheit']>;
  }>,
  { temperature: number; conditions: string }
> {
  constructor() {
    super(
      'get_weather',
      'Get the current weather for a given location',
      z.object({
        location: z.string().describe('The city and country to get weather for'),
        unit: z.enum(['celsius', 'fahrenheit']).describe('Temperature unit')
      })
    );
  }
  
  async execute(args: z.infer<typeof this.schema>): Promise<{ temperature: number; conditions: string }> {
    // This is a mock implementation - in a real application, this would call a weather API
    console.log(`Fetching weather for ${args.location} in ${args.unit}`);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Return mock data
    return {
      temperature: args.unit === 'celsius' ? 22 : 72,
      conditions: 'Sunny'
    };
  }
}

/**
 * Calculator Tool - Example tool for performing math calculations
 */
export class CalculatorTool extends Tool<
  z.ZodObject<{
    expression: z.ZodString;
  }>,
  { result: number }
> {
  constructor() {
    super(
      'calculator',
      'Perform basic arithmetic calculations',
      z.object({
        expression: z.string().describe('Math expression to evaluate (e.g., "2 + 2")')
      })
    );
  }
  
  async execute(args: z.infer<typeof this.schema>): Promise<{ result: number }> {
    try {
      // Note: eval is used here for simplicity in this example
      // In production, you should use a safer alternative like math.js
      // eslint-disable-next-line no-eval
      const result = eval(args.expression);
      
      if (typeof result !== 'number') {
        throw new Error('Expression did not evaluate to a number');
      }
      
      return { result };
    } catch (error) {
      throw new Error(`Failed to evaluate expression: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

/**
 * Search Tool - Example tool for web search
 */
export class SearchTool extends Tool<
  z.ZodObject<{
    query: z.ZodString;
  }>,
  { results: Array<{ title: string; snippet: string; url: string }> }
> {
  constructor() {
    super(
      'web_search',
      'Search the web for information',
      z.object({
        query: z.string().describe('Search query')
      })
    );
  }
  
  async execute(args: z.infer<typeof this.schema>): Promise<{ results: Array<{ title: string; snippet: string; url: string }> }> {
    // This is a mock implementation - in a real application, this would call a search API
    console.log(`Searching for: ${args.query}`);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Return mock data
    return {
      results: [
        {
          title: `Result for "${args.query}" - Example Site`,
          snippet: `This is an example search result for the query "${args.query}". In a real implementation, this would contain actual search results.`,
          url: 'https://example.com/result1'
        },
        {
          title: `More information about "${args.query}"`,
          snippet: 'Another example search result with information related to the query.',
          url: 'https://example.com/result2'
        }
      ]
    };
  }
}
