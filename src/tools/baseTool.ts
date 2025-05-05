import { z } from 'zod';

/**
 * Abstract base class for all tools
 */
export abstract class Tool<T extends z.ZodObject<any> = z.ZodObject<any>, R = any> {
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
   * Optional usage example for this tool
   */
  private usageExample?: string;
  
  constructor(name: string, description: string, schema: T, usageExample?: string) {
    this.name = name;
    this.description = description;
    this.schema = schema;
    this.usageExample = usageExample;
  }
  
  /**
   * Execute the tool with the given arguments
   */
  abstract execute(args: z.infer<T>): Promise<R>;
  
  /**
   * Get the function definition for LLM tool calls
   */
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
   * Return the usage example if it exists
   * Will return undefined if no example is provided
   */
  generateUsageExample(): string | undefined {
    return this.usageExample;
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
