export interface Correspondence {
  id: string;
  userId: string;
  tenantId: string;
  category: import("./language.js").CorrespondenceCategory;
  urgency: import("./language.js").Urgency;
  title: string;
  body: string;
  channels: import("./language.js").DeliveryChannel[];
  language: import("./language.js").Language;
  createdAt: string;
  viewedAt?: string;
  actionTakenAt?: string;
}

export interface VulnerabilityProfile {
  userId: string;
  tier: import("./language.js").VulnerabilityTier;
  signals: VulnerabilitySignal[];
  lastAssessed: string;
}

export interface VulnerabilitySignal {
  type: "login_failure" | "idle_time" | "bounce" | "age" | "declared_disability";
  value: string;
  detectedAt: string;
}

export interface ProxyRelationship {
  id: string;
  principalUserId: string;
  proxyUserId: string;
  relationshipType: "family" | "caregiver" | "coordinator";
  grantedAt: string;
  expiresAt?: string;
  permissions: string[];
}
