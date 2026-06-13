/** @type {import('next').NextConfig} */
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  manifest: {
    name: 'Hosterix - Hotel Management',
    short_name: 'Hosterix',
    description: 'Sistema de gestión hotelera completo',
    theme_color: '#2563eb',
    background_color: '#f8fafc',
  },
});

const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  output: 'standalone',
  turbopack: {},
};

module.exports = withBundleAnalyzer(withPWA(nextConfig));
