import pino from "pino";

// pino v8 uses `export =` which NodeNext module resolution does not surface as callable.
// The cast is safe — the default export IS the factory function at runtime.
const createPino = pino as unknown as (opts: pino.LoggerOptions) => pino.Logger;

export const logger = createPino({
  level: process.env.LOG_LEVEL ?? "info",
  transport: process.env.NODE_ENV === "development"
    ? { target: "pino/file", options: { destination: 1 } }
    : undefined,
  formatters: {
    level: (label: string) => ({ level: label }),
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
