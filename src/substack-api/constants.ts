/**
 * Default headers for all Substack API requests
 */
export const HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.77 Safari/537.36",
};

/**
 * Headers for discovery/search endpoints
 */
export const DISCOVERY_HEADERS: Record<string, string> = {
  ...HEADERS,
  Accept: "application/json",
  Origin: "https://substack.com",
  Referer: "https://substack.com/discover",
};

/**
 * Base URLs for Substack API endpoints
 */
export const API_URLS = {
  /** Search for publications */
  PUBLICATION_SEARCH: "https://substack.com/api/v1/publication/search",
  /** List all categories */
  CATEGORIES: "https://substack.com/api/v1/categories",
  /** Category newsletters (append /{id}/all?page=) */
  CATEGORY_PUBLIC: "https://substack.com/api/v1/category/public",
  /** User public profile (append /{username}/public_profile) */
  USER_PROFILE: "https://substack.com/api/v1/user",
  /** User public page for redirect detection */
  USER_PAGE: "https://substack.com/@",
} as const;

/**
 * Default request timeout in milliseconds
 */
export const DEFAULT_TIMEOUT = 30_000;

/**
 * Delay between requests in milliseconds (to be polite to the server)
 */
export const REQUEST_DELAY = 2_000;

/**
 * Default page size for paginated requests
 */
export const DEFAULT_PAGE_SIZE = 15;

/**
 * Maximum pages to fetch for category newsletters
 */
export const MAX_CATEGORY_PAGES = 21;
