import { Suspense } from 'react'
import { Metadata } from 'next'
import { requireAdminAccess } from '@/actions/auth/getUser'
import { PendingTasksContent } from './components/PendingTasksContent'
import { PendingTasksSkeleton } from './components/PendingTasksSkeleton'

// Asegurar que la página se regenere en cada request para que revalidatePath funcione
export const dynamic = 'force-dynamic'

interface PendingTasksPageProps {}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: `Tareas Pendientes - Trinoa Admin`,
    description: `Gestiona recursos que requieren revisión administrativa`,
  }
}

/**
 * Página de tareas pendientes para administradores
 *
 * Muestra todos los recursos que requieren atención administrativa:
 * - Status: completed o failed
 * - Confidence: empty o needs_revision
 * - Ordenados de más antiguo a más reciente
 * - Con navegación fácil entre recursos
 */
export default async function PendingTasksPage({}: PendingTasksPageProps) {
  // Validar acceso de administrador
  const adminUser = await requireAdminAccess()

  return (
    <Suspense fallback={<PendingTasksSkeleton />}>
      <PendingTasksContent adminUser={adminUser} />
    </Suspense>
  )
}
