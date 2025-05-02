import { z } from 'zod';

// Mock the dotenv config function
jest.mock('dotenv', () => ({
  config: jest.fn()
}));

// Helper to reset module between tests
const resetModule = () => {
  jest.resetModules();
  delete process.env.OPENROUTER_API_KEY;
  delete process.env.OPENROUTER_MODEL;
  delete process.env.MAX_TOKENS;
  delete process.env.TEMPERATURE;
  delete process.env.DEV;
};

describe('Environment Configuration', () => {
  beforeEach(() => {
    resetModule();
  });

  it('should load valid environment variables', () => {
    // Set test environment variables
    process.env.OPENROUTER_API_KEY = 'test-api-key';
    process.env.OPENROUTER_MODEL = 'test-model';
    process.env.MAX_TOKENS = '500';
    process.env.TEMPERATURE = '0.8';
    process.env.DEV = 'false';
    
    // Import the module to test
    const { env } = require('../../src/config/env');
    
    // Check that environment variables were loaded correctly
    expect(env.OPENROUTER_API_KEY).toBe('test-api-key');
    expect(env.OPENROUTER_MODEL).toBe('test-model');
    expect(env.MAX_TOKENS).toBe(500);
    expect(env.TEMPERATURE).toBe(0.8);
    expect(env.DEV).toBe('false');
  });

  it('should use default values when optional variables are not provided', () => {
    // Set only the required environment variables
    process.env.OPENROUTER_API_KEY = 'test-api-key';
    
    // Import the module to test
    const { env } = require('../../src/config/env');
    
    // Check that default values were used
    expect(env.OPENROUTER_API_KEY).toBe('test-api-key');
    expect(env.OPENROUTER_MODEL).toBe('anthropic/claude-3-opus:beta');
    expect(env.MAX_TOKENS).toBe(2000);
    expect(env.TEMPERATURE).toBe(0.7);
    expect(env.DEV).toBe('false');
  });

  it('should throw an error when required variables are missing', () => {
    // No environment variables set
    
    // Import should throw an error
    expect(() => {
      require('../../src/config/env');
    }).toThrow();
  });

  it('should validate environment variable types', () => {
    // Set environment variables with invalid types
    process.env.OPENROUTER_API_KEY = 'test-api-key';
    process.env.TEMPERATURE = 'not-a-number';
    
    // Import should throw an error
    expect(() => {
      require('../../src/config/env');
    }).toThrow();
  });

  it('should validate DEV flag options', () => {
    // Set required variables
    process.env.OPENROUTER_API_KEY = 'test-api-key';
    
    // Test with valid values
    process.env.DEV = 'true';
    let envModule = require('../../src/config/env');
    expect(envModule.env.DEV).toBe('true');
    
    // Reset and test with invalid value
    resetModule();
    process.env.OPENROUTER_API_KEY = 'test-api-key';
    process.env.DEV = 'invalid-value';
    
    expect(() => {
      require('../../src/config/env');
    }).toThrow();
  });
});
