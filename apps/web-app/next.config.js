/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@nx-monorepo-template/shared-types',
    '@nx-monorepo-template/shared-utils',
  ],
  experimental: {
    appDir: true,
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.API_URL || 'http://localhost:3000/api/v1',
  },
};

module.exports = nextConfig;