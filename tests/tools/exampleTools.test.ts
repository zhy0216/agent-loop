import { weatherTool, calculatorTool, searchTool } from '../../src/tools/exampleTools';

// Mocking console.log to avoid cluttering test output
jest.spyOn(console, 'log').mockImplementation(() => {});

describe('Example Tools', () => {
  describe('weatherTool', () => {
    it('should have correct name and description', () => {
      expect(weatherTool.name).toBe('get_weather');
      expect(weatherTool.description).toBe('Get the current weather for a given location');
    });

    it('should return mock weather data in celsius', async () => {
      const result = await weatherTool.execute({
        location: 'London, UK',
        unit: 'celsius'
      });

      expect(result).toEqual({
        temperature: 22,
        conditions: 'Sunny'
      });
    });

    it('should return mock weather data in fahrenheit', async () => {
      const result = await weatherTool.execute({
        location: 'New York, USA',
        unit: 'fahrenheit'
      });

      expect(result).toEqual({
        temperature: 72,
        conditions: 'Sunny'
      });
    });

    it('should have a properly formatted function definition', () => {
      const def = weatherTool.getFunctionDefinition();

      expect(def.type).toBe('function');
      expect(def.function.name).toBe('get_weather');
      expect(def.function.parameters.properties.location.type).toBe('string');
      expect(def.function.parameters.properties.unit.enum).toEqual(['celsius', 'fahrenheit']);
    });
  });

  describe('calculatorTool', () => {
    it('should have correct name and description', () => {
      expect(calculatorTool.name).toBe('calculator');
      expect(calculatorTool.description).toBe('Perform basic arithmetic calculations');
    });

    it('should correctly evaluate basic arithmetic expressions', async () => {
      const result = await calculatorTool.execute({
        expression: '2 + 2'
      });

      expect(result).toEqual({
        result: 4
      });
    });

    it('should correctly evaluate more complex expressions', async () => {
      const result = await calculatorTool.execute({
        expression: '(10 * 5) + (20 / 4)'
      });

      expect(result).toEqual({
        result: 55
      });
    });

    it('should throw an error for invalid expressions', async () => {
      await expect(calculatorTool.execute({
        expression: 'invalid expression'
      })).rejects.toThrow();
    });

    it('should throw an error for non-numeric results', async () => {
      await expect(calculatorTool.execute({
        expression: '"string result"'
      })).rejects.toThrow('Expression did not evaluate to a number');
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

      expect(result.results).toHaveLength(2);
      expect(result.results[0].title).toContain(query);
      expect(result.results[0].snippet).toContain(query);
      expect(result.results[0].url).toBeTruthy();
    });

    it('should have a properly formatted function definition', () => {
      const def = searchTool.getFunctionDefinition();

      expect(def.type).toBe('function');
      expect(def.function.name).toBe('web_search');
      expect(def.function.parameters.properties.query.type).toBe('string');
    });
  });
});
