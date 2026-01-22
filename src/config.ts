/**
 * StackBrief Configuration
 *
 * Add all the Substack newsletters you want to monitor here.
 */

export interface SubstackConfig {
  /** Name/identifier for this newsletter */
  name: string;
  /** Full URL of the Substack newsletter */
  url: string;
  /** Whether this newsletter is enabled for monitoring */
  enabled: boolean;
}

export interface AppConfig {
  /** List of Substack newsletters to monitor */
  substacks: SubstackConfig[];

  /** Cron schedule (in minutes) - how often to check for new posts */
  cronIntervalMinutes: number;

  /** Maximum number of posts to fetch per newsletter per run */
  postsPerNewsletter: number;

  /** Telegram configuration */
  telegram: {
    enabled: boolean;
    botToken: string;
    chatId: string;
  };

  /** Database configuration */
  database: {
    enabled: boolean;
    url: string;
  };

  /** OpenAI configuration */
  openai: {
    enabled: boolean;
    apiKey: string;
    model: string;
    maxTokens: number;
    temperature: number;
  };
}

/**
 * Main application configuration
 * Add your Substack newsletters here!
 */
export const config: AppConfig = {
  substacks: [
    {
      name: "MoneyRadar",
      url: "https://moneyradar.substack.com",
      enabled: true,
    },
    {
      name: "Coinmetrics",
      url: "https://coinmetrics.substack.com",
      enabled: true,
    },
    {
      name: "Posthog",
      url: "https://newsletter.posthog.com/",
      enabled: true,
    },
    {
      name: "AlphaPacked",
      url: "https://alphapacked.com/",
      enabled: true,
    },
    // Add more substacks here:
    // {
    //   name: "Example Newsletter",
    //   url: "https://example.substack.com",
    //   enabled: true,
    // },
  ],

  // Check for new posts every 30 minutes
  cronIntervalMinutes: 30,

  // Fetch up to 5 latest posts per newsletter
  postsPerNewsletter: 5,

  // Telegram notifications
  telegram: {
    enabled: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
    botToken: process.env.TELEGRAM_BOT_TOKEN ?? "",
    chatId: process.env.TELEGRAM_CHAT_ID ?? "",
  },

  // Database storage (PostgreSQL)
  database: {
    enabled: Boolean(process.env.DATABASE_URL),
    url: process.env.DATABASE_URL ?? "",
  },

  // OpenAI for AI-powered summaries
  openai: {
    enabled: Boolean(process.env.OPENAI_API_KEY),
    apiKey: process.env.OPENAI_API_KEY ?? "",
    model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
    maxTokens: 500,
    temperature: 0.3,
  },
};
