import { Router } from "express";
import crypto from "crypto";
import { execFile } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import type { Request, Response } from "express";
import { createServiceLogger } from "../shared/logger.js";

const log = createServiceLogger("deploy");
const router = Router();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEPLOY_SCRIPT = path.resolve(__dirname, "../../deploy/deploy-frontend.sh");
const SECRET = process.env.GITHUB_WEBHOOK_SECRET ?? "";
const TARGET_REF = "refs/heads/UI_Frontend";

function verifySignature(rawBody: Buffer, header: string): boolean {
  if (!SECRET || !header) return false;
  const expected = "sha256=" + crypto.createHmac("sha256", SECRET).update(rawBody).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(header));
  } catch {
    return false;
  }
}

router.post("/github", (req: Request, res: Response) => {
  const sig = (req.headers["x-hub-signature-256"] as string) ?? "";
  const rawBody: Buffer | undefined = (req as any).rawBody;

  if (!rawBody || !verifySignature(rawBody, sig)) {
    log.warn("GitHub webhook rejected: invalid or missing signature");
    res.status(401).json({ error: "invalid signature" });
    return;
  }

  const event = req.headers["x-github-event"] as string;
  if (event !== "push") {
    res.status(200).json({ skipped: true, reason: `event=${event}` });
    return;
  }

  const payload = req.body as { ref?: string };
  if (payload.ref !== TARGET_REF) {
    res.status(200).json({ skipped: true, reason: `ref=${payload.ref}` });
    return;
  }

  // Respond before the deploy so GitHub doesn't time out
  res.status(202).json({ accepted: true, branch: "UI_Frontend" });

  log.info("GitHub webhook: starting deploy-frontend...");
  const repoDir = path.resolve(__dirname, "../../");
  execFile("/bin/bash", [DEPLOY_SCRIPT], { env: { ...process.env, PULSE_REPO_DIR: repoDir } }, (err, stdout, stderr) => {
    if (err) {
      log.error({ err, stderr }, "deploy-frontend.sh failed");
    } else {
      log.info({ stdout }, "deploy-frontend.sh succeeded");
    }
  });
});

export { router as deployRoutes };
