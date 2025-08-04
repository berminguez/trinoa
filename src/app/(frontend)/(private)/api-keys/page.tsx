import { Suspense } from 'react'
import { Metadata } from 'next'

import { ApiKeysContent } from './components/ApiKeysContent'
import { ApiKeysSkeleton } from './components/ApiKeysSkeleton'

export const metadata: Metadata = {
  title: 'API Keys - Eidetik',
  description: 'Gestiona tus API Keys para conectar servicios externos mediante MCP o API',
}

export default function ApiKeysPage() {
  return (
    <Suspense fallback={<ApiKeysSkeleton />}>
      <ApiKeysContent />
    </Suspense>
  )
}
