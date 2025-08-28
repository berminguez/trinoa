import { Suspense } from 'react'
import { Metadata } from 'next'
import { requireAdminAccess } from '@/actions/auth/getUser'
import { PendingTaskResourceContent } from './components/PendingTaskResourceContent'
import { PendingTaskResourceSkeleton } from './components/PendingTaskResourceSkeleton'

// Asegurar que la página se regenere en cada request para que revalidatePath funcione
export const dynamic = 'force-dynamic'

interface PendingTaskResourcePageProps {
  params: Promise<{ resourceId: string }>
}

export async function generateMetadata({
  params,
}: PendingTaskResourcePageProps): Promise<Metadata> {
  const { resourceId } = await params

  return {
    title: `Tarea ${resourceId.slice(0, 8)}... - Tareas Pendientes - Trinoa Admin`,
    description: `Revisa y gestiona el recurso pendiente desde el panel administrativo`,
  }
}

/**
 * Página de detalle de recurso en tareas pendientes con vista de pantalla partida
 *
 * Similar a la vista de recursos de proyecto pero navegando entre tareas pendientes:
 * - Pantalla partida: documento a la izquierda, formulario a la derecha
 * - Navegación anterior/siguiente entre recursos pendientes
 * - Criterios de filtrado: status completed/failed + confidence empty/needs_revision
 */
export default async function PendingTaskResourcePage({ params }: PendingTaskResourcePageProps) {
  // Validar acceso de administrador
  const adminUser = await requireAdminAccess()
  const { resourceId } = await params

  return (
    <Suspense fallback={<PendingTaskResourceSkeleton />}>
      <PendingTaskResourceContent adminUser={adminUser} resourceId={resourceId} />
    </Suspense>
  )
}
