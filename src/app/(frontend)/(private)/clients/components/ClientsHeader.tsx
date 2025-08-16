import type { User } from '@/payload-types'

interface ClientsHeaderProps {
  adminUser: User
  totalClients?: number
}

/**
 * Header para la página de administración de clientes
 *
 * Muestra título, descripción y información del admin autenticado
 * Opcionalmente muestra estadísticas de clientes
 */
export function ClientsHeader({ adminUser, totalClients }: ClientsHeaderProps) {
  return (
    <div className='space-y-2'>
      <div className='flex items-center justify-between'>
        <div>
          <div className='flex items-center gap-3'>
            <h1 className='text-3xl font-bold tracking-tight'>Gestión de Clientes</h1>
            {totalClients !== undefined && (
              <span className='inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800'>
                {totalClients} {totalClients === 1 ? 'cliente' : 'clientes'}
              </span>
            )}
          </div>
          <p className='text-muted-foreground'>
            Administra todos los usuarios y sus proyectos desde este panel
          </p>
        </div>

        <div className='text-right'>
          <p className='text-sm text-muted-foreground'>Administrador conectado</p>
          <p className='font-medium'>{adminUser.name || adminUser.email}</p>
        </div>
      </div>

      {/* Breadcrumb básico - se mejorará con admin-breadcrumb.tsx en tarea 3.3 */}
      <nav className='text-sm text-muted-foreground'>
        <span>Admin</span>
        <span className='mx-2'>›</span>
        <span className='font-medium text-foreground'>Clientes</span>
      </nav>
    </div>
  )
}
