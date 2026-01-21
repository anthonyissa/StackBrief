/**
 * Telegram Module - Telegram Bot integration for StackBrief notifications
 *
 * This module provides functionality to send digest notifications via Telegram Bot API.
 *
 * Usage:
 * ```typescript
 * import { TelegramClient, createTelegramClient } from './telegram';
 *
 * // Create client from config
 * const client = createTelegramClient(config.telegram);
 *
 * // Send a digest
 * await client.sendDigest([
 *   {
 *     newsletterName: 'MoneyRadar',
 *     title: 'Post Title',
 *     url: 'https://example.substack.com/p/post-slug',
 *     bulletPoints: ['Point 1', 'Point 2', 'Point 3']
 *   }
 * ]);
 * ```
 */

// Main client
export { TelegramClient, createTelegramClient } from "./client.ts";

// Types
export type {
  TelegramConfig,
  SendMessageOptions,
  TelegramMessageResponse,
  DigestItem,
  SendDigestResult,
} from "./types.ts";

// Constants
export {
  TELEGRAM_API_BASE,
  DEFAULT_TIMEOUT,
  MAX_MESSAGE_LENGTH,
  DEFAULT_PARSE_MODE,
} from "./constants.ts";
