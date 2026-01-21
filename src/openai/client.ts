/**
 * OpenAI Client
 *
 * Wrapper for OpenAI API interactions
 */

import OpenAI from "openai";
import type { OpenAIConfig, SummarizeInput, SummarizeResult } from "./types.ts";
import {
  DEFAULT_MODEL,
  DEFAULT_MAX_TOKENS,
  DEFAULT_TEMPERATURE,
  MAX_CONTENT_LENGTH,
  DEFAULT_BULLET_POINTS,
  SUMMARIZATION_SYSTEM_PROMPT,
} from "./constants.ts";

export class OpenAIClient {
  private client: OpenAI | null = null;
  private readonly config: OpenAIConfig;

  constructor(config: OpenAIConfig) {
    this.config = config;

    if (config.enabled && config.apiKey) {
      this.client = new OpenAI({
        apiKey: config.apiKey,
      });
      console.log(`[OpenAI] Client initialized with model: ${config.model}`);
    } else {
      console.log("[OpenAI] Client disabled (no API key or disabled in config)");
    }
  }

  /**
   * Check if OpenAI is enabled and configured
   */
  isEnabled(): boolean {
    return this.config.enabled && this.client !== null;
  }

  /**
   * Summarize a post into bullet points
   */
  async summarize(
    input: SummarizeInput,
    bulletCount: number = DEFAULT_BULLET_POINTS
  ): Promise<SummarizeResult> {
    if (!this.isEnabled() || !this.client) {
      return {
        success: false,
        bulletPoints: [],
        error: "OpenAI client not enabled",
      };
    }

    try {
      // Truncate content if too long
      const truncatedContent =
        input.content.length > MAX_CONTENT_LENGTH
          ? input.content.slice(0, MAX_CONTENT_LENGTH) + "..."
          : input.content;

      // Build the user prompt
      const userPrompt = this.buildUserPrompt(input, truncatedContent);

      // Use the system prompt as-is (bullet count determined by content)
      const systemPrompt = SUMMARIZATION_SYSTEM_PROMPT;

      console.log(`[OpenAI] Summarizing: "${input.title}" (${truncatedContent.length} chars)`);

      const completion = await this.client.chat.completions.create({
        model: this.config.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
      });

      const responseContent = completion.choices[0]?.message?.content;

      if (!responseContent) {
        return {
          success: false,
          bulletPoints: [],
          error: "Empty response from OpenAI",
        };
      }

      // Parse bullet points from response
      const bulletPoints = this.parseBulletPoints(responseContent);

      console.log(
        `[OpenAI] ✅ Generated ${bulletPoints.length} bullet points (${completion.usage?.total_tokens} tokens)`
      );

      return {
        success: true,
        bulletPoints,
        tokensUsed: completion.usage?.total_tokens,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error(`[OpenAI] ❌ Summarization failed: ${errorMessage}`);

      return {
        success: false,
        bulletPoints: [],
        error: errorMessage,
      };
    }
  }

  /**
   * Build the user prompt for summarization
   */
  private buildUserPrompt(input: SummarizeInput, content: string): string {
    const parts: string[] = [
      `Newsletter: ${input.newsletterName}`,
      `Title: ${input.title}`,
    ];

    if (input.subtitle) {
      parts.push(`Subtitle: ${input.subtitle}`);
    }

    parts.push("", "Article content:", content);

    return parts.join("\n");
  }

  /**
   * Parse bullet points from the AI response
   */
  private parseBulletPoints(response: string): string[] {
    return response
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => {
        // Remove common bullet prefixes if present (keep emoji at start)
        return line
          .replace(/^[-•*]\s*/, "")
          .replace(/^\d+\.\s*/, "")
          .trim();
      })
      .filter((line) => line.length > 0);
  }
}

/**
 * Create an OpenAI client from config
 */
export function createOpenAIClient(config: {
  enabled: boolean;
  apiKey?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}): OpenAIClient {
  return new OpenAIClient({
    enabled: config.enabled,
    apiKey: config.apiKey ?? "",
    model: config.model ?? DEFAULT_MODEL,
    maxTokens: config.maxTokens ?? DEFAULT_MAX_TOKENS,
    temperature: config.temperature ?? DEFAULT_TEMPERATURE,
  });
}
