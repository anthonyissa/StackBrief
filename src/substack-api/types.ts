/**
 * Cookie structure for authentication
 */
export interface Cookie {
  name: string;
  value: string;
  domain?: string;
  path?: string;
  secure?: boolean;
}

/**
 * Post metadata returned from the Substack API
 */
export interface PostMetadata {
  id: number;
  publication_id: number;
  title: string;
  subtitle?: string;
  slug: string;
  post_date: string;
  audience: "everyone" | "only_paid" | "founding" | "only_free";
  canonical_url: string;
  description?: string;
  body_html?: string;
  truncated_body_text?: string;
  wordcount?: number;
  postTags?: Array<{ id: string; name: string }>;
  publishedBylines?: Author[];
  reactions?: Record<string, number>;
  comment_count?: number;
  type?: string;
  podcast_url?: string;
  podcast_duration?: number;
  cover_image?: string;
  [key: string]: unknown;
}

/**
 * Author/byline information
 */
export interface Author {
  id: number;
  name: string;
  handle?: string;
  photo_url?: string;
  bio?: string;
  is_guest?: boolean;
}

/**
 * User profile data
 */
export interface UserProfile {
  id: number;
  name: string;
  handle: string;
  profile_set_up_at?: string;
  photo_url?: string;
  bio?: string;
  subscriptions?: SubscriptionData[];
  [key: string]: unknown;
}

/**
 * Raw subscription data from the API
 */
export interface SubscriptionData {
  publication: PublicationInfo;
  membership_state: string;
}

/**
 * Publication information
 */
export interface PublicationInfo {
  id: number;
  name: string;
  subdomain: string;
  custom_domain?: string;
  logo_url?: string;
  author_id?: number;
  [key: string]: unknown;
}

/**
 * Processed subscription info
 */
export interface Subscription {
  publication_id: number;
  publication_name: string;
  domain: string;
  membership_state: string;
}

/**
 * Category information
 */
export interface CategoryInfo {
  id: number;
  name: string;
}

/**
 * Newsletter data from category listings
 */
export interface NewsletterData {
  id: number;
  name: string;
  subdomain: string;
  custom_domain?: string;
  base_url: string;
  logo_url?: string;
  author_name?: string;
  description?: string;
  subscriber_count?: number;
  [key: string]: unknown;
}

/**
 * Category newsletters API response
 */
export interface CategoryNewslettersResponse {
  publications: NewsletterData[];
  more: boolean;
}

/**
 * Publication search response
 */
export interface PublicationSearchResponse {
  publications: PublicationInfo[];
}

/**
 * Recommendation data
 */
export interface RecommendationData {
  recommendedPublication: PublicationInfo;
  [key: string]: unknown;
}

/**
 * Sorting options for posts
 */
export type PostSorting = "new" | "top" | "pinned" | "community";

/**
 * Request configuration options
 */
export interface RequestOptions {
  timeout?: number;
}
