/**
 * Telegram Module Types
 *
 * Type definitions for Telegram bot integration
 */

/**
 * Telegram configuration required to initialize the bot
 */
export interface TelegramConfig {
  /** Bot token from @BotFather */
  botToken: string;
  /** Chat ID to send messages to (can be user ID, group ID, or channel ID) */
  chatId: string;
  /** Whether Telegram notifications are enabled */
  enabled: boolean;
}

/**
 * Options for sending a message
 */
export interface SendMessageOptions {
  /** Parse mode for the message (HTML or Markdown) */
  parseMode?: "HTML" | "Markdown" | "MarkdownV2";
  /** Disable link previews */
  disableWebPagePreview?: boolean;
  /** Disable notification sound */
  disableNotification?: boolean;
  /** Reply to a specific message ID */
  replyToMessageId?: number;
}

/**
 * Telegram API response for sendMessage
 */
export interface TelegramMessageResponse {
  ok: boolean;
  result?: {
    message_id: number;
    from: {
      id: number;
      is_bot: boolean;
      first_name: string;
      username?: string;
    };
    chat: {
      id: number;
      type: "private" | "group" | "supergroup" | "channel";
      title?: string;
      username?: string;
      first_name?: string;
      last_name?: string;
    };
    date: number;
    text?: string;
  };
  error_code?: number;
  description?: string;
}

/**
 * Digest item representing a single post summary
 */
export interface DigestItem {
  /** Newsletter name */
  newsletterName: string;
  /** Post title */
  title: string;
  /** Post URL */
  url: string;
  /** Bullet points summary (each includes its own verdict) */
  bulletPoints: string[];
  /** Post date */
  date?: string;
}

/**
 * Result of sending a digest
 */
export interface SendDigestResult {
  success: boolean;
  messageId?: number;
  error?: string;
}
