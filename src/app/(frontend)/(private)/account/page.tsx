import { Suspense } from 'react'
import { PageContent } from './components/PageContent'
import { PageSkeleton } from './components/PageSkeleton'

/**
 * Página de cuenta del usuario
 *
 * Permite ver y editar información del perfil propio
 */
export default function AccountPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PageContent />
    </Suspense>
  )
}
