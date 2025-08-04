/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Minimal config for debugging
  experimental: {
    serverComponentsExternalPackages: ['payload'],
  },
}

export default nextConfig
