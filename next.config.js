/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'raw.githubusercontent.com',
        port: '',
        pathname: '/**',
      },
    ],
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    domains: ['raw.githubusercontent.com'],
    formats: ['image/avif', 'image/webp'],
    unoptimized: true, // Allow images from data URLs
  },
  // Disable some features that might cause the EPERM error
  experimental: {
    forceSwcTransforms: true,
  },
  // Disable source maps in production
  productionBrowserSourceMaps: false,
  // Disable React strict mode
  reactStrictMode: false,
  // Disable SWC minify
  swcMinify: false,
};

module.exports = nextConfig; 