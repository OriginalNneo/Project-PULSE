#!/usr/bin/env bash
# POST — Power-On Self-Test for the PULSE backend.
# Run via:  npm run post
# Protocol + rationale documented in POST.md.
#
# Exit 0 = all critical checks passed; exit 1 = at least one FAIL.
# WARN never fails the run (optional/non-critical checks).
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# ── Config (override via env) ────────────────────────────────────────────────
BACKEND="${POST_BACKEND:-http://127.0.0.1:3000}"
FRONTEND="${POST_FRONTEND:-http://127.0.0.1:3001}"
PUBLIC="${POST_PUBLIC:-https://pulse.nathanielbuilds.cc}"
PM2_BACKEND="${POST_PM2_BACKEND:-pulse-backend}"
ERRLOG="${POST_ERRLOG:-$HOME/.pm2/logs/${PM2_BACKEND}-error.log}"

getenv(){ grep -E "^$1=" .env 2>/dev/null | head -1 | cut -d= -f2- | tr -d '\r"'; }
TG_TOKEN="$(getenv TELEGRAM_BOT_TOKEN)"
TG_OFFICER="$(getenv TELEGRAM_OFFICER_CHAT_ID)"

PASS=0; FAIL=0; WARN=0
ok(){   echo "  ✓ $1"; PASS=$((PASS+1)); }
bad(){  echo "  ✗ $1"; FAIL=$((FAIL+1)); }
warn(){ echo "  ⚠ $1"; WARN=$((WARN+1)); }
hdr(){  echo ""; echo "── $1 ──"; }
http(){ curl -s -o /dev/null -w "%{http_code}" -m "${2:-10}" "$1" 2>/dev/null; }

echo "PULSE POST — $(date -u +%Y-%m-%dT%H:%M:%SZ)"

# ── Phase 0 — Stale-session guard ────────────────────────────────────────────
hdr "Phase 0 — Stale-session guard"
ERR_BEFORE=0; [ -f "$ERRLOG" ] && ERR_BEFORE=$(wc -c < "$ERRLOG")
# pm2 runs 'npx tsx src/gateway/index.ts' (no watch) and 'next start'. Anything
# matching the manual-dev signatures below is a stray holding :3000/:3001 → kill.
KILLED=0
for pat in "tsx watch src/gateway/index.ts" "concurrently.*dev:backend" "next dev"; do
  if pgrep -f "$pat" >/dev/null 2>&1; then pkill -f "$pat" 2>/dev/null && KILLED=$((KILLED+1)); fi
done
[ "$KILLED" -gt 0 ] && ok "cleared $KILLED stale dev process group(s)" || ok "no stale dev sessions"

# ── Phase 1 — Start & backend health ─────────────────────────────────────────
hdr "Phase 1 — Start & backend health"
if command -v pm2 >/dev/null 2>&1; then
  pm2 restart "$PM2_BACKEND" >/dev/null 2>&1 && ok "pm2 restart $PM2_BACKEND" || warn "pm2 restart failed (is $PM2_BACKEND registered?)"
else
  warn "pm2 not found — skipping managed restart"
fi
code=000
for _ in $(seq 1 30); do code=$(http "$BACKEND/health/live"); [ "$code" = "200" ] && break; sleep 1; done
[ "$code" = "200" ] && ok "backend /health/live 200" || bad "backend /health/live ($code)"

# ── Phase 2 — Log integrity (fresh errors only) ──────────────────────────────
hdr "Phase 2 — Log integrity"
sleep 1
ERR_AFTER=0; [ -f "$ERRLOG" ] && ERR_AFTER=$(wc -c < "$ERRLOG")
if [ "$ERR_AFTER" -gt "$ERR_BEFORE" ]; then
  NEW="$(tail -c +"$((ERR_BEFORE + 1))" "$ERRLOG")"
  if echo "$NEW" | grep -qiE "Error|ERR_|EADDRINUSE|Cannot find module"; then
    bad "new error-level log lines since restart:"; echo "$NEW" | grep -iE "Error|ERR_|EADDRINUSE" | head -3 | sed 's/^/      /'
  else ok "no fresh error-level output"; fi
else
  ok "no new error-log output since restart (stale errors ignored)"
fi

# ── Phase 3 — Frontend ───────────────────────────────────────────────────────
hdr "Phase 3 — Frontend"
# The officer console lives at /dashboard (the /officer route was never part of this
# frontend; it uses /dashboard + WS). Probe the real page.
c=$(http "$FRONTEND/dashboard"); [ "$c" = "200" ] && ok "frontend $FRONTEND/dashboard 200" || bad "frontend /dashboard ($c)"
c=$(http "$PUBLIC/dashboard" 15); [ "$c" = "200" ] && ok "public $PUBLIC/dashboard 200" || warn "public /dashboard ($c) — DNS/Caddy/frontend down?"

# ── Phase 4 — Backend ↔ Frontend (Next proxy) ────────────────────────────────
hdr "Phase 4 — Backend ↔ Frontend connectivity"
# Verify the Next proxy (/api/:path* → backend) forwards to a live backend endpoint and
# returns valid JSON. Uses adaptive-local/health (live, unauthenticated) — the old
# /api/v1/officer/dashboard probe was removed when the dead officer surface was deleted.
if curl -s -m 10 "$FRONTEND/api/v1/adaptive-local/health" 2>/dev/null \
   | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{const j=JSON.parse(s);process.exit(j.status==='ok'?0:1)}catch{process.exit(1)}})"; then
  ok "frontend proxy → backend API (valid JSON)"
else
  bad "frontend cannot reach backend API through the Next proxy"
fi

# ── Phase 5 — Dashboard live channel (WebSocket) ─────────────────────────────
hdr "Phase 5 — Dashboard live channel"
WSURL="ws://127.0.0.1:3000/dashboard/ws"
if node -e "const W=require('ws');const ws=new W('$WSURL');const t=setTimeout(()=>{console.error('timeout');process.exit(1)},8000);ws.on('open',()=>{clearTimeout(t);ws.close();process.exit(0)});ws.on('error',e=>{clearTimeout(t);console.error(e.message);process.exit(1)})" 2>/dev/null; then
  ok "WebSocket $WSURL opens"
else
  bad "WebSocket /dashboard/ws did not open"
fi

# ── Phase 6 — Telegram ───────────────────────────────────────────────────────
hdr "Phase 6 — Telegram"
if [ -z "$TG_TOKEN" ]; then
  warn "TELEGRAM_BOT_TOKEN not set — skipping Telegram checks"
else
  API="https://api.telegram.org/bot$TG_TOKEN"
  curl -s -m 10 "$API/getMe" | grep -q '"ok":true' && ok "getMe — token valid + bot reachable" || bad "getMe failed (bad/blocked token?)"
  WHI="$(curl -s -m 10 "$API/getWebhookInfo")"
  if echo "$WHI" | grep -q 'callback_query'; then
    ok "webhook allows callback_query (escalation button delivered)"
  else
    warn "webhook MISSING callback_query — auto-repairing…"
    URL="$(echo "$WHI" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{console.log(JSON.parse(s).result.url||'')}catch{console.log('')}})")"
    [ -z "$URL" ] && URL="$PUBLIC/webhook/telegram"
    curl -s -m 10 "$API/setWebhook" --data-urlencode "url=$URL" \
      --data-urlencode 'allowed_updates=["message","edited_message","callback_query"]' \
      | grep -q '"ok":true' && ok "webhook re-registered with callback_query" || bad "webhook repair failed"
  fi
  if [ -n "$TG_OFFICER" ]; then
    curl -s -m 10 "$API/sendMessage" --data-urlencode "chat_id=$TG_OFFICER" \
      --data-urlencode "text=✅ PULSE POST self-test — backend online $(date -u +%H:%M:%SZ)" \
      | grep -q '"message_id"' && ok "outbound sendMessage delivered to officer chat" || warn "outbound send to officer chat failed"
  else
    warn "TELEGRAM_OFFICER_CHAT_ID not set — skipped outbound send test"
  fi
fi

# ── Verdict ──────────────────────────────────────────────────────────────────
hdr "Verdict"
echo "  PASS=$PASS  WARN=$WARN  FAIL=$FAIL"
echo "  Reminder: update CONTEXT.md / AGENTS.md / MEMORY.md for any change made this session."
if [ "$FAIL" -eq 0 ]; then echo "  POST: ✅ backend fully functional"; exit 0; else echo "  POST: ❌ failures present — see ✗ above"; exit 1; fi
