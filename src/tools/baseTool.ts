import { z } from 'zod';

/**
 * Base Tool interface that all tools must implement
 */
export interface BaseTool<T extends z.ZodType = z.ZodType, R = any> {
  /**
   * Name of the tool - should be unique
   */
  name: string;
  
  /**
   * Description of what the tool does
   */
  description: string;
  
  /**
   * Zod schema for validating the arguments
   */
  schema: T;
  
  /**
   * Execute the tool with the given arguments
   */
  execute: (args: z.infer<T>) => Promise<R>;
  
  /**
   * Get the function definition for LLM tool calls
   */
  getFunctionDefinition: () => {
    type: 'function';
    function: {
      name: string;
      description: string;
      parameters: Record<string, any>;
    };
  };
}

/**
 * Abstract base class that implements the BaseTool interface
 */
export abstract class Tool<T extends z.ZodObject<any> = z.ZodObject<any>, R = any> implements BaseTool<T, R> {
  name: string;
  description: string;
  schema: T;
  
  constructor(name: string, description: string, schema: T) {
    this.name = name;
    this.description = description;
    this.schema = schema;
  }
  
  abstract execute(args: z.infer<T>): Promise<R>;
  
  getFunctionDefinition() {
    return {
      type: 'function' as const,
      function: {
        name: this.name,
        description: this.description,
        parameters: this.schema.shape
      }
    };
  }
}
