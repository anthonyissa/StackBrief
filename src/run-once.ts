/**
 * StackBrief - Single Run Script
 *
 * Executes the StackBrief job once without starting the cron scheduler.
 * Perfect for:
 * - Production deployments (run via cron/systemd)
 * - Manual testing
 * - CI/CD pipelines
 * - One-off data fetching
 *
 * Usage:
 *   bun run job
 *   OR
 *   bun run src/run-once.ts
 *
 * Environment Variables Required:
 *   - DATABASE_URL (PostgreSQL connection string)
 *   - TELEGRAM_BOT_TOKEN (optional, for notifications)
 *   - TELEGRAM_CHAT_ID (optional, for notifications)
 *   - OPENAI_API_KEY (optional, for AI summaries)
 */

import { runJob } from "./engine.ts";
import { config } from "./config.ts";
import {
  initializeDatabase,
  closeDatabase,
  getDatabaseStats,
} from "./database/index.ts";
import {
  createTelegramClient,
  type TelegramClient,
} from "./telegram/index.ts";
import {
  createOpenAIClient,
  type OpenAIClient,
} from "./openai/index.ts";

// ============================================================================
// Initialization
// ============================================================================

const startTime = Date.now();

console.log("\n" + "=".repeat(60));
console.log("🚀 StackBrief - Single Run");
console.log("=".repeat(60));
console.log(`   Started at: ${new Date().toISOString()}`);
console.log(`   Mode: Single execution (no cron)`);
console.log("=".repeat(60) + "\n");

// Display configuration status
console.log("📋 Configuration Status:");
console.log(`   Newsletters: ${config.substacks.filter((s) => s.enabled).length} enabled / ${config.substacks.length} total`);
console.log(`   Posts per newsletter: ${config.postsPerNewsletter}`);
console.log(`   Database: ${config.database.enabled ? "✅ Enabled" : "❌ Disabled"}`);
console.log(`   OpenAI: ${config.openai.enabled ? `✅ Enabled (${config.openai.model})` : "❌ Disabled"}`);
console.log(`   Telegram: ${config.telegram.enabled ? "✅ Enabled" : "❌ Disabled"}`);
console.log("");

// Initialize clients to check their status
const telegramClient: TelegramClient = createTelegramClient(config.telegram);
const openaiClient: OpenAIClient = createOpenAIClient(config.openai);

// ============================================================================
// Database Initialization
// ============================================================================

if (config.database.enabled) {
  console.log("[DB] Initializing PostgreSQL database connection...");
  console.log(`[DB] Connection URL: ${config.database.url.replace(/:[^:@]+@/, ":****@")}`); // Hide password

  const dbInitialized = await initializeDatabase(config.database);

  if (dbInitialized) {
    // Display database stats
    const dbStats = await getDatabaseStats(config.database);
    if (dbStats) {
      console.log(`[DB] ✅ Connected successfully`);
      console.log(`[DB]    Total posts in database: ${dbStats.totalPosts}`);
      console.log(`[DB]    Total newsletters tracked: ${dbStats.totalNewsletters}`);
      if (dbStats.oldestPost) {
        console.log(`[DB]    Oldest post: ${new Date(dbStats.oldestPost).toLocaleDateString()}`);
      }
      if (dbStats.newestPost) {
        console.log(`[DB]    Newest post: ${new Date(dbStats.newestPost).toLocaleDateString()}`);
      }
    }
  } else {
    console.error("[DB] ❌ Failed to initialize database");
    console.error("[DB]    Check your DATABASE_URL and database permissions");
    process.exit(1);
  }
} else {
  console.log("[DB] ⚠️  Database disabled - posts will not be saved");
  console.log("[DB]    Set DATABASE_URL environment variable to enable");
}

console.log("");

// ============================================================================
// Service Status Check
// ============================================================================

console.log("🔍 Service Status:");
console.log(`   Telegram: ${telegramClient.isEnabled() ? "✅ Ready" : "⚠️  Disabled (no notifications will be sent)"}`);
if (!telegramClient.isEnabled()) {
  console.log(`      → Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID to enable`);
}

console.log(`   OpenAI: ${openaiClient.isEnabled() ? "✅ Ready" : "⚠️  Disabled (using basic extraction)"}`);
if (!openaiClient.isEnabled()) {
  console.log(`      → Set OPENAI_API_KEY to enable AI-powered summaries`);
}

console.log("");

// ============================================================================
// Execute Job
// ============================================================================

try {
  console.log("▶️  Starting job execution...\n");

  await runJob();

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log("\n" + "=".repeat(60));
  console.log("✅ Job Completed Successfully");
  console.log("=".repeat(60));
  console.log(`   Total execution time: ${duration}s`);
  console.log("=".repeat(60) + "\n");
} catch (error) {
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.error("\n" + "=".repeat(60));
  console.error("❌ Job Failed");
  console.error("=".repeat(60));
  console.error(`   Error: ${error instanceof Error ? error.message : String(error)}`);
  console.error(`   Duration before failure: ${duration}s`);
  console.error("=".repeat(60) + "\n");

  // Log stack trace in development
  if (error instanceof Error && error.stack) {
    console.error("Stack trace:");
    console.error(error.stack);
  }

  process.exit(1);
} finally {
  // ============================================================================
  // Cleanup
  // ============================================================================

  console.log("🧹 Cleaning up resources...");

  // Close database connection
  if (config.database.enabled) {
    await closeDatabase();
    console.log("[DB] ✅ Database connection closed");
  }

  console.log("✅ Cleanup complete\n");
}
