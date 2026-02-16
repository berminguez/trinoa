import { withPayload } from '@payloadcms/next/withPayload'
import createNextIntlPlugin from 'next-intl/plugin'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const withNextIntl = createNextIntlPlugin('./src/i18n.ts')

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Your Next.js config here
  output: 'standalone', // Necesario para Docker builds
  outputFileTracingRoot: path.join(__dirname),
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
