/**
 * Test script to verify the Substack API implementation
 * Run with: bun run src/test.ts
 */

import { Newsletter, Post } from "./substack-api/index.ts";

const TEST_NEWSLETTER_URL = "https://moneyradar.substack.com";

async function testNewsletter() {
  console.log("=".repeat(60));
  console.log("Testing Newsletter class");
  console.log("=".repeat(60));

  const newsletter = new Newsletter(TEST_NEWSLETTER_URL);
  console.log(`\n📰 Newsletter: ${newsletter.url}\n`);

  // Test: Get posts metadata (faster, doesn't create Post objects)
  console.log("--- Fetching latest 3 posts metadata ---");
  try {
    const postsMetadata = await newsletter.getPostsMetadata("new", 3);
    console.log(`✅ Found ${postsMetadata.length} posts\n`);

    for (const post of postsMetadata) {
      console.log(`  📝 Title: ${post.title}`);
      console.log(`     Slug: ${post.slug}`);
      console.log(`     Date: ${post.post_date}`);
      console.log(`     Audience: ${post.audience}`);
      console.log(`     URL: ${post.canonical_url}`);
      console.log("");
    }
  } catch (error) {
    console.error("❌ Error fetching posts metadata:", error);
  }

  // Test: Search posts
  console.log("--- Searching for posts ---");
  try {
    const searchResults = await newsletter.getPostsMetadata("new", 2);
    console.log(`✅ Search returned ${searchResults.length} results\n`);
  } catch (error) {
    console.error("❌ Error searching posts:", error);
  }

  // Test: Get authors
  console.log("--- Fetching authors ---");
  try {
    const authors = await newsletter.getAuthors();
    console.log(`✅ Found ${authors.length} author(s)\n`);
    for (const author of authors) {
      console.log(`  👤 ${author.name} (@${author.handle || "N/A"})`);
    }
    console.log("");
  } catch (error) {
    console.error("❌ Error fetching authors:", error);
  }

  return newsletter;
}

async function testPost(postUrl: string) {
  console.log("=".repeat(60));
  console.log("Testing Post class");
  console.log("=".repeat(60));

  const post = new Post(postUrl);
  console.log(`\n📄 Post URL: ${post.url}`);
  console.log(`   Base URL: ${post.baseUrl}`);
  console.log(`   Slug: ${post.slug}\n`);

  // Test: Get metadata
  console.log("--- Fetching post metadata ---");
  try {
    const metadata = await post.getMetadata();
    console.log(`✅ Post metadata retrieved\n`);
    console.log(`  Title: ${metadata.title}`);
    console.log(`  Subtitle: ${metadata.subtitle || "N/A"}`);
    console.log(`  Date: ${metadata.post_date}`);
    console.log(`  Audience: ${metadata.audience}`);
    console.log(`  Word count: ${metadata.wordcount || "N/A"}`);
    console.log(`  Comments: ${metadata.comment_count || 0}`);
    console.log("");
  } catch (error) {
    console.error("❌ Error fetching post metadata:", error);
  }

  // Test: Check if paywalled
  console.log("--- Checking paywall status ---");
  try {
    const isPaywalled = await post.isPaywalled();
    console.log(`✅ Paywalled: ${isPaywalled ? "Yes 🔒" : "No 🔓"}\n`);
  } catch (error) {
    console.error("❌ Error checking paywall:", error);
  }

  // Test: Get HTML content
  console.log("--- Fetching post HTML content ---");
  try {
    const content = await post.getContent();
    if (content) {
      console.log(`✅ HTML content retrieved (${content.length} characters)\n`);
    } else {
      console.log("⚠️  No content available (may be paywalled)\n");
    }
  } catch (error) {
    console.error("❌ Error fetching HTML content:", error);
  }

  // Test: Get clean text content
  console.log("--- Fetching post as CLEAN TEXT ---");
  try {
    const textContent = await post.getTextContent();
    if (textContent) {
      const previewLength = 1000;
      const preview = textContent.slice(0, previewLength);
      console.log(`✅ Text content retrieved (${textContent.length} characters)\n`);
      console.log(`  Preview (first ${previewLength} chars):`);
      console.log("  " + "-".repeat(50));
      console.log(preview);
      console.log("  " + "-".repeat(50));
      console.log("");
    } else {
      console.log("⚠️  No content available (may be paywalled)\n");
    }
  } catch (error) {
    console.error("❌ Error fetching text content:", error);
  }
}

async function main() {
  console.log("\n🚀 Starting Substack API Tests\n");
  console.log(`Testing with: ${TEST_NEWSLETTER_URL}\n`);

  try {
    // Test Newsletter
    const newsletter = await testNewsletter();

    // Get first post URL for Post test
    const postsMetadata = await newsletter.getPostsMetadata("new", 1);
    if (postsMetadata.length > 0) {
      await testPost(postsMetadata[0].canonical_url);
    }

    console.log("=".repeat(60));
    console.log("✅ All tests completed!");
    console.log("=".repeat(60));
  } catch (error) {
    console.error("\n❌ Test failed with error:", error);
    process.exit(1);
  }
}

main();
