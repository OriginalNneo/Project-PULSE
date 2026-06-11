import { createServiceLogger } from "../logger.js";
import { ExternalServiceError } from "../errors.js";

const log = createServiceLogger("hf");

const HF_BASE_URL = process.env.HF_API_BASE_URL ?? "https://api-inference.huggingface.co";
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

async function post(model: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), HF_TIMEOUT_MS);
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

async function call(model: string, init: RequestInit, attempt = 0): Promise<unknown> {
  let res: Response;
  try {
    res = await post(model, init);
  } catch (err) {
    throw new ExternalServiceError("hf", `request to ${model} failed: ${(err as Error).message}`);
  }

  // Model warming up — HF tells us how long to wait via estimated_time.
  if (res.status === 503 && attempt < MAX_RETRIES) {
    const body = (await res.json().catch(() => ({}))) as { estimated_time?: number };
    const waitMs = Math.min((body.estimated_time ?? 5) * 1000, HF_TIMEOUT_MS);
    log.warn({ model, waitMs }, "HF model loading, retrying");
    await new Promise((r) => setTimeout(r, waitMs));
    return call(model, init, attempt + 1);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new ExternalServiceError("hf", `${model} returned ${res.status}: ${text.slice(0, 200)}`);
  }

  return res.json();
}

/** JSON-in / JSON-out inference (translation, classification, etc.). */
export function hfJson(model: string, payload: unknown): Promise<unknown> {
  return call(model, {
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
}

/** Binary-in / JSON-out inference (speech-to-text, audio emotion). */
export function hfBinary(model: string, bytes: Uint8Array, contentType: string): Promise<unknown> {
  return call(model, {
    headers: authHeaders({ "Content-Type": contentType }),
    body: new Blob([bytes], { type: contentType }),
  });
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
