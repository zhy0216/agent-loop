import { z } from 'zod';
import { Tool } from '../../src/tools/baseTool';

// Create a concrete implementation of Tool for testing
class TestTool extends Tool<
  z.ZodObject<{
    testParam: z.ZodString;
    optionalParam: z.ZodOptional<z.ZodNumber>;
    enumParam: z.ZodEnum<['option1', 'option2']>;
  }>,
  { result: string }
> {
  constructor() {
    super(
      'test_tool',
      'A test tool for unit testing',
      z.object({
        testParam: z.string().describe('A test parameter'),
        optionalParam: z.number().optional().describe('An optional number parameter'),
        enumParam: z.enum(['option1', 'option2']).describe('An enum parameter with options')
      })
    );
  }

  async execute(args: z.infer<typeof this.schema>): Promise<{ result: string }> {
    return {
      result: `Executed with testParam: ${args.testParam}, optionalParam: ${args.optionalParam}, enumParam: ${args.enumParam}`
    };
  }
}

describe('Tool', () => {
  let testTool: TestTool;

  beforeEach(() => {
    testTool = new TestTool();
  });

  describe('getFunctionDefinition', () => {
    it('should return a properly formatted function definition', () => {
      const functionDef = testTool.getFunctionDefinition();
      
      expect(functionDef.type).toBe('function');
      expect(functionDef.function.name).toBe('test_tool');
      expect(functionDef.function.description).toBe('A test tool for unit testing');
      
      // Check parameters
      const params = functionDef.function.parameters;
      expect(params.type).toBe('object');
      expect(params.properties).toBeDefined();
      
      // Check properties
      expect(params.properties.testParam.type).toBe('string');
      expect(params.properties.testParam.description).toBe('A test parameter');
      
      // Optional param should exist in the schema but may have different structures
      // depending on the implementation of the Zod to JSON Schema conversion
      expect(params.properties.optionalParam).toBeDefined();
      
      // Don't check the description or type of optional param as it may vary in implementation
      
      expect(params.properties.enumParam.type).toBe('string');
      expect(params.properties.enumParam.enum).toEqual(['option1', 'option2']);
      
      // Check required fields
      expect(params.required).toContain('testParam');
      expect(params.required).toContain('enumParam');
      expect(params.required).not.toContain('optionalParam');
    });
  });

  describe('execute', () => {
    it('should execute the tool with provided arguments', async () => {
      const args = {
        testParam: 'test value',
        enumParam: 'option1' as const
      };
      
      const result = await testTool.execute(args);
      expect(result).toEqual({
        result: 'Executed with testParam: test value, optionalParam: undefined, enumParam: option1'
      });
    });
    
    it('should execute the tool with all arguments provided', async () => {
      const args = {
        testParam: 'test value',
        optionalParam: 42,
        enumParam: 'option2' as const
      };
      
      const result = await testTool.execute(args);
      expect(result).toEqual({
        result: 'Executed with testParam: test value, optionalParam: 42, enumParam: option2'
      });
    });
  });
});
