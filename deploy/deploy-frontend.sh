#!/usr/bin/env bash
# Pulls the latest frontend/ from UI_Frontend on GitHub and restarts pm2.
# Called automatically by the GitHub webhook handler.
# PULSE_REPO_DIR defaults to the parent of this script's directory.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="${PULSE_REPO_DIR:-$(dirname "$SCRIPT_DIR")}"
BRANCH="main"

echo "[deploy-frontend] repo=$REPO_DIR branch=$BRANCH"

git -C "$REPO_DIR" fetch origin "$BRANCH"
git -C "$REPO_DIR" checkout "origin/$BRANCH" -- frontend/

cd "$REPO_DIR/frontend"
npm install --prefer-offline --no-audit --no-fund
npm run build

pm2 restart pulse-frontend

echo "[deploy-frontend] done"
