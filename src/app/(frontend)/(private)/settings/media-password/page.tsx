import { Suspense } from 'react'
import type { Metadata } from 'next'
import PageContent from './components/PageContent'
import PageSkeleton from './components/PageSkeleton'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Contraseña de Acceso a Media',
  description: 'Configura la contraseña para acceso a archivos media sin autenticación',
}

export default function MediaPasswordPage() {
  return (
    <div className="container py-6">
      <Suspense fallback={<PageSkeleton />}>
        <PageContent />
      </Suspense>
    </div>
  )
}

