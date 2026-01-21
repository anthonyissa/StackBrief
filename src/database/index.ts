/**
 * Database Module - SQLite storage for StackBrief
 *
 * Uses Bun's built-in SQLite for fast, zero-dependency database operations.
 *
 * Usage:
 * ```typescript
 * import { initializeDatabase, postExists, createPost } from './database';
 *
 * // Initialize on startup
 * initializeDatabase(config.database);
 *
 * // Check if post exists
 * const exists = postExists(config.database, postId, slug);
 *
 * // Create a new post
 * createPost(config.database, { postId, slug, title, ... });
 * ```
 */

// Initialization & Connection
export {
  getDatabase,
  closeDatabase,
  initializeDatabase,
  getDatabaseStats,
  isMigrationApplied,
  markMigrationApplied,
} from "./init.ts";

// Post Queries
export {
  postExists,
  getPostByPostId,
  getPostBySlug,
  createPost,
  getAllPosts,
  getRecentPosts,
  searchPosts,
  deletePost,
  countPosts,
} from "./queries.ts";

// Newsletter Queries
export {
  upsertNewsletter,
  updateNewsletterFetchTime,
  getAllNewsletters,
  getNewsletterByName,
} from "./queries.ts";

// Types
export type {
  PostRecord,
  NewsletterRecord,
  CreatePostInput,
  DatabaseConfig,
} from "./types.ts";
