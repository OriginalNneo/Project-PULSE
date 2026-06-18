export type Language = "en" | "zh" | "ms" | "ta" | "hi" | "ml" | "pa";

export type ChineseDialect = "zh-hok" | "zh-can" | "zh-teo" | "zh-hak" | "zh-hai";
export type MalayVariety = "ms-bms" | "ms-joh" | "ms-boy" | "ms-jav";
export type IndianVariety = "ta-sin" | "ta-spo" | "ml" | "pa" | "hi";

export type Dialect = ChineseDialect | MalayVariety | IndianVariety;

export type VulnerabilityTier = "self-service" | "guided" | "high-touch";

export type CorrespondenceCategory = "tax" | "health" | "housing" | "employment" | "legal";

export type Urgency = "normal" | "high" | "critical";

export type DeliveryChannel = "physical" | "sms" | "voice" | "email" | "in-app";
