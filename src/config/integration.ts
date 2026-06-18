/**
 * Integrated-chatbot configuration — single source of truth for the two
 * swappable subsystems the product depends on:
 *
 *   1. AI provider   — which model answers questions ("zai" today, "hermes" later)
 *   2. Messaging     — which channel carries officer escalations
 *                      ("telegram" for the prototype, "whatsapp" for live)
 *
 * Everything is driven from environment variables (see .env.example) so the
 * system stays modular: flip a flag, restart, and a different provider/channel
 * is active. No code changes needed to switch.
 */

export type AiProviderKind = "zai" | "hermes";
export type MessagingChannelKind = "telegram" | "whatsapp";

export interface ZaiConfig {
  baseUrl: string | undefined;
  apiKey: string | undefined;
  model: string;
  timeoutMs: number;
}

export interface HermesConfig {
  baseUrl: string | undefined;
  apiKey: string | undefined;
  model: string;
}

export interface TelegramConfig {
  botToken: string | undefined;
  /** Optional officer group/DM chat id that escalations are pushed to. */
  officerChatId: string | undefined;
  /** Long polling is the dev default; webhook is for production. */
  mode: "polling" | "webhook";
}

export interface WhatsAppConfig {
  phoneNumberId: string | undefined;
  accessToken: string | undefined;
  verifyToken: string | undefined;
}

export interface IntegrationConfig {
  aiProvider: AiProviderKind;
  messagingChannel: MessagingChannelKind;
  zai: ZaiConfig;
  hermes: HermesConfig;
  telegram: TelegramConfig;
  whatsapp: WhatsAppConfig;
}

function oneOf<T extends string>(value: string | undefined, allowed: readonly T[], fallback: T): T {
  const v = (value ?? "").trim().toLowerCase();
  return (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}

/**
 * Reads the live config from process.env. Call this (not the raw env vars) so
 * the rest of the codebase has one typed, validated view of how the system is
 * wired right now.
 */
export function getIntegrationConfig(): IntegrationConfig {
  return {
    aiProvider: oneOf(process.env.AI_PROVIDER, ["zai", "hermes"] as const, "zai"),
    messagingChannel: oneOf(process.env.MESSAGING_CHANNEL, ["telegram", "whatsapp"] as const, "telegram"),
    zai: {
      baseUrl: process.env.LLM_BASE_URL,
      apiKey: process.env.LLM_API_KEY,
      model: process.env.LLM_MODEL ?? "glm-4.6",
      timeoutMs: Number(process.env.LLM_TIMEOUT_MS ?? 30000) || 30000,
    },
    hermes: {
      baseUrl: process.env.HERMES_BASE_URL,
      apiKey: process.env.HERMES_API_KEY,
      model: process.env.HERMES_MODEL ?? "hermes",
    },
    telegram: {
      botToken: process.env.TELEGRAM_BOT_TOKEN,
      officerChatId: process.env.TELEGRAM_OFFICER_CHAT_ID,
      mode: oneOf(process.env.TELEGRAM_MODE, ["polling", "webhook"] as const, "polling"),
    },
    whatsapp: {
      phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
      accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
      verifyToken: process.env.WHATSAPP_VERIFY_TOKEN,
    },
  };
}
