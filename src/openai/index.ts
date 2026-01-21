/**
 * OpenAI Module - AI-powered summarization for StackBrief
 *
 * Uses OpenAI's GPT models to generate concise bullet point summaries
 * of newsletter articles.
 *
 * Usage:
 * ```typescript
 * import { createOpenAIClient } from './openai';
 *
 * const client = createOpenAIClient(config.openai);
 *
 * const result = await client.summarize({
 *   title: 'Post Title',
 *   content: 'Full post content...',
 *   newsletterName: 'MoneyRadar',
 * });
 *
 * if (result.success) {
 *   console.log(result.bulletPoints);
 * }
 * ```
 */

// Client
export { OpenAIClient, createOpenAIClient } from "./client.ts";

// Types
export type {
  OpenAIConfig,
  SummarizeInput,
  SummarizeResult,
} from "./types.ts";

// Constants
export {
  DEFAULT_MODEL,
  DEFAULT_MAX_TOKENS,
  DEFAULT_TEMPERATURE,
  MAX_CONTENT_LENGTH,
  DEFAULT_BULLET_POINTS,
} from "./constants.ts";
