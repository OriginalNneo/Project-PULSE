import { execFile as execFileCb } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { createServiceLogger } from "../shared/logger.js";

const execFile = promisify(execFileCb);
const log = createServiceLogger("frontend-sync");

const BRANCH = process.env.UI_SYNC_BRANCH ?? "UI_Frontend";
const REPO_DIR = process.env.UI_SYNC_REPO_DIR ?? process.cwd();

// Run a git command inside REPO_DIR and return trimmed stdout.
async function git(...args: string[]): Promise<string> {
  const { stdout } = await execFile("git", ["-C", REPO_DIR, ...args], { maxBuffer: 1024 * 1024 });
  return stdout.trim();
}

async function isDirty(): Promise<boolean> {
  const out = await git("status", "--porcelain");
  return out.length > 0;
}

// Fetch UI_Frontend and, if it has moved ahead, mirror the whole repo onto it.
// next dev watches files and hot-reloads the frontend automatically on update.
async function syncFrontend(): Promise<void> {
  await git("fetch", "origin", BRANCH);
  const remote = await git("rev-parse", `origin/${BRANCH}`);
  const head = await git("rev-parse", "HEAD");
  if (head === remote) return; // already up to date

  if (await isDirty()) {
    log.warn({ branch: BRANCH, remote: remote.slice(0, 8) }, "Working tree has local changes — skipping sync to avoid overwriting them");
    return;
  }

  const branch = await git("rev-parse", "--abbrev-ref", "HEAD");
  log.info({ branch: BRANCH, from: head.slice(0, 8), to: remote.slice(0, 8) }, "New commits on UI_Frontend — syncing repo");

  if (branch !== BRANCH) {
    await git("checkout", BRANCH);
  }
  await git("reset", "--hard", `origin/${BRANCH}`);

  log.info({ branch: BRANCH, head: remote.slice(0, 8) }, "Repo synced to origin/UI_Frontend — next dev will hot-reload");
}

export function startFrontendSyncTimer(intervalMs = 30_000): ReturnType<typeof setInterval> {
  log.info({ intervalMs, branch: BRANCH, repoDir: REPO_DIR }, "Frontend sync timer started");
  return setInterval(() => {
    syncFrontend().catch((err: unknown) => {
      log.warn({ msg: (err as Error).message }, "Frontend sync skipped");
    });
  }, intervalMs);
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  const intervalMs = Number(process.env.UI_SYNC_INTERVAL_MS ?? 30_000);
  startFrontendSyncTimer(intervalMs);
}
