import type { User } from '@/payload-types'
import { CreateClientModal } from './CreateClientModal'
import { useTranslations } from 'next-intl'

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
  const t = useTranslations('clients')

  return (
    <div className='space-y-2'>
      <div className='flex items-center justify-between'>
        <div>
          <div className='flex items-center gap-3'>
            <h1 className='text-3xl font-bold tracking-tight'>{t('title')}</h1>
            {totalClients !== undefined && (
              <span className='inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800'>
                {totalClients} {totalClients === 1 ? t('stats.client') : t('stats.clients')}
              </span>
            )}
          </div>
          <p className='text-muted-foreground'>{t('description')}</p>
        </div>

        <div className='text-right'>
          <CreateClientModal />
        </div>
      </div>

      {/* Breadcrumb básico - se mejorará con admin-breadcrumb.tsx en tarea 3.3 */}
      <nav className='text-sm text-muted-foreground'>
        <span>{t('breadcrumb.admin')}</span>
        <span className='mx-2'>›</span>
        <span className='font-medium text-foreground'>{t('breadcrumb.clients')}</span>
      </nav>
    </div>
  )
}
