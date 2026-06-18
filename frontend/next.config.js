/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  turbopack: {
    root: __dirname,
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.BACKEND_URL ?? "http://localhost:3000"}/api/:path*`,
      },
      {
        source: "/dashboard-api/:path*",
        destination: `${process.env.BACKEND_URL ?? "http://localhost:3000"}/dashboard/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
