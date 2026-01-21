/**
 * Substack API - TypeScript client library for interacting with Substack newsletters
 *
 * This library provides TypeScript interfaces for interacting with Substack's unofficial API,
 * allowing you to:
 * - Retrieve newsletter posts, podcasts, and recommendations
 * - Get user profile information and subscriptions
 * - Fetch post content and metadata
 * - Search for posts within newsletters
 * - Access paywalled content with user-provided authentication
 */

// Classes
export { SubstackAuth } from "./auth.ts";
export { Post } from "./post.ts";
export { Newsletter } from "./newsletter.ts";
export { User, resolveHandleRedirect } from "./user.ts";
export { Category, listAllCategories } from "./category.ts";

// Types
export type {
  Cookie,
  PostMetadata,
  Author,
  UserProfile,
  Subscription,
  SubscriptionData,
  PublicationInfo,
  CategoryInfo,
  NewsletterData,
  CategoryNewslettersResponse,
  PublicationSearchResponse,
  RecommendationData,
  PostSorting,
  RequestOptions,
} from "./types.ts";

// Constants (if needed by consumers)
export {
  HEADERS,
  DISCOVERY_HEADERS,
  API_URLS,
  DEFAULT_TIMEOUT,
  REQUEST_DELAY,
  DEFAULT_PAGE_SIZE,
} from "./constants.ts";
