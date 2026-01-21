# StackBrief - Substack Newsletter Aggregator & Digest

**StackBrief** is an automated newsletter aggregator that monitors your favorite Substack newsletters, generates AI-powered summaries, and delivers digest notifications via Telegram. Never miss important insights from your subscribed newsletters.

## 🚀 Features

- **Automated Monitoring**: Continuously tracks multiple Substack newsletters for new posts
- **AI-Powered Summaries**: Uses OpenAI GPT to generate concise bullet-point summaries with key insights
- **Telegram Notifications**: Receive instant digest notifications on Telegram
- **PostgreSQL Storage**: Stores all posts with full-text search capabilities
- **Duplicate Detection**: Automatically skips posts you've already seen
- **Paywall Support**: Access paywalled content with authentication cookies

## 📋 Quick Start

### Prerequisites

- [Bun](https://bun.sh) runtime
- PostgreSQL database (optional)
- Telegram Bot Token (optional, for notifications)
- OpenAI API Key (optional, for AI summaries)

### Installation

```bash
git clone https://github.com/yourusername/stackbrief.git
cd stackbrief
bun install
```

### Configuration

1. Set environment variables:

```bash
export DATABASE_URL="postgresql://user:password@localhost:5432/stackbrief"
export TELEGRAM_BOT_TOKEN="your_bot_token"
export TELEGRAM_CHAT_ID="your_chat_id"
export OPENAI_API_KEY="your_openai_key"
```

2. Configure newsletters in `src/config.ts`:

```typescript
export const config: AppConfig = {
  substacks: [
    {
      name: "Your Newsletter",
      url: "https://newsletter.substack.com",
      enabled: true,
    },
  ],
  // ...
};
```

### Run

```bash
# Run once (for cron jobs)
bun run start:once

# Run continuously with scheduler
bun run start
```

## 🎯 Use Cases

- **Newsletter Digest**: Aggregate multiple Substack newsletters into daily/weekly digests
- **Content Monitoring**: Track competitors, industry news, or research publications
- **AI Summarization**: Automatically summarize long-form newsletter content
- **Telegram Bot**: Build a personal newsletter bot for Telegram

## 🔧 Tech Stack

- **Runtime**: Bun
- **Database**: PostgreSQL
- **AI**: OpenAI GPT-4
- **Notifications**: Telegram Bot API
- **Language**: TypeScript

## 📝 License

MIT

---

**Keywords**: Substack newsletter aggregator, newsletter monitor, newsletter digest, AI newsletter summaries, Telegram newsletter bot, Substack automation, newsletter tracker, RSS alternative
