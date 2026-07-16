// PM2 process definitions for PULSE on the VPS.
// Start with:  pm2 start deploy/ecosystem.config.cjs
// Persist:     pm2 save && pm2 startup
//
// Both run from /opt/project-pulse. The backend uses tsx (same as dev) to avoid
// an ESM/CJS build step; the frontend serves the pre-built `next build` output.

module.exports = {
  apps: [
    {
      name: "pulse-backend",
      cwd: "/opt/project-pulse",
      script: "npm",
      args: "run start:backend",
      env: {
        NODE_ENV: "production",
        PORT: "3000",
      },
      max_restarts: 10,
      restart_delay: 3000,
      out_file: "/var/log/pulse/backend.out.log",
      error_file: "/var/log/pulse/backend.err.log",
    },
    {
      name: "pulse-frontend",
      cwd: "/opt/project-pulse",
      script: "npm",
      args: "run start:frontend",
      env: {
        NODE_ENV: "production",
        PORT: "3001",
      },
      max_restarts: 10,
      restart_delay: 3000,
      out_file: "/var/log/pulse/frontend.out.log",
      error_file: "/var/log/pulse/frontend.err.log",
    },
    {
      // Local Whisper STT (faster-whisper, CPU). Primary speech-to-text — the backend
      // only falls back to HF serverless when this is down. One-time setup:
      //   python3 -m venv /opt/pulse-stt/venv
      //   /opt/pulse-stt/venv/bin/pip install faster-whisper flask
      name: "pulse-stt",
      cwd: "/opt/project-pulse",
      script: "deploy/stt-server.py",
      interpreter: "/opt/pulse-stt/venv/bin/python",
      env: {
        STT_PORT: "3002",
        STT_MODEL: "small",
      },
      max_restarts: 10,
      restart_delay: 3000,
      out_file: "/var/log/pulse/stt.out.log",
      error_file: "/var/log/pulse/stt.err.log",
    },
  ],
};
