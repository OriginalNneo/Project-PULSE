import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  transport: process.env.NODE_ENV === "development"
    ? { target: "pino/file", options: { destination: 1 } }
    : undefined,
  formatters: {
    level: (label) => ({ level: label }),
  },
  serializers: {
    err: pino.stdSerializers.err,
    req: (req: { method?: string; url?: string; headers?: Record<string, string> }) => ({
      method: req.method,
      url: req.url,
    }),
  },
});

export function createServiceLogger(service: string) {
  return logger.child({ service });
}
