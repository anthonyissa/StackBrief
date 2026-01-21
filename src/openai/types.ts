/**
 * OpenAI Module Types
 *
 * Type definitions for OpenAI integration
 */

/**
 * OpenAI configuration
 */
export interface OpenAIConfig {
  /** Whether OpenAI is enabled */
  enabled: boolean;
  /** OpenAI API key */
  apiKey: string;
  /** Model to use for summarization */
  model: string;
  /** Maximum tokens for completion */
  maxTokens: number;
  /** Temperature for response randomness (0-2) */
  temperature: number;
}

/**
 * Input for summarizing a post
 */
export interface SummarizeInput {
  /** Post title */
  title: string;
  /** Post subtitle (optional) */
  subtitle?: string;
  /** Post content (plain text) */
  content: string;
  /** Newsletter name */
  newsletterName: string;
  /** Target language for summary */
  language?: string;
}

/**
 * Result of summarization
 */
export interface SummarizeResult {
  /** Whether summarization was successful */
  success: boolean;
  /** Generated bullet points (each includes its own verdict) */
  bulletPoints: string[];
  /** Error message if failed */
  error?: string;
  /** Tokens used */
  tokensUsed?: number;
}
