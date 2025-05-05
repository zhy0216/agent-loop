export * from './baseTool';
export * from './toolRegistry';
export * from './exampleTools';

import { z } from 'zod';
import { Tool } from './baseTool';

/**
 * Creates a tool without requiring a class definition
 * 
 * @param name - Name of the tool (should be unique)
 * @param description - Description of what the tool does
 * @param schema - Zod schema for validating the arguments
 * @param executeFn - Function to execute when the tool is called
 * @param usageExample - Optional example of how to use this tool
 * @returns An instance of a Tool
 * 
 * @example
 * ```typescript
 * const calculatorTool = createTool({
 *   name: 'calculator',
 *   description: 'Perform arithmetic operations',
 *   schema: z.object({
 *     expression: z.string().describe('Math expression to evaluate')
 *   }),
 *   execute: async (args) => {
 *     try {
 *       const result = eval(args.expression);
 *       return { result };
 *     } catch (error) {
 *       throw new Error(`Failed to evaluate: ${error.message}`);
 *     }
 *   }
 * });
 * ```
 */
export function createTool<
  T extends z.ZodObject<any>,
  R = any
>({
  name,
  description,
  schema,
  execute,
  usageExample
}: {
  name: string;
  description: string;
  schema: T;
  execute: (args: z.infer<T>) => Promise<R>;
  usageExample?: string;
}): Tool<T, R> {
  // Create a concrete implementation of the Tool abstract class
  class ConcreteToolImpl extends Tool<T, R> {
    constructor() {
      super(name, description, schema, usageExample);
    }

    async execute(args: z.infer<T>): Promise<R> {
      return execute(args);
    }
  }

  // Return an instance of the concrete implementation
  return new ConcreteToolImpl();
}
