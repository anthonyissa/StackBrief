/**
 * StackBrief Engine
 *
 * Main entry point that:
 * - Monitors configured Substack newsletters
 * - Fetches new posts on a schedule
 * - Checks for duplicates (placeholder)
 * - Sends notifications via Telegram
 */

import { Newsletter, Post } from "./substack-api/index.ts";
import { config, type SubstackConfig } from "./config.ts";
import type { PostMetadata } from "./substack-api/types.ts";
import {
  createTelegramClient,
  type TelegramClient,
  type DigestItem,
} from "./telegram/index.ts";
import {
  initializeDatabase,
  closeDatabase,
  postExists,
  createPost,
  upsertNewsletter,
  updateNewsletterFetchTime,
  getDatabaseStats,
} from "./database/index.ts";
import {
  createOpenAIClient,
  type OpenAIClient,
} from "./openai/index.ts";
import { tagPaidAdvertisementSentences } from "./text/advertisement.ts";

// Initialize clients
const telegramClient: TelegramClient = createTelegramClient(config.telegram);
const openaiClient: OpenAIClient = createOpenAIClient(config.openai);

// ============================================================================
// Types
// ============================================================================

export interface ProcessedPost {
  newsletterName: string;
  newsletterUrl: string;
  postId: number;
  slug: string;
  title: string;
  subtitle?: string;
  url: string;
  date: string;
  content: string | null;
  wordCount?: number;
  isPaywalled: boolean;
}

// ============================================================================
// Database Functions
// ============================================================================

/**
 * Check if a post already exists in the database.
 *
 * @param postId - The unique post ID from Substack
 * @param slug - The post slug
 * @returns true if post already exists, false otherwise
 */
async function isPostAlreadyProcessed(postId: number, slug: string): Promise<boolean> {
  if (!config.database.enabled) {
    console.log(`  [DB] Database disabled - assuming post is NEW`);
    return false;
  }

  const exists = await postExists(config.database, postId, slug);
  console.log(
    `  [DB] Post ${slug}: ${exists ? "already exists ⏭️" : "NEW ✨"}`
  );
  return exists;
}

/**
 * Save a processed post to the database.
 *
 * @param post - The processed post data to save
 */
async function savePostToDatabase(post: ProcessedPost): Promise<void> {
  if (!config.database.enabled) {
    console.log(`  [DB] Database disabled - skipping save`);
    return;
  }

  const result = await createPost(config.database, {
    postId: post.postId,
    slug: post.slug,
    title: post.title,
    subtitle: post.subtitle,
    url: post.url,
    newsletterName: post.newsletterName,
    newsletterUrl: post.newsletterUrl,
    content: post.content,
    wordCount: post.wordCount,
    isPaywalled: post.isPaywalled,
    postDate: post.date,
  });

  if (result) {
    console.log(`  [DB] 💾 Saved to database (id: ${result.id})`);
  } else {
    console.log(`  [DB] ⚠️ Failed to save (may already exist)`);
  }
}

// ============================================================================
// Telegram Notification Functions
// ============================================================================

/**
 * Generate a fallback digest item without AI
 */
function generateFallbackBulletPoints(post: ProcessedPost): string[] {
  const contentPreview = post.content
    ? post.content.slice(0, 500).trim()
    : "No content available";

  // Split into pseudo bullet points (sentences or chunks)
  const sentences = contentPreview
    .split(/[.!?]\s+/)
    .filter((s) => s.length > 20)
    .slice(0, 3)
    .map((s) => s.trim() + (s.endsWith(".") ? "" : "..."));

  return sentences.length > 0
    ? sentences
    : [post.subtitle || contentPreview.slice(0, 150) + "..."];
}

/**
 * Convert a ProcessedPost to a DigestItem for Telegram
 * Uses AI to generate bullet points if enabled
 */
async function postToDigestItem(post: ProcessedPost): Promise<DigestItem> {
  let bulletPoints: string[];

  // Use AI summarization if available
  if (openaiClient.isEnabled() && post.content) {
    console.log(`  [AI] Generating summary for: "${post.title}"`);

    const result = await openaiClient.summarize({
      title: post.title,
      subtitle: post.subtitle,
      content: post.content,
      newsletterName: post.newsletterName,
    });

    if (result.success && result.bulletPoints.length > 0) {
      bulletPoints = result.bulletPoints;
      console.log(`  [AI] ✅ Generated ${bulletPoints.length} bullet points`);
    } else {
      console.log(`  [AI] ⚠️ Fallback to basic extraction: ${result.error}`);
      bulletPoints = generateFallbackBulletPoints(post);
    }
  } else {
    // Fallback without AI
    if (!openaiClient.isEnabled()) {
      console.log(`  [AI] OpenAI disabled - using basic extraction`);
    }
    bulletPoints = generateFallbackBulletPoints(post);
  }

  // Tag paid-ad looking sentences inside each bullet point.
  bulletPoints = bulletPoints.map((point) => tagPaidAdvertisementSentences(point));

  return {
    newsletterName: post.newsletterName,
    title: post.title,
    url: post.url,
    bulletPoints,
    date: new Date(post.date).toLocaleDateString("fr-FR"),
  };
}

/**
 * Send a notification to Telegram about a new post.
 *
 * @param post - The processed post to notify about
 */
async function sendTelegramNotification(post: ProcessedPost): Promise<void> {
  if (!telegramClient.isEnabled()) {
    console.log(`  [TG] 📱 Telegram disabled - skipping notification`);
    return;
  }

  console.log(`  [TG] 📱 Sending Telegram notification: "${post.title}"`);

  const digestItem = await postToDigestItem(post);
  const result = await telegramClient.sendDigestItem(digestItem);

  if (result.success) {
    console.log(`  [TG] ✅ Notification sent (ID: ${result.messageId})`);
  } else {
    console.error(`  [TG] ❌ Failed to send: ${result.error}`);
  }
}

/**
 * Send a combined digest of all new posts at the end of a job run.
 */
async function sendDigestSummary(posts: ProcessedPost[]): Promise<void> {
  if (!telegramClient.isEnabled() || posts.length === 0) {
    return;
  }

  console.log(`\n[TG] 📋 Sending combined digest of ${posts.length} posts...`);

  const digestItems = await Promise.all(posts.map(postToDigestItem));
  const result = await telegramClient.sendCombinedDigest(
    digestItems,
    `StackBrief - ${posts.length} nouveau(x) article(s)`
  );

  if (result.success) {
    console.log(`[TG] ✅ Digest sent successfully`);
  } else {
    console.error(`[TG] ❌ Failed to send digest: ${result.error}`);
  }
}

// ============================================================================
// Core Engine Functions
// ============================================================================

/**
 * Process a single post: fetch content and prepare for storage/notification.
 */
async function processPost(
  metadata: PostMetadata,
  substackConfig: SubstackConfig
): Promise<ProcessedPost | null> {
  const { name: newsletterName, url: newsletterUrl } = substackConfig;

  console.log(`\n  Processing: "${metadata.title}"`);

  // Check if we already have this post
  const alreadyProcessed = await isPostAlreadyProcessed(metadata.id, metadata.slug);

  if (alreadyProcessed) {
    return null;
  }

  // Fetch the full post content
  const post = new Post(metadata.canonical_url);
  const content = await post.getTextContent();
  const isPaywalled = metadata.audience === "only_paid";

  const processedPost: ProcessedPost = {
    newsletterName,
    newsletterUrl,
    postId: metadata.id,
    slug: metadata.slug,
    title: metadata.title,
    subtitle: metadata.subtitle,
    url: metadata.canonical_url,
    date: metadata.post_date,
    content,
    wordCount: metadata.wordcount,
    isPaywalled,
  };

  console.log(`  ✅ Fetched content (${content?.length || 0} chars)`);

  // Save to database
  await savePostToDatabase(processedPost);

  // Send notification
  await sendTelegramNotification(processedPost);

  return processedPost;
}

/**
 * Process a single newsletter: fetch recent posts and process new ones.
 */
async function processNewsletter(
  substackConfig: SubstackConfig
): Promise<ProcessedPost[]> {
  const { name, url, enabled } = substackConfig;

  if (!enabled) {
    console.log(`\n⏭️  Skipping ${name} (disabled)`);
    return [];
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log(`📰 Processing newsletter: ${name}`);
  console.log(`   URL: ${url}`);
  console.log("=".repeat(60));

  // Register/update newsletter in database
  if (config.database.enabled) {
    await upsertNewsletter(config.database, name, url);
  }

  try {
    const newsletter = new Newsletter(url);
    const postsMetadata = await newsletter.getPostsMetadata(
      "new",
      config.postsPerNewsletter
    );

    console.log(`Found ${postsMetadata.length} recent posts`);

    const processedPosts: ProcessedPost[] = [];

    for (const metadata of postsMetadata) {
      const processed = await processPost(metadata, substackConfig);
      if (processed) {
        processedPosts.push(processed);
      }
    }

    // Update last fetched time
    if (config.database.enabled) {
      await updateNewsletterFetchTime(config.database, name);
    }

    console.log(`\n✅ Processed ${processedPosts.length} new posts from ${name}`);
    return processedPosts;
  } catch (error) {
    console.error(`\n❌ Error processing ${name}:`, error);
    return [];
  }
}

/**
 * Main job that runs on schedule: process all configured newsletters.
 */
export async function runJob(): Promise<void> {
  const startTime = Date.now();

  console.log("\n" + "🚀".repeat(30));
  console.log(`\n⏰ StackBrief Job Started at ${new Date().toISOString()}`);
  console.log(`   Monitoring ${config.substacks.length} newsletter(s)`);
  console.log("\n" + "🚀".repeat(30));

  const allProcessedPosts: ProcessedPost[] = [];

  for (const substackConfig of config.substacks) {
    const posts = await processNewsletter(substackConfig);
    allProcessedPosts.push(...posts);
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  // Get database stats
  const dbStats = config.database.enabled
    ? await getDatabaseStats(config.database)
    : null;

  console.log("\n" + "=".repeat(60));
  console.log("📊 JOB SUMMARY");
  console.log("=".repeat(60));
  console.log(`   Total newsletters processed: ${config.substacks.length}`);
  console.log(`   Total new posts found: ${allProcessedPosts.length}`);
  console.log(`   Database enabled: ${config.database.enabled ? "Yes ✅" : "No ❌"}`);
  if (dbStats) {
    console.log(`   Total posts in DB: ${dbStats.totalPosts}`);
  }
  console.log(`   OpenAI enabled: ${openaiClient.isEnabled() ? "Yes ✅" : "No ❌"}`);
  console.log(`   Telegram enabled: ${telegramClient.isEnabled() ? "Yes ✅" : "No ❌"}`);
  console.log(`   Duration: ${duration}s`);
  console.log(`   Next run in: ${config.cronIntervalMinutes} minutes`);
  console.log("=".repeat(60) + "\n");
}

// ============================================================================
// Cron Scheduler
// ============================================================================

let cronInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Start the cron job scheduler.
 */
export async function startCron(): Promise<void> {
  const intervalMs = config.cronIntervalMinutes * 60 * 1000;

  console.log(`\n🕐 Starting StackBrief cron scheduler`);
  console.log(`   Interval: every ${config.cronIntervalMinutes} minutes`);
  console.log(`   Newsletters: ${config.substacks.filter((s) => s.enabled).length} enabled`);
  console.log(`   Database: ${config.database.enabled ? "enabled ✅" : "disabled ❌"}`);
  console.log(`   OpenAI: ${openaiClient.isEnabled() ? `enabled ✅ (${config.openai.model})` : "disabled ❌"}`);
  console.log(`   Telegram: ${telegramClient.isEnabled() ? "enabled ✅" : "disabled ❌"}`);

  // Initialize database
  if (config.database.enabled) {
    await initializeDatabase(config.database);
  }

  // Run immediately on start
  await runJob();

  // Then run on schedule
  cronInterval = setInterval(() => {
    runJob();
  }, intervalMs);

  console.log(`\n✅ Cron scheduler started. Press Ctrl+C to stop.\n`);
}

/**
 * Stop the cron job scheduler.
 */
export function stopCron(): void {
  if (cronInterval) {
    clearInterval(cronInterval);
    cronInterval = null;
    console.log("\n🛑 Cron scheduler stopped.\n");
  }
}

// ============================================================================
// Main Entry Point
// ============================================================================

// Run if executed directly
if (import.meta.main) {
  // Handle graceful shutdown
  process.on("SIGINT", async () => {
    console.log("\n\n👋 Shutting down StackBrief...");
    stopCron();
    await closeDatabase();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    stopCron();
    await closeDatabase();
    process.exit(0);
  });

  // Start the engine
  await startCron();
}
