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
  ],
};
