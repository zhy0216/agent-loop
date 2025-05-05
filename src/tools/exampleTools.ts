import { z } from 'zod';
import { createTool } from './index';

/**
 * Example calculator tool that can perform basic arithmetic
 */
export const calculatorTool = createTool({
  name: 'calculator',
  description: 'Perform arithmetic calculations',
  schema: z.object({
    expression: z.string().describe('The arithmetic expression to evaluate (e.g., "2 + 2")')
  }),
  execute: async ({ expression }) => {
    try {
      // Simple arithmetic evaluation using eval
      // NOTE: This is for demonstration purposes only
      // In production, use a proper math library to avoid security issues
      const result = eval(expression);
      return { result };
    } catch (error) {
      throw new Error(`Error evaluating expression: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
  usageExample: `To calculate 237 * 15, I'll use the calculator tool.`
});

/**
 * Example weather tool that returns fake weather data
 */
export const weatherTool = createTool({
  name: 'get_weather',
  description: 'Get weather information for a location',
  schema: z.object({
    location: z.string().describe('The city and state, e.g. San Francisco, CA'),
    unit: z.enum(['celsius', 'fahrenheit']).optional().describe('The unit of temperature to use. Defaults to fahrenheit.')
  }),
  execute: async ({ location, unit = 'fahrenheit' }) => {
    // This is a mock implementation - in a real app, this would call a weather API
    const mockWeatherData = {
      location,
      temperature: unit === 'celsius' ? 22 : 72,
      unit,
      condition: 'sunny',
      humidity: 45,
      windSpeed: 10
    };
    
    return mockWeatherData;
  },
  usageExample: `To check the weather in New York, I'll use the get_weather tool.`
});

/**
 * Example web search tool that returns fake search results
 */
export const searchTool = createTool({
  name: 'web_search',
  description: 'Search the web for information',
  schema: z.object({
    query: z.string().describe('The search query')
  }),
  execute: async ({ query }) => {
    // This is a mock implementation - in a real app, this would call a search API
    const results = [
      {
        title: `Results for ${query} - Page 1`,
        url: `https://example.com/search?q=${encodeURIComponent(query)}`,
        snippet: `This is an example search result for "${query}". In a real implementation, this would contain actual search results.`
      },
      {
        title: `Results for ${query} - Page 2`,
        url: `https://example.com/search?q=${encodeURIComponent(query)}&page=2`,
        snippet: `Another example search result for "${query}". This demonstrates returning multiple results from a single search.`
      }
    ];
    
    return { results };
  },
  usageExample: `Let me search for the latest information about that using the web_search tool.`
});
