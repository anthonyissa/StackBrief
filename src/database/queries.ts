/**
 * Database Queries (PostgreSQL)
 *
 * All CRUD operations for the database
 */

import { getDatabase } from "./init.ts";
import type {
  PostRecord,
  NewsletterRecord,
  CreatePostInput,
  DatabaseConfig,
} from "./types.ts";

// ============================================================================
// Posts Queries
// ============================================================================

/**
 * Check if a post already exists by post_id or slug
 */
export async function postExists(
  config: DatabaseConfig,
  postId: number,
  slug: string
): Promise<boolean> {
  const db = getDatabase(config);
  if (!db) return false;

  const result = await db`
    SELECT id FROM posts WHERE post_id = ${postId} OR slug = ${slug}
  `;

  return result.length > 0;
}

/**
 * Get a post by its Substack post_id
 */
export async function getPostByPostId(
  config: DatabaseConfig,
  postId: number
): Promise<PostRecord | null> {
  const db = getDatabase(config);
  if (!db) return null;

  const [result] = await db<PostRecord[]>`
    SELECT * FROM posts WHERE post_id = ${postId}
  `;

  return result ?? null;
}

/**
 * Get a post by its slug
 */
export async function getPostBySlug(
  config: DatabaseConfig,
  slug: string
): Promise<PostRecord | null> {
  const db = getDatabase(config);
  if (!db) return null;

  const [result] = await db<PostRecord[]>`
    SELECT * FROM posts WHERE slug = ${slug}
  `;

  return result ?? null;
}

/**
 * Create a new post in the database
 */
export async function createPost(
  config: DatabaseConfig,
  input: CreatePostInput
): Promise<PostRecord | null> {
  const db = getDatabase(config);
  if (!db) return null;

  try {
    const [result] = await db<PostRecord[]>`
      INSERT INTO posts (
        post_id, slug, title, subtitle, url,
        newsletter_name, newsletter_url, content,
        word_count, is_paywalled, post_date
      ) VALUES (
        ${input.postId},
        ${input.slug},
        ${input.title},
        ${input.subtitle ?? null},
        ${input.url},
        ${input.newsletterName},
        ${input.newsletterUrl},
        ${input.content ?? null},
        ${input.wordCount ?? null},
        ${input.isPaywalled},
        ${input.postDate}
      )
      RETURNING *
    `;

    return result;
  } catch (error) {
    // Handle unique constraint violation (post already exists)
    if (
      error instanceof Error &&
      error.message.includes("duplicate key")
    ) {
      console.log(`[DB] Post already exists: ${input.slug}`);
      return null;
    }
    throw error;
  }
}

/**
 * Get all posts, optionally filtered by newsletter
 */
export async function getAllPosts(
  config: DatabaseConfig,
  options: {
    newsletterName?: string;
    limit?: number;
    offset?: number;
    orderBy?: "date" | "created";
  } = {}
): Promise<PostRecord[]> {
  const db = getDatabase(config);
  if (!db) return [];

  const { newsletterName, limit = 100, offset = 0, orderBy = "date" } = options;
  const orderColumn = orderBy === "date" ? "post_date" : "created_at";

  if (newsletterName) {
    return db<PostRecord[]>`
      SELECT * FROM posts 
      WHERE newsletter_name = ${newsletterName}
      ORDER BY ${db(orderColumn)} DESC 
      LIMIT ${limit} OFFSET ${offset}
    `;
  }

  return db<PostRecord[]>`
    SELECT * FROM posts 
    ORDER BY ${db(orderColumn)} DESC 
    LIMIT ${limit} OFFSET ${offset}
  `;
}

/**
 * Get recent posts from the last N days
 */
export async function getRecentPosts(
  config: DatabaseConfig,
  days: number = 7
): Promise<PostRecord[]> {
  const db = getDatabase(config);
  if (!db) return [];

  return db<PostRecord[]>`
    SELECT * FROM posts 
    WHERE post_date >= NOW() - INTERVAL '${db.unsafe(days.toString())} days'
    ORDER BY post_date DESC
  `;
}

/**
 * Search posts by title or content
 */
export async function searchPosts(
  config: DatabaseConfig,
  searchTerm: string,
  limit: number = 50
): Promise<PostRecord[]> {
  const db = getDatabase(config);
  if (!db) return [];

  const pattern = `%${searchTerm}%`;

  return db<PostRecord[]>`
    SELECT * FROM posts 
    WHERE title ILIKE ${pattern} 
       OR content ILIKE ${pattern} 
       OR subtitle ILIKE ${pattern}
    ORDER BY post_date DESC
    LIMIT ${limit}
  `;
}

/**
 * Delete a post by its ID
 */
export async function deletePost(config: DatabaseConfig, id: number): Promise<boolean> {
  const db = getDatabase(config);
  if (!db) return false;

  const result = await db`
    DELETE FROM posts WHERE id = ${id}
  `;

  return result.count > 0;
}

/**
 * Count posts, optionally by newsletter
 */
export async function countPosts(
  config: DatabaseConfig,
  newsletterName?: string
): Promise<number> {
  const db = getDatabase(config);
  if (!db) return 0;

  if (newsletterName) {
    const [result] = await db`
      SELECT COUNT(*)::int as count FROM posts WHERE newsletter_name = ${newsletterName}
    `;
    return result?.count ?? 0;
  }

  const [result] = await db`
    SELECT COUNT(*)::int as count FROM posts
  `;
  return result?.count ?? 0;
}

// ============================================================================
// Newsletters Queries
// ============================================================================

/**
 * Get or create a newsletter record
 */
export async function upsertNewsletter(
  config: DatabaseConfig,
  name: string,
  url: string
): Promise<NewsletterRecord | null> {
  const db = getDatabase(config);
  if (!db) return null;

  const [result] = await db<NewsletterRecord[]>`
    INSERT INTO newsletters (name, url)
    VALUES (${name}, ${url})
    ON CONFLICT (name) DO UPDATE SET url = EXCLUDED.url
    RETURNING *
  `;

  return result ?? null;
}

/**
 * Update the last fetched timestamp for a newsletter
 */
export async function updateNewsletterFetchTime(
  config: DatabaseConfig,
  name: string
): Promise<void> {
  const db = getDatabase(config);
  if (!db) return;

  await db`
    UPDATE newsletters SET last_fetched_at = NOW() WHERE name = ${name}
  `;
}

/**
 * Get all newsletters
 */
export async function getAllNewsletters(
  config: DatabaseConfig
): Promise<NewsletterRecord[]> {
  const db = getDatabase(config);
  if (!db) return [];

  return db<NewsletterRecord[]>`
    SELECT * FROM newsletters ORDER BY name
  `;
}

/**
 * Get newsletter by name
 */
export async function getNewsletterByName(
  config: DatabaseConfig,
  name: string
): Promise<NewsletterRecord | null> {
  const db = getDatabase(config);
  if (!db) return null;

  const [result] = await db<NewsletterRecord[]>`
    SELECT * FROM newsletters WHERE name = ${name}
  `;

  return result ?? null;
}
