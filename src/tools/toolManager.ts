import { Tool } from './baseTool';

/**
 * ToolManager class to manage the available tools
 */
export class ToolManager {
  private tools: Map<string, Tool> = new Map();

  /**
   * Register a tool for use
   */
  registerTool(tool: Tool): void {
    if (this.tools.has(tool.name)) {
      console.warn(`Tool with name "${tool.name}" already exists. Overwriting.`);
    }
    this.tools.set(tool.name, tool);
  }

  /**
   * Register multiple tools at once
   */
  registerTools(tools: Tool[]): void {
    for (const tool of tools) {
      this.registerTool(tool);
    }
  }

  /**
   * Get a tool by name
   */
  getTool(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  /**
   * Get all registered tools
   */
  getAllTools(): Tool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get the function definitions for all registered tools
   */
  getFunctionDefinitions(): any[] {
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
      return await tool.execute(args);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Error executing tool "${name}": ${errorMessage}`);
    }
  }
}
