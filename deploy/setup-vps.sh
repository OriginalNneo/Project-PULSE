#!/usr/bin/env bash
# One-time VPS provisioning for PULSE. Run as root on a fresh Ubuntu 22.04/24.04 box:
#   bash setup-vps.sh
# Installs Node 20, PM2, Caddy, build tools, a firewall, and log dirs.
set -euo pipefail

echo "==> Updating base packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y curl ca-certificates gnupg ufw build-essential python3

echo "==> Installing Node.js 20 LTS"
if ! command -v node >/dev/null 2>&1 || [ "$(node -v | sed 's/v//' | cut -d. -f1)" -lt 20 ]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
node -v && npm -v

echo "==> Installing PM2 (process manager)"
npm install -g pm2

echo "==> Installing Caddy (reverse proxy + automatic HTTPS)"
if ! command -v caddy >/dev/null 2>&1; then
  apt-get install -y debian-keyring debian-archive-keyring apt-transport-https
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list >/dev/null
  apt-get update -y
  apt-get install -y caddy
fi

echo "==> Configuring firewall (allow SSH, HTTP, HTTPS only)"
ufw allow OpenSSH || ufw allow 22
ufw allow 80
ufw allow 443
ufw --force enable

echo "==> Creating log directory"
mkdir -p /var/log/pulse

echo "==> Done. Next: upload the project to /opt/project-pulse, then deploy (see DEPLOY.md)."
