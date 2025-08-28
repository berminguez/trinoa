import type { User } from '@/payload-types'
import { AdminBreadcrumb } from '@/components/admin-breadcrumb'
import { PendingTasksHeader } from './PendingTasksHeader'
import { PendingTasksEmpty } from './PendingTasksEmpty'

interface PendingTasksContentProps {
  adminUser: User
}

/**
 * Contenido para mostrar cuando no hay tareas pendientes
 *
 * Este componente solo se muestra cuando no hay tareas pendientes.
 * Si hay tareas, el page.tsx redirige automáticamente a la primera tarea.
 */
export function PendingTasksContent({ adminUser }: PendingTasksContentProps) {
  // Si llegamos aquí, es porque no hay tareas pendientes
  // (la redirección se maneja en page.tsx)

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
