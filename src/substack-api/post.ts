import type { SubstackAuth } from "./auth.ts";
import type { PostMetadata } from "./types.ts";
import { HEADERS, DEFAULT_TIMEOUT } from "./constants.ts";

/**
 * Strip HTML tags and decode HTML entities to get clean text.
 */
function stripHtml(html: string): string {
  // Remove script and style tags with their content
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");

  // Replace common block elements with newlines
  text = text.replace(/<\/(p|div|h[1-6]|li|tr|blockquote)>/gi, "\n");
  text = text.replace(/<br\s*\/?>/gi, "\n");
  text = text.replace(/<\/?(ul|ol)>/gi, "\n");

  // Remove all remaining HTML tags
  text = text.replace(/<[^>]+>/g, "");

  // Decode common HTML entities
  const entities: Record<string, string> = {
    "&nbsp;": " ",
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
    "&apos;": "'",
    "&mdash;": "—",
    "&ndash;": "–",
    "&hellip;": "…",
    "&bull;": "•",
    "&copy;": "©",
    "&reg;": "®",
    "&trade;": "™",
    "&euro;": "€",
    "&pound;": "£",
    "&yen;": "¥",
    "&cent;": "¢",
  };

  for (const [entity, char] of Object.entries(entities)) {
    text = text.replaceAll(entity, char);
  }

  // Decode numeric HTML entities (&#123; or &#x7B;)
  text = text.replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)));
  text = text.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16))
  );

  // Normalize whitespace: collapse multiple spaces/newlines
  text = text.replace(/[ \t]+/g, " ");
  text = text.replace(/\n\s*\n/g, "\n\n");

  // Trim each line and the whole text
  text = text
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .trim();

  return text;
}

/**
 * A class to represent a Substack post.
 */
export class Post {
  public readonly url: string;
  public readonly baseUrl: string;
  public readonly slug: string | null;
  private readonly endpoint: string;
  private readonly auth?: SubstackAuth;
  private postData: PostMetadata | null = null;

  /**
   * Initialize a Post object.
   * @param url - The URL of the Substack post
   * @param auth - Optional authentication handler for paywalled content
   */
  constructor(url: string, auth?: SubstackAuth) {
    this.url = url;
    this.auth = auth;

    const parsedUrl = new URL(url);
    this.baseUrl = `${parsedUrl.protocol}//${parsedUrl.host}`;

    const pathParts = parsedUrl.pathname.replace(/^\/|\/$/g, "").split("/");
    this.slug = pathParts.length > 0 ? pathParts[pathParts.length - 1] : null;

    this.endpoint = `${this.baseUrl}/api/v1/posts/${this.slug}`;
  }

  toString(): string {
    return `Post: ${this.url}`;
  }

  /**
   * Fetch the raw post data from the API and cache it.
   * @param forceRefresh - Whether to force a refresh of the data, ignoring the cache
   * @returns Full post metadata
   */
  private async fetchPostData(forceRefresh = false): Promise<PostMetadata> {
    if (this.postData !== null && !forceRefresh) {
      return this.postData;
    }

    let response: Response;

    if (this.auth?.authenticated) {
      response = await this.auth.get(this.endpoint);
    } else {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

      try {
        response = await fetch(this.endpoint, {
          headers: HEADERS,
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }
    }

    if (!response.ok) {
      throw new Error(
        `Failed to fetch post data: ${response.status} ${response.statusText}`
      );
    }

    this.postData = (await response.json()) as PostMetadata;
    return this.postData;
  }

  /**
   * Get metadata for the post.
   * @param forceRefresh - Whether to force a refresh of the data
   * @returns Full post metadata
   */
  async getMetadata(forceRefresh = false): Promise<PostMetadata> {
    return this.fetchPostData(forceRefresh);
  }

  /**
   * Get the HTML content of the post.
   * @param forceRefresh - Whether to force a refresh of the data
   * @returns HTML content of the post, or null if not available
   */
  async getContent(forceRefresh = false): Promise<string | null> {
    const data = await this.fetchPostData(forceRefresh);
    const content = data.body_html ?? null;

    // Check if content is paywalled and we don't have auth
    if (!content && data.audience === "only_paid" && !this.auth) {
      console.warn(
        "Warning: This post is paywalled. Provide authentication to access full content."
      );
    }

    return content;
  }

  /**
   * Get the content of the post as clean plain text (HTML stripped).
   * @param forceRefresh - Whether to force a refresh of the data
   * @returns Plain text content of the post, or null if not available
   */
  async getTextContent(forceRefresh = false): Promise<string | null> {
    const html = await this.getContent(forceRefresh);
    if (!html) {
      return null;
    }
    return stripHtml(html);
  }

  /**
   * Get truncated text preview of the post (from API).
   * This is a short preview, not the full content.
   * @returns Truncated text preview, or null if not available
   */
  async getPreviewText(): Promise<string | null> {
    const data = await this.fetchPostData();
    return data.truncated_body_text ?? null;
  }

  /**
   * Check if the post is paywalled.
   * @returns true if post is paywalled
   */
  async isPaywalled(): Promise<boolean> {
    const data = await this.fetchPostData();
    return data.audience === "only_paid";
  }

  /**
   * Get the publication ID this post belongs to.
   * @returns Publication ID
   */
  async getPublicationId(): Promise<number> {
    const data = await this.fetchPostData();
    return data.publication_id;
  }
}
