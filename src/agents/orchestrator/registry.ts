import type { AgentRegistration, CorrespondenceCategory, Language, Dialect } from "./types.js";

class AgentRegistry {
  private agents = new Map<string, AgentRegistration>();

  register(agent: AgentRegistration) {
    this.agents.set(agent.name, agent);
  }

  unregister(name: string) {
    this.agents.delete(name);
  }

  get(name: string): AgentRegistration | undefined {
    return this.agents.get(name);
  }

  getAll(): AgentRegistration[] {
    return Array.from(this.agents.values());
  }

  findByDomain(domain: CorrespondenceCategory): AgentRegistration[] {
    return this.getAll().filter(
      (a) => a.type === "domain" && a.domains?.includes(domain),
    );
  }

  findByLanguage(language: Language): AgentRegistration[] {
    return this.getAll().filter(
      (a) => a.type === "language" && a.supportedLanguages?.includes(language),
    );
  }

  findByDialect(dialect: Dialect): AgentRegistration[] {
    return this.getAll().filter(
      (a) => a.type === "dialect" && a.supportedDialects?.includes(dialect),
    );
  }

  findByType(type: AgentRegistration["type"]): AgentRegistration[] {
    return this.getAll().filter((a) => a.type === type);
  }

  isHealthy(name: string): boolean {
    return this.agents.has(name);
  }
}

export const registry = new AgentRegistry();

function registerDefaultAgents() {
  const domains: CorrespondenceCategory[] = ["tax", "health", "housing", "employment", "legal"];

  for (const domain of domains) {
    registry.register({
      name: `${domain}-agent`,
      type: "domain",
      version: "1.0.0",
      description: `${domain} specialist agent`,
      capabilities: [`${domain}.explain`, `${domain}.guide`, `${domain}.faq`],
      domains: [domain],
    });
  }

  const languages: Language[] = ["en", "zh", "ms", "ta"];
  for (const lang of languages) {
    registry.register({
      name: `${lang}-language-agent`,
      type: "language",
      version: "1.0.0",
      description: `${lang} language agent`,
      capabilities: ["translate", "glossary.lookup", "contextualise"],
      supportedLanguages: [lang],
    });
  }

  const dialects: { code: Dialect; group: string }[] = [
    { code: "zh-hok", group: "chinese" },
    { code: "zh-can", group: "chinese" },
    { code: "zh-teo", group: "chinese" },
    { code: "zh-hak", group: "chinese" },
    { code: "zh-hai", group: "chinese" },
    { code: "ms-bms", group: "malay" },
    { code: "ms-joh", group: "malay" },
    { code: "ms-boy", group: "malay" },
    { code: "ms-jav", group: "malay" },
    { code: "ta-sin", group: "indian" },
    { code: "ta-spo", group: "indian" },
    { code: "ml", group: "indian" },
    { code: "pa", group: "indian" },
    { code: "hi", group: "indian" },
  ];

  for (const { code } of dialects) {
    registry.register({
      name: `${code}-dialect-agent`,
      type: "dialect",
      version: "1.0.0",
      description: `${code} dialect agent`,
      capabilities: ["glossary.lookup", "contextualise", "cultural.context"],
      supportedDialects: [code],
    });
  }

  registry.register({
    name: "accessibility-agent",
    type: "accessibility",
    version: "1.0.0",
    description: "Readability and accessibility agent",
    capabilities: ["simplify", "readability.score", "tts.prep", "format"],
  });

  registry.register({
    name: "guardian-agent",
    type: "guardian",
    version: "1.0.0",
    description: "Safety and security gate agent",
    capabilities: ["pii.scan", "scam.detect", "safety.review", "confidence.check"],
  });
}

registerDefaultAgents();
