import { config } from 'dotenv';
import { z } from 'zod';

// Load environment variables from .env file
config();

// Define and validate environment variables
const envSchema = z.object({
  OPENROUTER_API_KEY: z.string().min(1, 'OpenRouter API key is required'),
  OPENROUTER_MODEL: z.string().default('anthropic/claude-3-opus:beta'),
  MAX_TOKENS: z.coerce.number().optional().default(2000),
  TEMPERATURE: z.coerce.number().optional().default(0.7),
  DEV: z.enum(['true', 'false']).optional().default('false')
});

// Parse and validate environment variables
const envParse = envSchema.safeParse(process.env);

if (!envParse.success) {
  console.error('❌ Invalid environment variables:', envParse.error.format());
  throw new Error('Invalid environment variables');
}

// Export the validated environment variables
export const env = envParse.data;
