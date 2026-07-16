import { createServiceLogger } from "../logger.js";
import { ExternalServiceError } from "../errors.js";

const log = createServiceLogger("hf");

// HuggingFace retired api-inference.huggingface.co; serverless now routes through
// the Inference Providers router. Path stays /models/{model}.
const HF_BASE_URL = process.env.HF_API_BASE_URL ?? "https://router.huggingface.co/hf-inference";
const HF_API_KEY = process.env.HUGGINGFACE_API_KEY ?? "";
const HF_TIMEOUT_MS = parseInt(process.env.HF_TIMEOUT_MS ?? "", 10) || 30000;

// HuggingFace returns 503 while a model cold-starts ("currently loading").
// Retry once after the suggested wait before giving up.
const MAX_RETRIES = 1;

function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = { ...extra };
  if (HF_API_KEY && HF_API_KEY !== "hf_...") headers["Authorization"] = `Bearer ${HF_API_KEY}`;
  return headers;
}

async function post(model: string, init: RequestInit, timeoutMs = HF_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(`${HF_BASE_URL}/models/${model}`, {
      method: "POST",
      signal: controller.signal,
      ...init,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function call(model: string, init: RequestInit, attempt = 0, timeoutMs?: number): Promise<unknown> {
  let res: Response;
  try {
    res = await post(model, init, timeoutMs);
  } catch (err) {
    // Timeouts/aborts and network drops happen while a serverless model cold-starts —
    // one retry usually lands on the now-warm model. Without this, only 503s were
    // retried and a cold Whisper meant a guaranteed "couldn't hear you" to the user.
    if (attempt < MAX_RETRIES) {
      log.warn({ model, err: (err as Error).message }, "HF request failed, retrying");
      return call(model, init, attempt + 1, timeoutMs);
    }
    throw new ExternalServiceError("hf", `request to ${model} failed: ${(err as Error).message}`);
  }

  // Transient upstream failures: 503 = model warming (HF suggests a wait via
  // estimated_time); 504/502/500 = the router's own gateway timing out on a cold
  // model (returns an HTML error page); 429 = momentary rate limit. All are worth
  // one retry — a cold Whisper routinely 504s once and serves the retry.
  if ([500, 502, 503, 504, 429].includes(res.status) && attempt < MAX_RETRIES) {
    const body = res.status === 503
      ? ((await res.json().catch(() => ({}))) as { estimated_time?: number })
      : {};
    const waitMs = Math.min((body.estimated_time ?? 5) * 1000, timeoutMs ?? HF_TIMEOUT_MS);
    log.warn({ model, status: res.status, waitMs }, "HF transient error, retrying");
    await new Promise((r) => setTimeout(r, waitMs));
    return call(model, init, attempt + 1, timeoutMs);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new ExternalServiceError("hf", `${model} returned ${res.status}: ${text.slice(0, 200)}`);
  }

  return res.json();
}

/** JSON-in / JSON-out inference (translation, classification, etc.). */
export function hfJson(model: string, payload: unknown, opts?: { timeoutMs?: number }): Promise<unknown> {
  return call(model, {
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  }, 0, opts?.timeoutMs);
}

/** Binary-in / JSON-out inference (speech-to-text, audio emotion). */
export function hfBinary(model: string, bytes: Uint8Array, contentType: string, opts?: { timeoutMs?: number }): Promise<unknown> {
  return call(model, {
    headers: authHeaders({ "Content-Type": contentType }),
    body: new Blob([bytes], { type: contentType }),
  }, 0, opts?.timeoutMs);
}

/** JSON-in / binary-out inference (text-to-speech). Returns the raw audio bytes. */
export async function hfRawOut(model: string, payload: unknown): Promise<{ bytes: Uint8Array; contentType: string }> {
  let res: Response;
  try {
    res = await post(model, {
      headers: authHeaders({ "Content-Type": "application/json", Accept: "audio/flac" }),
      body: JSON.stringify(payload),
    });
  } catch (err) {
    throw new ExternalServiceError("hf", `request to ${model} failed: ${(err as Error).message}`);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new ExternalServiceError("hf", `${model} returned ${res.status}: ${text.slice(0, 200)}`);
  }
  const buf = new Uint8Array(await res.arrayBuffer());
  return { bytes: buf, contentType: res.headers.get("content-type") ?? "audio/flac" };
}

export function hfConfigured(): boolean {
  return Boolean(HF_API_KEY) && HF_API_KEY !== "hf_...";
}
