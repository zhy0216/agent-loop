import { ToolManager } from '../../src/tools/toolManager';
import { Tool } from '../../src/tools/baseTool';
import { z } from 'zod';

// Create a mock tool implementation for testing
class MockTool extends Tool<z.ZodObject<{
  testParam: z.ZodString;
}>, string> {
  constructor(name: string = 'mock_tool') {
    super(
      name,
      'A mock tool for testing',
      z.object({
        testParam: z.string().describe('A test parameter')
      })
    );
  }

  async execute(args: { testParam: string }): Promise<string> {
    return `Mock result with ${args.testParam}`;
  }
}

describe('ToolManager', () => {
  let toolManager: ToolManager;
  let mockTool: MockTool;

  beforeEach(() => {
    toolManager = new ToolManager();
    mockTool = new MockTool();
  });

  test('should register a tool', () => {
    toolManager.registerTool(mockTool);
    expect(toolManager.getTool('mock_tool')).toBe(mockTool);
  });

  test('should register multiple tools', () => {
    const anotherTool = new MockTool('another_tool');
    toolManager.registerTools([mockTool, anotherTool]);
    
    expect(toolManager.getTool('mock_tool')).toBe(mockTool);
    expect(toolManager.getTool('another_tool')).toBe(anotherTool);
  });

  test('should get all registered tools', () => {
    const anotherTool = new MockTool('another_tool');
    toolManager.registerTools([mockTool, anotherTool]);
    
    const allTools = toolManager.getAllTools();
    expect(allTools).toContain(mockTool);
    expect(allTools).toContain(anotherTool);
    expect(allTools.length).toBe(2);
  });

  test('should get function definitions for all tools', () => {
    toolManager.registerTool(mockTool);
    
    const definitions = toolManager.getFunctionDefinitions();
    expect(definitions.length).toBe(1);
    expect(definitions[0].function.name).toBe('mock_tool');
    expect(definitions[0].function.description).toBe('A mock tool for testing');
  });

  test('should execute a tool by name', async () => {
    toolManager.registerTool(mockTool);
    
    const result = await toolManager.executeTool('mock_tool', { testParam: 'test value' });
    expect(result).toBe('Mock result with test value');
  });

  test('should throw an error when executing a non-existent tool', async () => {
    await expect(toolManager.executeTool('non_existent_tool', {}))
      .rejects
      .toThrow('Tool "non_existent_tool" not found');
  });

  test('should throw an error when tool execution fails', async () => {
    const failingTool = new MockTool('failing_tool');
    failingTool.execute = jest.fn().mockRejectedValue(new Error('Tool execution failed'));
    
    toolManager.registerTool(failingTool);
    
    await expect(toolManager.executeTool('failing_tool', { testParam: 'test' }))
      .rejects
      .toThrow('Error executing tool "failing_tool": Tool execution failed');
  });
  
  test('should warn when registering a tool with an existing name', () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    
    toolManager.registerTool(mockTool);
    const duplicateTool = new MockTool(); // Same name as mockTool
    toolManager.registerTool(duplicateTool);
    
    expect(consoleSpy).toHaveBeenCalledWith('Tool with name "mock_tool" already exists. Overwriting.');
    
    consoleSpy.mockRestore();
  });

  test('should overwrite a tool when registering with the same name', () => {
    const originalTool = new MockTool();
    const replacementTool = new MockTool(); // Same name
    
    toolManager.registerTool(originalTool);
    toolManager.registerTool(replacementTool);
    
    expect(toolManager.getTool('mock_tool')).toBe(replacementTool);
  });
});
