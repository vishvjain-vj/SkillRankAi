/** @type {import('next').NextConfig} */
const nextConfig = {
  // Rewrite /api/* → backend so the key never leaks to the browser
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.BACKEND_URL || "http://localhost:8000"}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;