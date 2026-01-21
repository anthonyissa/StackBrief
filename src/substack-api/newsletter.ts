import type { SubstackAuth } from "./auth.ts";
import { Post } from "./post.ts";
import type {
  PostMetadata,
  PostSorting,
  PublicationSearchResponse,
  PublicationInfo,
  RecommendationData,
  Author,
} from "./types.ts";
import {
  HEADERS,
  DISCOVERY_HEADERS,
  API_URLS,
  DEFAULT_TIMEOUT,
  REQUEST_DELAY,
  DEFAULT_PAGE_SIZE,
} from "./constants.ts";

/**
 * Helper function to extract host from URL
 */
function hostFromUrl(url: string): string {
  const fullUrl = url.includes("://") ? url : `https://${url}`;
  const parsedUrl = new URL(fullUrl);
  return parsedUrl.host.toLowerCase();
}

/**
 * Helper function to match publication from search results
 */
function matchPublication(
  searchResults: PublicationSearchResponse,
  host: string
): PublicationInfo | null {
  const publications = searchResults.publications || [];

  // Try exact custom domain, then subdomain match
  for (const item of publications) {
    if (
      (item.custom_domain && hostFromUrl(item.custom_domain) === host) ||
      (item.subdomain && `${item.subdomain.toLowerCase()}.substack.com` === host)
    ) {
      return item;
    }
  }

  // Fallback: loose match on subdomain token
  const match = host.match(/^([a-z0-9-]+)\.substack\.com$/);
  if (match) {
    const sub = match[1];
    for (const item of publications) {
      if (item.subdomain?.toLowerCase() === sub) {
        return item;
      }
    }
  }

  return null;
}

/**
 * Helper function to delay execution
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Newsletter class for interacting with Substack newsletters
 */
export class Newsletter {
  public readonly url: string;
  private readonly auth?: SubstackAuth;

  /**
   * Initialize a Newsletter object.
   * @param url - The URL of the Substack newsletter
   * @param auth - Optional authentication handler for paywalled content
   */
  constructor(url: string, auth?: SubstackAuth) {
    // Normalize URL to have https://
    this.url = url.includes("://") ? url : `https://${url}`;
    this.auth = auth;
  }

  toString(): string {
    return `Newsletter: ${this.url}`;
  }

  /**
   * Make a GET request to the specified endpoint with optional authentication.
   */
  private async makeRequest(endpoint: string): Promise<Response> {
    let response: Response;

    if (this.auth?.authenticated) {
      response = await this.auth.get(endpoint);
    } else {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

      try {
        response = await fetch(endpoint, {
          headers: HEADERS,
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }
    }

    // Be polite to the server
    await delay(REQUEST_DELAY);

    return response;
  }

  /**
   * Helper method to fetch paginated posts with different query parameters.
   */
  private async fetchPaginatedPosts(
    params: Record<string, string>,
    limit?: number,
    pageSize: number = DEFAULT_PAGE_SIZE
  ): Promise<PostMetadata[]> {
    const results: PostMetadata[] = [];
    let offset = 0;
    let moreItems = true;

    while (moreItems) {
      // Update params with current offset and batch size
      const currentParams = new URLSearchParams({
        ...params,
        offset: offset.toString(),
        limit: pageSize.toString(),
      });

      const endpoint = `${this.url}/api/v1/archive?${currentParams.toString()}`;
      const response = await this.makeRequest(endpoint);

      if (!response.ok) {
        throw new Error(
          `Failed to fetch posts: ${response.status} ${response.statusText}`
        );
      }

      const items = (await response.json()) as PostMetadata[];

      if (!items || items.length === 0) {
        break;
      }

      results.push(...items);
      offset += pageSize;

      // Check if we've reached the requested limit
      if (limit && results.length >= limit) {
        return results.slice(0, limit);
      }

      // Check if we got fewer items than requested (last page)
      if (items.length < pageSize) {
        moreItems = false;
      }
    }

    return results;
  }

  /**
   * Get posts from the newsletter with specified sorting.
   * @param sorting - Sorting order for the posts ("new", "top", "pinned", or "community")
   * @param limit - Maximum number of posts to return
   * @returns Array of Post objects
   */
  async getPosts(sorting: PostSorting = "new", limit?: number): Promise<Post[]> {
    const params = { sort: sorting };
    const postData = await this.fetchPaginatedPosts(params, limit);
    return postData.map((item) => new Post(item.canonical_url, this.auth));
  }

  /**
   * Get raw post metadata from the newsletter.
   * Useful when you need the metadata without creating Post objects.
   * @param sorting - Sorting order for the posts
   * @param limit - Maximum number of posts to return
   * @returns Array of post metadata objects
   */
  async getPostsMetadata(
    sorting: PostSorting = "new",
    limit?: number
  ): Promise<PostMetadata[]> {
    const params = { sort: sorting };
    return this.fetchPaginatedPosts(params, limit);
  }

  /**
   * Search posts in the newsletter with the given query.
   * @param query - Search query string
   * @param limit - Maximum number of posts to return
   * @returns Array of Post objects matching the search query
   */
  async searchPosts(query: string, limit?: number): Promise<Post[]> {
    const params = { sort: "new", search: query };
    const postData = await this.fetchPaginatedPosts(params, limit);
    return postData.map((item) => new Post(item.canonical_url, this.auth));
  }

  /**
   * Get podcast posts from the newsletter.
   * @param limit - Maximum number of podcast posts to return
   * @returns Array of Post objects representing podcast posts
   */
  async getPodcasts(limit?: number): Promise<Post[]> {
    const params = { sort: "new", type: "podcast" };
    const postData = await this.fetchPaginatedPosts(params, limit);
    return postData.map((item) => new Post(item.canonical_url, this.auth));
  }

  /**
   * Resolve publication_id via Substack discovery search.
   */
  private async resolvePublicationId(): Promise<number | null> {
    const host = hostFromUrl(this.url);
    const q = host.split(":")[0]; // strip port if present

    const params = new URLSearchParams({
      query: q,
      page: "0",
      limit: "25",
      skipExplanation: "true",
      sort: "relevance",
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

    try {
      const response = await fetch(
        `${API_URLS.PUBLICATION_SEARCH}?${params.toString()}`,
        {
          headers: DISCOVERY_HEADERS,
          signal: controller.signal,
        }
      );

      if (!response.ok) {
        return null;
      }

      const data = (await response.json()) as PublicationSearchResponse;
      const match = matchPublication(data, host);
      return match?.id ?? null;
    } catch {
      return null;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Get recommended publications.
   * @returns Array of Newsletter objects representing recommended newsletters
   */
  async getRecommendations(): Promise<Newsletter[]> {
    let publicationId = await this.resolvePublicationId();

    // Graceful fallback to post-derived path
    if (!publicationId) {
      try {
        const posts = await this.getPosts("new", 1);
        if (posts.length > 0) {
          publicationId = await posts[0].getPublicationId();
        }
      } catch {
        publicationId = null;
      }
    }

    if (!publicationId) {
      return [];
    }

    const endpoint = `${this.url}/api/v1/recommendations/from/${publicationId}`;
    const response = await this.makeRequest(endpoint);

    if (!response.ok) {
      return [];
    }

    const recommendations = (await response.json()) as RecommendationData[];
    const urls: string[] = [];

    for (const rec of recommendations || []) {
      const pub = rec.recommendedPublication;
      if (pub?.custom_domain) {
        urls.push(pub.custom_domain);
      } else if (pub?.subdomain) {
        urls.push(`${pub.subdomain}.substack.com`);
      }
    }

    return urls.map((u) => new Newsletter(u, this.auth));
  }

  /**
   * Get authors of the newsletter.
   * @returns Array of author objects
   */
  async getAuthors(): Promise<Author[]> {
    const endpoint = `${this.url}/api/v1/publication/users/ranked?public=true`;
    const response = await this.makeRequest(endpoint);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch authors: ${response.status} ${response.statusText}`
      );
    }

    return (await response.json()) as Author[];
  }
}
