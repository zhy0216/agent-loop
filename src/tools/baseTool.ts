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
    // Convert Zod schema to proper OpenAI JSON Schema format
    const parameters = this.convertZodSchemaToJsonSchema(this.schema);
    
    return {
      type: 'function' as const,
      function: {
        name: this.name,
        description: this.description,
        parameters
      }
    };
  }
  
  /**
   * Convert Zod schema to proper JSON Schema format for OpenAI/OpenRouter
   */
  private convertZodSchemaToJsonSchema(schema: z.ZodObject<any>): Record<string, any> {
    // Start with a basic schema structure
    const jsonSchema: Record<string, any> = {
      type: 'object',
      properties: {},
      required: []
    };
    
    // Convert each property
    const shape = schema.shape;
    for (const [key, zodType] of Object.entries(shape)) {
      const property: Record<string, any> = {};
      
      // Handle different Zod types
      if (zodType instanceof z.ZodString) {
        property.type = 'string';
        // Add description if available
        const description = zodType.description;
        if (description) {
          property.description = description;
        }
      } else if (zodType instanceof z.ZodNumber) {
        property.type = 'number';
        const description = zodType.description;
        if (description) {
          property.description = description;
        }
      } else if (zodType instanceof z.ZodBoolean) {
        property.type = 'boolean';
        const description = zodType.description;
        if (description) {
          property.description = description;
        }
      } else if (zodType instanceof z.ZodEnum) {
        property.type = 'string';
        property.enum = zodType.options;
        const description = zodType.description;
        if (description) {
          property.description = description;
        }
      } else if (zodType instanceof z.ZodArray) {
        property.type = 'array';
        const description = zodType.description;
        if (description) {
          property.description = description;
        }
      }
      
      // Add to properties
      jsonSchema.properties[key] = property;
      
      // Check if required
      // In Zod, if the property doesn't have .optional() it's required
      if (!(zodType instanceof z.ZodOptional)) {
        jsonSchema.required.push(key);
      }
    }
    
    // If no required fields, remove the empty array
    if (jsonSchema.required.length === 0) {
      delete jsonSchema.required;
    }
    
    return jsonSchema;
  }
}
