/**
 * Telegram Bot Client
 *
 * Handles sending messages and digests via Telegram Bot API
 */

import {
  TELEGRAM_API_BASE,
  DEFAULT_TIMEOUT,
  MAX_MESSAGE_LENGTH,
  DEFAULT_PARSE_MODE,
} from "./constants.ts";
import type {
  TelegramConfig,
  SendMessageOptions,
  TelegramMessageResponse,
  DigestItem,
  SendDigestResult,
} from "./types.ts";

export class TelegramClient {
  private readonly botToken: string;
  private readonly chatId: string;
  private readonly enabled: boolean;

  constructor(config: TelegramConfig) {
    this.botToken = config.botToken;
    this.chatId = config.chatId;
    this.enabled = config.enabled;

    console.log(
      `[TelegramClient] Initialized with chatId: ${this.chatId}, enabled: ${this.enabled}`
    );
  }

  /**
   * Check if Telegram notifications are enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Validate that the configuration is complete
   */
  isConfigured(): boolean {
    return Boolean(this.botToken && this.chatId);
  }

  /**
   * Send a raw text message to the configured chat
   */
  async sendMessage(
    text: string,
    options: SendMessageOptions = {}
  ): Promise<TelegramMessageResponse> {
    if (!this.enabled) {
      console.log("[TelegramClient] Notifications disabled, skipping message");
      return { ok: false, description: "Notifications disabled" };
    }

    if (!this.isConfigured()) {
      console.error("[TelegramClient] Bot token or chat ID not configured");
      return { ok: false, description: "Bot not configured" };
    }

    // Truncate message if too long
    const truncatedText =
      text.length > MAX_MESSAGE_LENGTH
        ? text.slice(0, MAX_MESSAGE_LENGTH - 3) + "..."
        : text;

    const url = `${TELEGRAM_API_BASE}${this.botToken}/sendMessage`;

    const body = {
      chat_id: this.chatId,
      text: truncatedText,
      parse_mode: options.parseMode ?? DEFAULT_PARSE_MODE,
      disable_web_page_preview: options.disableWebPagePreview ?? true,
      disable_notification: options.disableNotification ?? false,
      ...(options.replyToMessageId && {
        reply_to_message_id: options.replyToMessageId,
      }),
    };

    console.log(`[TelegramClient] Sending message to chat ${this.chatId}`);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(DEFAULT_TIMEOUT),
      });

      const result = (await response.json()) as TelegramMessageResponse;

      if (result.ok) {
        console.log(
          `[TelegramClient] Message sent successfully, ID: ${result.result?.message_id}`
        );
      } else {
        console.error(
          `[TelegramClient] Failed to send message: ${result.description}`
        );
      }

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error(`[TelegramClient] Error sending message: ${errorMessage}`);
      return { ok: false, description: errorMessage };
    }
  }

  /**
   * Format a digest item into HTML message format
   */
  private formatDigestItem(item: DigestItem): string {
    // Add blank lines between bullet points for spacing
    const bulletPointsFormatted = item.bulletPoints
      .map((point) => `• ${this.escapeHtml(point)}`)
      .join("\n\n");

    const dateStr = item.date ? ` (${item.date})` : "";

    // Title first, then newsletter origin on same line
    return `<a href="${item.url}"><b>${this.escapeHtml(item.title)}</b></a> — <i>${this.escapeHtml(item.newsletterName)}</i>${dateStr}

${bulletPointsFormatted}`;
  }

  /**
   * Escape HTML special characters
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  /**
   * Send a single digest item
   */
  async sendDigestItem(item: DigestItem): Promise<SendDigestResult> {
    const message = this.formatDigestItem(item);
    const response = await this.sendMessage(message);

    return {
      success: response.ok,
      messageId: response.result?.message_id,
      error: response.description,
    };
  }

  /**
   * Send multiple digest items as separate messages
   */
  async sendDigest(items: DigestItem[]): Promise<SendDigestResult[]> {
    if (!this.enabled) {
      console.log("[TelegramClient] Notifications disabled, skipping digest");
      return items.map(() => ({
        success: false,
        error: "Notifications disabled",
      }));
    }

    if (items.length === 0) {
      console.log("[TelegramClient] No items to send");
      return [];
    }

    console.log(`[TelegramClient] Sending digest with ${items.length} items`);

    const results: SendDigestResult[] = [];

    for (const item of items) {
      const result = await this.sendDigestItem(item);
      results.push(result);

      // Small delay between messages to avoid rate limiting
      if (items.indexOf(item) < items.length - 1) {
        await this.delay(100);
      }
    }

    const successCount = results.filter((r) => r.success).length;
    console.log(
      `[TelegramClient] Digest sent: ${successCount}/${items.length} successful`
    );

    return results;
  }

  /**
   * Send a combined digest as a single message (for shorter digests)
   */
  async sendCombinedDigest(
    items: DigestItem[],
    title?: string
  ): Promise<SendDigestResult> {
    if (!this.enabled) {
      return { success: false, error: "Notifications disabled" };
    }

    if (items.length === 0) {
      return { success: false, error: "No items to send" };
    }

    const header = title
      ? `<b>📋 ${this.escapeHtml(title)}</b>\n\n`
      : "<b>📋 StackBrief Digest</b>\n\n";

    const formattedItems = items
      .map((item) => this.formatDigestItem(item))
      .join("\n\n───────────────\n\n");

    const message = header + formattedItems;

    // If message is too long, send as separate messages
    if (message.length > MAX_MESSAGE_LENGTH) {
      console.log(
        "[TelegramClient] Combined digest too long, sending as separate messages"
      );
      const results = await this.sendDigest(items);
      const allSuccess = results.every((r) => r.success);
      return {
        success: allSuccess,
        error: allSuccess ? undefined : "Some messages failed to send",
      };
    }

    const response = await this.sendMessage(message);
    return {
      success: response.ok,
      messageId: response.result?.message_id,
      error: response.description,
    };
  }

  /**
   * Test the bot connection by sending a test message
   */
  async testConnection(): Promise<boolean> {
    const response = await this.sendMessage(
      "🤖 <b>StackBrief</b> - Connection test successful!",
      { disableNotification: true }
    );
    return response.ok;
  }

  /**
   * Helper to add delay between requests
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Create a TelegramClient from environment variables or config
 */
export function createTelegramClient(config: {
  enabled: boolean;
  botToken?: string;
  chatId?: string;
}): TelegramClient {
  return new TelegramClient({
    botToken: config.botToken ?? "",
    chatId: config.chatId ?? "",
    enabled: config.enabled,
  });
}
