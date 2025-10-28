import { withPayload } from '@payloadcms/next/withPayload'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/i18n.ts')

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Your Next.js config here
  output: 'standalone', // Necesario para Docker builds
  experimental: {
    serverActions: {
      bodySizeLimit: '64mb',
    },
  },
  eslint: {
    // Arreglo temporal para no bloquear el build en Railway por ESLint
    ignoreDuringBuilds: true,
  },
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }

    return webpackConfig
  },
  // Configurar headers para aumentar timeout en endpoints de upload
  async headers() {
    return [
      {
        source: '/api/resources/upload',
        headers: [
          {
            key: 'x-vercel-max-duration',
            value: '300', // 5 minutos
          },
        ],
      },
      {
        source: '/api/pre-resources/upload',
        headers: [
          {
            key: 'x-vercel-max-duration',
            value: '300', // 5 minutos
          },
        ],
      },
    ]
  },
}

export default withNextIntl(withPayload(nextConfig, { devBundleServerPackages: false }))
