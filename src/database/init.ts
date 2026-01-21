/**
 * Database Initialization & Migrations (PostgreSQL)
 *
 * Creates tables and handles schema migrations
 */

import postgres from "postgres";
import type { DatabaseConfig } from "./types.ts";

let sql: ReturnType<typeof postgres> | null = null;

/**
 * Get or create the database connection
 */
export function getDatabase(config: DatabaseConfig): ReturnType<typeof postgres> | null {
  if (!config.enabled || !config.url) {
    return null;
  }

  if (!sql) {
    console.log(`[DB] Connecting to PostgreSQL...`);
    sql = postgres(config.url, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
    });
  }

  return sql;
}

/**
 * Close the database connection
 */
export async function closeDatabase(): Promise<void> {
  if (sql) {
    console.log("[DB] Closing database connection");
    await sql.end();
    sql = null;
  }
}

/**
 * Initialize the database schema
 * Creates all necessary tables if they don't exist
 */
export async function initializeDatabase(config: DatabaseConfig): Promise<boolean> {
  const database = getDatabase(config);

  if (!database) {
    console.log("[DB] Database disabled, skipping initialization");
    return false;
  }

  console.log("[DB] Initializing database schema...");

  try {
    // Create posts table
    await database`
      CREATE TABLE IF NOT EXISTS posts (
        id SERIAL PRIMARY KEY,
        post_id INTEGER NOT NULL UNIQUE,
        slug TEXT NOT NULL,
        title TEXT NOT NULL,
        subtitle TEXT,
        url TEXT NOT NULL UNIQUE,
        newsletter_name TEXT NOT NULL,
        newsletter_url TEXT NOT NULL,
        content TEXT,
        word_count INTEGER,
        is_paywalled BOOLEAN NOT NULL DEFAULT FALSE,
        post_date TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    // Create indexes
    await database`
      CREATE INDEX IF NOT EXISTS idx_posts_post_id ON posts(post_id)
    `;

    await database`
      CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug)
    `;

    await database`
      CREATE INDEX IF NOT EXISTS idx_posts_newsletter ON posts(newsletter_name)
    `;

    await database`
      CREATE INDEX IF NOT EXISTS idx_posts_date ON posts(post_date DESC)
    `;

    // Create newsletters table
    await database`
      CREATE TABLE IF NOT EXISTS newsletters (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        url TEXT NOT NULL UNIQUE,
        enabled BOOLEAN NOT NULL DEFAULT TRUE,
        last_fetched_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    // Create migrations table
    await database`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    console.log("[DB] ✅ Database schema initialized successfully");
    return true;
  } catch (error) {
    console.error("[DB] ❌ Failed to initialize database:", error);
    return false;
  }
}

/**
 * Check if a migration has been applied
 */
export async function isMigrationApplied(
  config: DatabaseConfig,
  migrationName: string
): Promise<boolean> {
  const database = getDatabase(config);
  if (!database) return false;

  const result = await database`
    SELECT id FROM migrations WHERE name = ${migrationName}
  `;

  return result.length > 0;
}

/**
 * Mark a migration as applied
 */
export async function markMigrationApplied(
  config: DatabaseConfig,
  migrationName: string
): Promise<void> {
  const database = getDatabase(config);
  if (!database) return;

  await database`
    INSERT INTO migrations (name) VALUES (${migrationName})
  `;
}

/**
 * Get database statistics
 */
export async function getDatabaseStats(config: DatabaseConfig): Promise<{
  totalPosts: number;
  totalNewsletters: number;
  oldestPost: Date | null;
  newestPost: Date | null;
} | null> {
  const database = getDatabase(config);
  if (!database) return null;

  const [postsCount] = await database`
    SELECT COUNT(*)::int as count FROM posts
  `;

  const [newslettersCount] = await database`
    SELECT COUNT(*)::int as count FROM newsletters
  `;

  const [oldest] = await database`
    SELECT post_date FROM posts ORDER BY post_date ASC LIMIT 1
  `;

  const [newest] = await database`
    SELECT post_date FROM posts ORDER BY post_date DESC LIMIT 1
  `;

  return {
    totalPosts: postsCount?.count ?? 0,
    totalNewsletters: newslettersCount?.count ?? 0,
    oldestPost: oldest?.post_date ?? null,
    newestPost: newest?.post_date ?? null,
  };
}
