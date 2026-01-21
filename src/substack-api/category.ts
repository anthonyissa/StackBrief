import { Newsletter } from "./newsletter.ts";
import type {
  CategoryInfo,
  NewsletterData,
  CategoryNewslettersResponse,
} from "./types.ts";
import {
  HEADERS,
  API_URLS,
  DEFAULT_TIMEOUT,
  REQUEST_DELAY,
  MAX_CATEGORY_PAGES,
} from "./constants.ts";

/**
 * Helper function to delay execution
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Get name / id representations of all newsletter categories.
 * @returns List of category info with name and id
 */
export async function listAllCategories(): Promise<CategoryInfo[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

  try {
    const response = await fetch(API_URLS.CATEGORIES, {
      headers: HEADERS,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch categories: ${response.status} ${response.statusText}`
      );
    }

    const data = (await response.json()) as Array<{ name: string; id: number }>;
    return data.map((item) => ({ name: item.name, id: item.id }));
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Top-level newsletter category.
 */
export class Category {
  public name: string | null;
  public id: number | null;
  private newslettersData: NewsletterData[] | null = null;

  /**
   * Initialize a Category object.
   * @param options - Either name or id must be provided
   */
  constructor(options: { name?: string; id?: number }) {
    if (options.name === undefined && options.id === undefined) {
      throw new Error("Either name or id must be provided");
    }

    this.name = options.name ?? null;
    this.id = options.id ?? null;
  }

  toString(): string {
    return `${this.name} (${this.id})`;
  }

  /**
   * Initialize the category by fetching missing name or id.
   * Must be called before using other methods if only one of name/id was provided.
   */
  async init(): Promise<void> {
    if (this.name && this.id === null) {
      await this.getIdFromName();
    } else if (this.id && this.name === null) {
      await this.getNameFromId();
    }
  }

  /**
   * Lookup category ID based on name.
   */
  private async getIdFromName(): Promise<void> {
    const categories = await listAllCategories();
    const found = categories.find((cat) => cat.name === this.name);

    if (!found) {
      throw new Error(`Category name '${this.name}' not found`);
    }

    this.id = found.id;
  }

  /**
   * Lookup category name based on ID.
   */
  private async getNameFromId(): Promise<void> {
    const categories = await listAllCategories();
    const found = categories.find((cat) => cat.id === this.id);

    if (!found) {
      throw new Error(`Category ID ${this.id} not found`);
    }

    this.name = found.name;
  }

  /**
   * Fetch the raw newsletter data from the API and cache it.
   * @param forceRefresh - Whether to force a refresh of the data
   * @returns Full newsletter metadata
   */
  private async fetchNewslettersData(
    forceRefresh = false
  ): Promise<NewsletterData[]> {
    if (this.newslettersData !== null && !forceRefresh) {
      return this.newslettersData;
    }

    // Ensure we have the ID
    if (this.id === null) {
      await this.init();
    }

    const allNewsletters: NewsletterData[] = [];
    let pageNum = 0;
    let more = true;

    // Endpoint doesn't return more than MAX_CATEGORY_PAGES pages
    while (more && pageNum <= MAX_CATEGORY_PAGES) {
      const endpoint = `${API_URLS.CATEGORY_PUBLIC}/${this.id}/all?page=${pageNum}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

      try {
        const response = await fetch(endpoint, {
          headers: HEADERS,
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(
            `Failed to fetch category newsletters: ${response.status} ${response.statusText}`
          );
        }

        // Be polite to the server
        await delay(REQUEST_DELAY);

        const data = (await response.json()) as CategoryNewslettersResponse;
        allNewsletters.push(...data.publications);
        pageNum++;
        more = data.more;
      } finally {
        clearTimeout(timeoutId);
      }
    }

    this.newslettersData = allNewsletters;
    return allNewsletters;
  }

  /**
   * Get only the URLs of newsletters in this category.
   * @returns List of newsletter URLs
   */
  async getNewsletterUrls(): Promise<string[]> {
    const data = await this.fetchNewslettersData();
    return data.map((item) => item.base_url);
  }

  /**
   * Get Newsletter objects for all newsletters in this category.
   * @returns List of Newsletter objects
   */
  async getNewsletters(): Promise<Newsletter[]> {
    const urls = await this.getNewsletterUrls();
    return urls.map((url) => new Newsletter(url));
  }

  /**
   * Get full metadata for all newsletters in this category.
   * @returns List of newsletter metadata
   */
  async getNewsletterMetadata(): Promise<NewsletterData[]> {
    return this.fetchNewslettersData();
  }

  /**
   * Force refresh of the newsletter data cache.
   */
  async refreshData(): Promise<void> {
    await this.fetchNewslettersData(true);
  }
}
