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

### 🚀 Quick Setup with Cursor

![Install StackBrief in Cursor](cursor://anysphere.cursor-deeplink/prompt?text=Install%20and%20run%20StackBrief.%20Step%201%3A%20Clone%20the%20repository%20using%20git%20clone(https://github.com/anthonyissa/StackBrief).%20Step%202%3A%20Run%20bun%20install%20to%20install%20dependencies.%20Step%203%3A%20Create%20an%20env%20file%20with%20optional%20environment%20variables%20DATABASE_URL%2C%20TELEGRAM_BOT_TOKEN%2C%20TELEGRAM_CHAT_ID%2C%20and%20OPENAI_API_KEY.%20Step%204%3A%20Configure%20at%20least%20one%20newsletter%20in%20src%2Fconfig.ts%20by%20adding%20a%20SubstackConfig%20object%20to%20the%20substacks%20array%20with%20name%2C%20url%2C%20and%20enabled%20set%20to%20true.%20Step%205%3A%20Run%20bun%20run%20start%3Aonce%20to%20test%20or%20bun%20run%20start%20to%20run%20continuously.%20Verify%20the%20app%20can%20fetch%20posts%20from%20configured%20newsletters.)


<a href="cursor://anysphere.cursor-deeplink/prompt?text=How%20does%20this%20project%20work%3F" class="inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium text-sm outline-none transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&amp;_svg:not([class*='size-'])]:size-4 [&amp;_svg]:pointer-events-none [&amp;_svg]:shrink-0 bg-secondary text-secondary-foreground hover:bg-secondary/80 h-9 px-4 py-2 has-[&gt;svg]:px-3 flex items-center gap-2" data-slot="button"><svg fill="none" height="22" width="22" viewBox="0 0 22 22"><title class="sr-only">Cursor Logo</title><g clip-path="url(#a)" fill="currentColor"><path d="M19.162 5.452 10.698.565a.88.88 0 0 0-.879 0L1.356 5.452a.74.74 0 0 0-.37.64v9.853a.74.74 0 0 0 .37.64l8.464 4.887a.879.879 0 0 0 .879 0l8.464-4.886a.74.74 0 0 0 .37-.64V6.091a.74.74 0 0 0-.37-.64Zm-.531 1.035L10.46 20.639c-.055.095-.201.056-.201-.055v-9.266a.52.52 0 0 0-.26-.45L1.975 6.237c-.096-.056-.057-.202.054-.202h16.34c.233 0 .378.252.262.453Zm11.057-.555h3.602v1.984h-3.48c-1.877 0-3.342 1.083-3.342 3.372 0 2.29 1.465 3.373 3.342 3.373h3.48v1.984h-3.754c-3.144 0-5.372-1.847-5.372-5.356 0-3.51 2.38-5.357 5.524-5.357Zm5.432 0h2.227v6.546c0 1.633.748 2.396 2.503 2.396 1.755 0 2.503-.763 2.503-2.396V5.932h2.228v7.004c0 2.38-1.511 3.892-4.731 3.892-3.22 0-4.73-1.526-4.73-3.907v-6.99Zm21.106 3.036c0 1.19-.687 2.106-1.602 2.503v.03c.961.138 1.45.825 1.465 1.756l.045 3.388h-2.228l-.045-3.022c-.015-.671-.412-1.083-1.206-1.083h-3.708v4.105h-2.228V5.932h6.15c2.014 0 3.357 1.022 3.357 3.037Zm-2.243.306c0-.916-.489-1.42-1.404-1.42h-3.632v2.839h3.662c.84 0 1.374-.504 1.374-1.42Zm10.67 4.242c0-.763-.489-1.083-1.221-1.144l-2.472-.229c-2.137-.198-3.251-1.038-3.251-3.068 0-2.03 1.374-3.143 3.342-3.143h5.463v1.922h-5.31c-.763 0-1.252.397-1.252 1.16 0 .763.504 1.13 1.267 1.19l2.518.214c1.908.168 3.159 1.038 3.159 3.083s-1.328 3.144-3.205 3.144h-5.707v-1.923h5.494c.717 0 1.175-.488 1.175-1.205Zm8.751-7.768c3.357 0 5.479 2.152 5.479 5.524 0 3.373-2.213 5.555-5.57 5.555-3.358 0-5.479-2.182-5.479-5.555 0-3.372 2.213-5.524 5.57-5.524Zm3.174 5.54c0-2.26-1.312-3.587-3.22-3.587-1.908 0-3.22 1.328-3.22 3.587 0 2.258 1.312 3.585 3.22 3.585 1.908 0 3.22-1.327 3.22-3.585Zm13.362-2.32c0 1.19-.686 2.106-1.602 2.503v.03c.962.138 1.45.825 1.465 1.756l.046 3.388h-2.228l-.045-3.022c-.016-.671-.413-1.083-1.206-1.083h-3.71v4.105h-2.227V5.932h6.15c2.014 0 3.357 1.022 3.357 3.037Zm-2.242.306c0-.916-.489-1.42-1.404-1.42h-3.632v2.839h3.662c.839 0 1.374-.504 1.374-1.42Z"></path></g></svg><span>Try in Cursor</span></a>

### Manual Installation

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

## 🚢 Deploy

Deploy StackBrief to Railway with one click. The template includes PostgreSQL database and all necessary configurations.

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/deploy/eDkVFP?referralCode=MBiqSi&utm_medium=integration&utm_source=template&utm_campaign=generic)

After deployment, configure your environment variables in Railway:
- `DATABASE_URL` - Automatically provided by Railway PostgreSQL service
- `TELEGRAM_BOT_TOKEN` - Your Telegram bot token
- `TELEGRAM_CHAT_ID` - Your Telegram chat ID
- `OPENAI_API_KEY` - Your OpenAI API key

Then update `src/config.ts` with your newsletter configurations.

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
