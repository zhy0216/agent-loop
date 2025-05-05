import { calculatorTool, weatherTool, searchTool } from '../../src/tools/exampleTools';

// Mocking console.log to avoid cluttering test output
jest.spyOn(console, 'log').mockImplementation(() => {});

describe('Example Tools', () => {
  describe('weatherTool', () => {
    it('should have correct name and description', () => {
      expect(weatherTool.name).toBe('get_weather');
      expect(weatherTool.description).toBe('Get weather information for a location');
    });

    it('should return mock weather data', async () => {
      const result = await weatherTool.execute({
        location: 'New York',
        unit: 'celsius'
      });

      expect(result).toHaveProperty('temperature', 22);
      expect(result).toHaveProperty('condition', 'sunny');
    });

    it('should default to fahrenheit if unit not specified', async () => {
      const result = await weatherTool.execute({
        location: 'New York'
      });

      expect(result).toHaveProperty('temperature', 72);
      expect(result).toHaveProperty('unit', 'fahrenheit');
    });

    it('should include the location in the result', async () => {
      const location = 'San Francisco, CA';
      const result = await weatherTool.execute({ location });

      expect(result).toHaveProperty('location', location);
    });

    it('should have a usage example', () => {
      const example = weatherTool.generateUsageExample();
      expect(example).toBe('To check the weather in New York, I\'ll use the get_weather tool.');
    });
  });

  describe('calculatorTool', () => {
    it('should have correct name and description', () => {
      expect(calculatorTool.name).toBe('calculator');
      expect(calculatorTool.description).toBe('Perform arithmetic calculations');
    });

    it('should correctly evaluate basic arithmetic expressions', async () => {
      const result = await calculatorTool.execute({
        expression: '2 + 2'
      });

      expect(result).toEqual({ result: 4 });
    });

    it('should correctly evaluate more complex expressions', async () => {
      const result = await calculatorTool.execute({
        expression: '(10 * 5) / 2 + 15'
      });

      expect(result).toEqual({ result: 40 });
    });

    it('should handle string results without throwing an error', async () => {
      const result = await calculatorTool.execute({
        expression: '"string result"'
      });

      expect(result).toEqual({ result: 'string result' });
    });

    it('should handle errors in expressions', async () => {
      await expect(calculatorTool.execute({
        expression: 'undefined_variable + 5'
      })).rejects.toThrow();
    });

    it('should have a usage example', () => {
      const example = calculatorTool.generateUsageExample();
      expect(example).toBe('To calculate 237 * 15, I\'ll use the calculator tool.');
    });
  });

  describe('searchTool', () => {
    it('should have correct name and description', () => {
      expect(searchTool.name).toBe('web_search');
      expect(searchTool.description).toBe('Search the web for information');
    });

    it('should return mock search results', async () => {
      const query = 'test query';
      const result = await searchTool.execute({ query });

      expect(result).toHaveProperty('results');
      expect(Array.isArray(result.results)).toBe(true);
      expect(result.results.length).toBeGreaterThan(0);
    });

    it('should include the query in the search results', async () => {
      const query = 'unique test query';
      const result = await searchTool.execute({ query });

      const hasQuery = result.results.some(item => 
        item.title.includes(query) || item.snippet.includes(query)
      );
      expect(hasQuery).toBe(true);
    });

    it('should have a usage example', () => {
      const example = searchTool.generateUsageExample();
      expect(example).toBe('Let me search for the latest information about that using the web_search tool.');
    });
  });
});
