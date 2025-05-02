import { BaseTool } from '../../src/tools/baseTool';
import { ToolRegistry } from '../../src/tools/toolRegistry';
import { z } from 'zod';

// Create mock tools for testing
class MockTool implements BaseTool {
  name: string;
  description: string;
  schema: z.ZodType;

  constructor(name: string) {
    this.name = name;
    this.description = `Mock tool ${name}`;
    this.schema = z.object({ param: z.string() });
  }

  async execute(args: any): Promise<any> {
    return { result: `Executed ${this.name} with ${args.param}` };
  }

  getFunctionDefinition() {
    return {
      type: 'function' as const,
      function: {
        name: this.name,
        description: this.description,
        parameters: {
          type: 'object',
          properties: {
            param: { type: 'string' }
          },
          required: ['param']
        }
      }
    };
  }
}

describe('ToolRegistry', () => {
  let registry: ToolRegistry;
  let mockTool1: MockTool;
  let mockTool2: MockTool;

  beforeEach(() => {
    registry = new ToolRegistry();
    mockTool1 = new MockTool('tool1');
    mockTool2 = new MockTool('tool2');
  });

  describe('registerTool', () => {
    it('should register a tool', () => {
      registry.registerTool(mockTool1);
      const tool = registry.getTool('tool1');
      
      expect(tool).toBe(mockTool1);
    });

    it('should throw an error when registering a tool with a duplicate name', () => {
      registry.registerTool(mockTool1);
      
      expect(() => {
        registry.registerTool(new MockTool('tool1'));
      }).toThrow('Tool with name "tool1" is already registered');
    });
  });

  describe('registerTools', () => {
    it('should register multiple tools', () => {
      registry.registerTools([mockTool1, mockTool2]);
      
      expect(registry.getTool('tool1')).toBe(mockTool1);
      expect(registry.getTool('tool2')).toBe(mockTool2);
    });
  });

  describe('getTool', () => {
    it('should return a registered tool by name', () => {
      registry.registerTool(mockTool1);
      
      expect(registry.getTool('tool1')).toBe(mockTool1);
    });

    it('should return undefined for an unregistered tool name', () => {
      expect(registry.getTool('nonexistent')).toBeUndefined();
    });
  });

  describe('getAllTools', () => {
    it('should return all registered tools', () => {
      registry.registerTools([mockTool1, mockTool2]);
      const tools = registry.getAllTools();
      
      expect(tools).toHaveLength(2);
      expect(tools).toContain(mockTool1);
      expect(tools).toContain(mockTool2);
    });

    it('should return an empty array when no tools are registered', () => {
      expect(registry.getAllTools()).toEqual([]);
    });
  });

  describe('getFunctionDefinitions', () => {
    it('should return function definitions for all tools', () => {
      registry.registerTools([mockTool1, mockTool2]);
      const definitions = registry.getFunctionDefinitions();
      
      expect(definitions).toHaveLength(2);
      expect(definitions[0].function.name).toBe('tool1');
      expect(definitions[1].function.name).toBe('tool2');
    });
  });

  describe('executeTool', () => {
    it('should execute a tool with provided arguments', async () => {
      registry.registerTool(mockTool1);
      
      const result = await registry.executeTool('tool1', { param: 'test_value' });
      expect(result).toEqual({ result: 'Executed tool1 with test_value' });
    });

    it('should throw an error for a non-existent tool', async () => {
      await expect(registry.executeTool('nonexistent', { param: 'test_value' }))
        .rejects.toThrow('Tool "nonexistent" not found');
    });

    it('should validate arguments against the tool schema', async () => {
      registry.registerTool(mockTool1);
      
      // Temporarily silence console.error to avoid test output clutter
      const originalConsoleError = console.error;
      console.error = jest.fn();
      
      try {
        // This should fail validation since 'param' is required but missing
        await expect(registry.executeTool('tool1', {}))
          .rejects.toThrow();
      } finally {
        // Restore console.error
        console.error = originalConsoleError;
      }
    });
  });
});
