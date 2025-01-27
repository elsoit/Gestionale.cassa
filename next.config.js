/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    API_URL: process.env.NODE_ENV === 'production' 
      ? 'http://api2.artexmoda.com'  
      : 'http://localhost:3003'
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: '**',
        port: '',
        pathname: '/**',
      }
    ],
  },
}

module.exports = nextConfig 