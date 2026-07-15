# PULSE — Deploy to VPS + Cloudflare subdomain

This guide puts PULSE live at **`https://pulse.nathanielbuilds.cc`**, served from your VPS
(`203.174.82.119`) behind Caddy (automatic HTTPS), with Cloudflare DNS in front.

```
Browser ──HTTPS──> Cloudflare DNS (pulse.nathanielbuilds.cc)
                       │
                       ▼
                 VPS :443  Caddy (reverse proxy + TLS)
                       ├── /api/*, /health/*, /query, /webhook/*,      ──> 127.0.0.1:3000  (Express backend, tsx)
                       │   /dashboard/*, /webchat/* (+ transcribe/…)
                       └── everything else                             ──> 127.0.0.1:3001  (Next.js frontend)
                                   │
                   SQLite (local file) + MongoDB Atlas + z.ai GLM
```

> Pick any subdomain you like — this guide uses `pulse`. To change it, edit
> [`deploy/Caddyfile`](deploy/Caddyfile) and the DNS record name below.

---

## 0. ⚠️ Security first (do this now)

You shared the VPS root password and your API keys in chat, so treat them as compromised:

- After step 6, **change the VPS root password**: `passwd`
- After it's running, **rotate** the z.ai API key and the MongoDB Atlas password, update `.env`, then `pm2 reload all`.
- The deploy ships `.env` (with secrets) to the VPS over scp (encrypted) and locks it to `chmod 600`.

---

## 1. Create the Cloudflare subdomain (do this first — Caddy needs it to get a cert)

1. Go to **dash.cloudflare.com → `nathanielbuilds.cc` → DNS → Records → Add record**.
2. Fill in:
   - **Type:** `A`
   - **Name:** `pulse`
   - **IPv4 address:** `203.174.82.119`
   - **Proxy status:** **DNS only** (grey cloud) ← required so Caddy can fetch a Let's Encrypt cert
   - **TTL:** Auto
3. Save. Confirm it resolves (from your PC):
   ```powershell
   nslookup pulse.nathanielbuilds.cc
   ```
   It should return `203.174.82.119`.

*(You can switch to the orange "Proxied" cloud later — see step 8.)*

---

## 2. Provision the VPS (one time)

**On your Windows PC (PowerShell), from the repo root** `C:\Users\neosp\Project-PULSE`:

```powershell
# Build a deployable archive. Excludes node_modules/.next/.git/db files,
# but INCLUDES .env (so your keys go with it).
tar --exclude=node_modules --exclude=frontend/node_modules --exclude=frontend/.next `
    --exclude=dist --exclude=.git `
    --exclude="data/pulse-customers.db" --exclude="data/pulse-customers.db-wal" `
    --exclude="data/pulse-customers.db-shm" --exclude="data/docstore" `
    -czf ..\pulse.tar.gz .

# Copy it to the VPS (you'll be prompted for the root password)
scp ..\pulse.tar.gz root@203.174.82.119:/root/
```

**SSH into the VPS** (type the password when prompted):

```powershell
ssh root@203.174.82.119
```

**On the VPS**, unpack and run the provisioning script (installs Node 20, PM2, Caddy, firewall):

```bash
mkdir -p /opt/project-pulse
tar -xzf /root/pulse.tar.gz -C /opt/project-pulse
cd /opt/project-pulse
chmod 600 .env
bash deploy/setup-vps.sh
```

---

## 3. Point the app at the production domain

**On the VPS**, set production env values in `.env`:

```bash
cd /opt/project-pulse
sed -i 's#^NODE_ENV=.*#NODE_ENV=production#' .env
grep -q '^CORS_ORIGIN=' .env \
  && sed -i 's#^CORS_ORIGIN=.*#CORS_ORIGIN=https://pulse.nathanielbuilds.cc#' .env \
  || echo 'CORS_ORIGIN=https://pulse.nathanielbuilds.cc' >> .env
```

**MongoDB Atlas allowlist:** in the Atlas dashboard → **Network Access**, add the VPS IP
`203.174.82.119` (or `0.0.0.0/0` for any). If you skip this, the app still runs — the document
store **auto-falls back to the local file store** — but it won't write to your Atlas cluster.

---

## 4. Install, build, seed

**On the VPS:**

```bash
cd /opt/project-pulse
npm install --include=dev          # builds the Linux better-sqlite3 binary; keeps tsx
cd frontend && npm install --include=dev && npm run build && cd ..
npm run db:seed                    # creates SQLite + 150 members + loads CPF knowledge
```

> `--include=dev` matters: `tsx` (backend runtime) and the Next build toolchain live in devDependencies.

---

## 5. Configure Caddy (reverse proxy + HTTPS)

**On the VPS:**

```bash
cp /opt/project-pulse/deploy/Caddyfile /etc/caddy/Caddyfile
systemctl reload caddy
systemctl status caddy --no-pager | head -n 12
```

Caddy will automatically obtain a Let's Encrypt certificate for `pulse.nathanielbuilds.cc`
(this needs step 1 done and the grey cloud). Watch it succeed with:

```bash
journalctl -u caddy -n 30 --no-pager
```

---

## 6. Start the app with PM2

**On the VPS:**

```bash
mkdir -p /var/log/pulse
cd /opt/project-pulse
pm2 start deploy/ecosystem.config.cjs
pm2 save
pm2 startup        # prints a command — copy/paste & run it so PM2 restarts on reboot
pm2 status
```

Then **change the root password** while you're here:

```bash
passwd
```

### 6b. (Alternative) Run with tmux instead of PM2

tmux is simpler and keeps the processes alive after you log out, but it does **not** auto-restart
on crash or reboot. Good for testing; PM2 (above) is better for unattended uptime. Caddy is
independent of either. To use tmux, skip the PM2 commands and instead:

```bash
apt-get install -y tmux
tmux new -s pulse

# inside tmux:
cd /opt/project-pulse && npm run start:backend     # backend :3000
#   split the pane:  Ctrl-b  then  "
cd /opt/project-pulse && npm run start:frontend    # frontend :3001 (needs `npm run build` first)
#   detach (leaves it running):  Ctrl-b  then  d
```

Reattach later with `tmux attach -t pulse`. After a reboot, `tmux attach` (or re-run the two
commands) — there's no auto-start.

---

## 7. Verify

**On the VPS (local checks):**

```bash
curl -s http://127.0.0.1:3000/health/live
curl -s http://127.0.0.1:3000/api/v1/console/stats | head -c 300
```

**From anywhere (the real thing):**

- App / console: **https://pulse.nathanielbuilds.cc/console**
- API: **https://pulse.nathanielbuilds.cc/api/v1/console/stats**

You should see the dashboard with ~150 members and the AI copilot working.

---

## 8. (Optional) Put Cloudflare's proxy in front

Once HTTPS works with the grey cloud, you can enable the **orange "Proxied"** cloud for DDoS
protection and to hide your origin IP. Because Cloudflare then intercepts port 80 (breaking
Let's Encrypt's HTTP renewal), switch Caddy to a **Cloudflare Origin Certificate**:

1. Cloudflare → **SSL/TLS → Overview** → set encryption mode to **Full (strict)**.
2. **SSL/TLS → Origin Server → Create Certificate** → save the cert and key on the VPS:
   ```bash
   nano /etc/caddy/origin.pem   # paste the certificate
   nano /etc/caddy/origin.key   # paste the private key
   chmod 600 /etc/caddy/origin.key
   ```
3. In `/etc/caddy/Caddyfile`, add this line just inside the `pulse.nathanielbuilds.cc { ... }` block:
   ```
   tls /etc/caddy/origin.pem /etc/caddy/origin.key
   ```
4. `systemctl reload caddy`
5. In Cloudflare DNS, flip the `pulse` record to **Proxied** (orange).

---

## 9. Redeploy after code changes

**On your PC** (rebuild + ship the archive):

```powershell
tar --exclude=node_modules --exclude=frontend/node_modules --exclude=frontend/.next `
    --exclude=dist --exclude=.git --exclude="data/pulse-customers.db*" --exclude="data/docstore" `
    -czf ..\pulse.tar.gz .
scp ..\pulse.tar.gz root@203.174.82.119:/root/
```

**On the VPS:**

```bash
tar -xzf /root/pulse.tar.gz -C /opt/project-pulse
cd /opt/project-pulse
npm install --include=dev
cd frontend && npm install --include=dev && npm run build && cd ..
pm2 reload all
```

*(Skip `npm run db:seed` on redeploys unless you want to reset the data.)*

---

## 10. Troubleshooting

| Symptom | Fix |
|---|---|
| Caddy won't get a cert | DNS A record must resolve to the VPS and be **grey cloud**; port 80 open. `journalctl -u caddy -n 50`. |
| `502 Bad Gateway` | Backend/frontend not up. `pm2 status`, `pm2 logs pulse-backend`. |
| Atlas not connecting | Add the VPS IP to Atlas **Network Access** (else it uses the file fallback). |
| `better-sqlite3` build error | Ensure `build-essential` + `python3` (setup script installs them), then `npm install --include=dev` again. |
| Copilot returns fallback answers | Confirm `LLM_API_KEY` in `.env` and `pm2 reload all`. |
| Ports busy | `ss -ltnp | grep -E ':3000|:3001'` — only PM2's node should hold them. |

## Useful commands

```bash
pm2 status            # process health
pm2 logs              # live logs (Ctrl+C to exit)
pm2 reload all        # zero-downtime restart after a deploy
systemctl reload caddy
```
