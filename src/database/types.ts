/**
 * Database Types
 *
 * Type definitions for database entities (PostgreSQL)
 */

/**
 * Post record as stored in the database
 */
export interface PostRecord {
  id: number;
  post_id: number;
  slug: string;
  title: string;
  subtitle: string | null;
  url: string;
  newsletter_name: string;
  newsletter_url: string;
  content: string | null;
  word_count: number | null;
  is_paywalled: boolean;
  post_date: Date;
  created_at: Date;
  updated_at: Date;
}

/**
 * Newsletter record for tracking subscribed newsletters
 */
export interface NewsletterRecord {
  id: number;
  name: string;
  url: string;
  enabled: boolean;
  last_fetched_at: Date | null;
  created_at: Date;
}

/**
 * Input for creating a new post
 */
export interface CreatePostInput {
  postId: number;
  slug: string;
  title: string;
  subtitle?: string | null;
  url: string;
  newsletterName: string;
  newsletterUrl: string;
  content?: string | null;
  wordCount?: number | null;
  isPaywalled: boolean;
  postDate: string;
}

/**
 * Database configuration
 */
export interface DatabaseConfig {
  /** Whether the database is enabled */
  enabled: boolean;
  /** PostgreSQL connection URL */
  url: string;
}
