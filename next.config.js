/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'pub-f4e1b9395e524051a44e01925c9722f0.r2.dev',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'a8e3ac15a95a1b6a6bd0e51aadb0d9b6.r2.dev',
        port: '',
        pathname: '/**',
      }
    ],
  },
}

module.exports = nextConfig 