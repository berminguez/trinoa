import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { requireAdminAccess } from '@/actions/auth/getUser'
import { getPendingResources } from '@/actions/pending-tasks/getPendingResources'
import { PendingTasksContent } from './components/PendingTasksContent'

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
 * Comportamiento:
 * - Si hay tareas pendientes: redirige automáticamente a la primera tarea
 * - Si no hay tareas: muestra mensaje de felicitaciones
 *
 * Criterios de tareas pendientes:
 * - Status: completed o failed
 * - Confidence: empty o needs_revision
 * - Ordenados de más antiguo a más reciente
 */
export default async function PendingTasksPage({}: PendingTasksPageProps) {
  // Validar acceso de administrador
  const adminUser = await requireAdminAccess()

  // Obtener recursos pendientes para decidir navegación
  const response = await getPendingResources()

  if (response.success && response.data) {
    const { resources, total } = response.data

    console.log(`PendingTasksPage: ${total} tareas pendientes encontradas`)

    // Si hay tareas pendientes, redirigir a la primera tarea
    if (total > 0 && resources[0]) {
      console.log(`PendingTasksPage: Redirigiendo a la primera tarea pendiente: ${resources[0].id}`)
      redirect(`/pending-tasks/${resources[0].id}`)
    }
  }

  // Si no hay tareas pendientes, renderizar directamente el contenido
  return <PendingTasksContent adminUser={adminUser} />
}
