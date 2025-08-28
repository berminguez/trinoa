import { notFound } from 'next/navigation'
import type { User } from '@/payload-types'
import { getPendingResources } from '@/actions/pending-tasks/getPendingResources'
import { AdminBreadcrumb } from '@/components/admin-breadcrumb'
import { PendingTasksHeader } from './PendingTasksHeader'
import { PendingTasksList } from './PendingTasksList'
import { PendingTasksEmpty } from './PendingTasksEmpty'

interface PendingTasksContentProps {
  adminUser: User
  currentResourceId?: string
}

/**
 * Contenido principal para la página de tareas pendientes
 *
 * Muestra todos los recursos que requieren revisión administrativa:
 * - Status: completed o failed
 * - Confidence: empty o needs_revision
 * - Con navegación fácil entre recursos
 * - Mensaje cuando no hay tareas pendientes
 */
export async function PendingTasksContent({
  adminUser,
  currentResourceId,
}: PendingTasksContentProps) {
  try {
    // Obtener recursos pendientes
    const response = await getPendingResources()

    if (!response.success || !response.data) {
      console.error('PendingTasksContent: Error obteniendo recursos pendientes:', response.error)
      notFound()
    }

    const { resources, total } = response.data

    console.log(`PendingTasksContent: ${total} tareas pendientes encontradas`)

    // Si no hay tareas pendientes, mostrar mensaje
    if (total === 0) {
      return (
        <div className='flex-1 space-y-6 p-4 pt-6'>
          <AdminBreadcrumb
            customSegments={[
              { label: 'Dashboard', href: '/dashboard', icon: 'home' },
              { label: 'Tareas Pendientes', icon: 'clipboard-list', isActive: true },
            ]}
          />
          <PendingTasksHeader totalTasks={0} adminUser={adminUser} />
          <PendingTasksEmpty />
        </div>
      )
    }

    // Si no se especifica un recurso actual, usar el primero de la lista
    const resourceToShow = currentResourceId
      ? resources.find((r) => r.id === currentResourceId) || resources[0]
      : resources[0]

    if (!resourceToShow) {
      console.error('PendingTasksContent: No se pudo encontrar el recurso especificado')
      notFound()
    }

    return (
      <div className='flex-1 space-y-6 p-4 pt-6'>
        {/* Breadcrumb de navegación */}
        <AdminBreadcrumb
          customSegments={[
            { label: 'Dashboard', href: '/dashboard', icon: 'home' },
            { label: 'Tareas Pendientes', icon: 'clipboard-list', isActive: true },
          ]}
        />

        {/* Header con información general */}
        <PendingTasksHeader
          totalTasks={total}
          adminUser={adminUser}
          currentTask={resourceToShow}
          currentIndex={resources.findIndex((r) => r.id === resourceToShow.id)}
        />

        {/* Lista y detalle de tareas pendientes */}
        <PendingTasksList
          resources={resources}
          currentResource={resourceToShow}
          adminUser={adminUser}
        />
      </div>
    )
  } catch (error) {
    console.error('PendingTasksContent: Error inesperado:', error)
    notFound()
  }
}
