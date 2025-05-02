import { BaseTool } from './baseTool';

/**
 * Registry for managing all available tools for the agent
 */
export class ToolRegistry {
  private tools: Map<string, BaseTool> = new Map();
  
  /**
   * Register a tool in the registry
   */
  registerTool(tool: BaseTool): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool with name "${tool.name}" is already registered`);
    }
    
    this.tools.set(tool.name, tool);
  }
  
  /**
   * Register multiple tools at once
   */
  registerTools(tools: BaseTool[]): void {
    for (const tool of tools) {
      this.registerTool(tool);
    }
  }
  
  /**
   * Get a tool by name
   */
  getTool(name: string): BaseTool | undefined {
    return this.tools.get(name);
  }
  
  /**
   * Get all registered tools
   */
  getAllTools(): BaseTool[] {
    return Array.from(this.tools.values());
  }
  
  /**
   * Get function definitions for all tools in the format required by LLM API
   */
  getFunctionDefinitions(): Array<{
    type: 'function';
    function: {
      name: string;
      description: string;
      parameters: Record<string, any>;
    };
  }> {
    return this.getAllTools().map(tool => tool.getFunctionDefinition());
  }
  
  /**
   * Execute a tool by name with the given arguments
   */
  async executeTool(name: string, args: any): Promise<any> {
    const tool = this.getTool(name);
    
    if (!tool) {
      throw new Error(`Tool "${name}" not found`);
    }
    
    try {
      // Validate arguments against the tool's schema
      const validatedArgs = tool.schema.parse(args);
      
      // Execute the tool with validated arguments
      return await tool.execute(validatedArgs);
    } catch (error) {
      console.error(`Error executing tool "${name}":`, error);
      throw error;
    }
  }
}
