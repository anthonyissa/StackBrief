import { readFileSync, existsSync } from "fs";
import type { Cookie } from "./types.ts";
import { HEADERS, DEFAULT_TIMEOUT } from "./constants.ts";

/**
 * Handles authentication for Substack API requests.
 * Loads cookies from a JSON file to access paywalled content.
 */
export class SubstackAuth {
  private cookies: Map<string, string> = new Map();
  public authenticated: boolean = false;

  /**
   * Initialize authentication handler.
   * @param cookiesPath - Path to JSON file containing browser cookies
   */
  constructor(cookiesPath: string) {
    if (existsSync(cookiesPath)) {
      this.loadCookies(cookiesPath);
    } else {
      console.warn(
        `Cookies file not found at ${cookiesPath}. Authentication disabled.`
      );
    }
  }

  /**
   * Load cookies from a JSON file.
   * @param cookiesPath - Path to the cookies JSON file
   * @returns true if cookies loaded successfully
   */
  private loadCookies(cookiesPath: string): boolean {
    try {
      const content = readFileSync(cookiesPath, "utf-8");
      const cookies: Cookie[] = JSON.parse(content);

      for (const cookie of cookies) {
        this.cookies.set(cookie.name, cookie.value);
      }

      this.authenticated = true;
      return true;
    } catch (error) {
      console.error(`Failed to load cookies: ${error}`);
      return false;
    }
  }

  /**
   * Get the cookie header string for requests.
   */
  private getCookieHeader(): string {
    const cookieParts: string[] = [];
    for (const [name, value] of this.cookies) {
      cookieParts.push(`${name}=${value}`);
    }
    return cookieParts.join("; ");
  }

  /**
   * Get headers with authentication cookies included.
   */
  getAuthHeaders(): Record<string, string> {
    return {
      ...HEADERS,
      Accept: "application/json",
      "Content-Type": "application/json",
      Cookie: this.getCookieHeader(),
    };
  }

  /**
   * Make an authenticated GET request.
   * @param url - URL to request
   * @param options - Additional fetch options
   * @returns Response object
   */
  async get(
    url: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

    try {
      const response = await fetch(url, {
        ...options,
        method: "GET",
        headers: {
          ...this.getAuthHeaders(),
          ...(options.headers || {}),
        },
        signal: controller.signal,
      });
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Make an authenticated POST request.
   * @param url - URL to request
   * @param body - Request body
   * @param options - Additional fetch options
   * @returns Response object
   */
  async post(
    url: string,
    body?: unknown,
    options: RequestInit = {}
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

    try {
      const response = await fetch(url, {
        ...options,
        method: "POST",
        headers: {
          ...this.getAuthHeaders(),
          ...(options.headers || {}),
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
