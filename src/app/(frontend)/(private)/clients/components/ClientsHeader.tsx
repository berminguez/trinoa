'use client'

import type { User } from '@/payload-types'
import { CreateClientModal } from './CreateClientModal'
import { useTranslations, useLocale } from 'next-intl'
import { useAppTranslations, useLocaleContext } from '@/lib/locale-context'

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
  // Sistema original de next-intl
  const t = useTranslations('clients')
  const currentLocale = useLocale()

  // Nuestro sistema personalizado como fallback
  const { locale: contextLocale } = useLocaleContext()
  const { t: tCustom, locale: customLocale } = useAppTranslations('clients')

  // Debug: comparar ambos sistemas
  console.log('[ClientsHeader] next-intl locale:', currentLocale, 'vs custom locale:', customLocale)
  console.log('[ClientsHeader] context locale:', contextLocale)

  // Usar el sistema personalizado como fallback si next-intl no está funcionando
  const finalT = currentLocale === 'es' && customLocale !== 'es' ? tCustom : t
  const isUsingFallback = currentLocale === 'es' && customLocale !== 'es'

  if (isUsingFallback) {
    console.log('[ClientsHeader] Using custom translation system as fallback')
  }

  return (
    <div className='space-y-2'>
      <div className='flex items-center justify-between'>
        <div>
          <div className='flex items-center gap-3'>
            <h1 className='text-3xl font-bold tracking-tight'>{finalT('title')}</h1>
            {totalClients !== undefined && (
              <span className='inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800'>
                {totalClients}{' '}
                {totalClients === 1 ? finalT('stats.client') : finalT('stats.clients')}
              </span>
            )}
          </div>
          <p className='text-muted-foreground'>{finalT('description')}</p>
        </div>

        <div className='text-right'>
          <CreateClientModal />
        </div>
      </div>

      {/* Breadcrumb básico - se mejorará con admin-breadcrumb.tsx en tarea 3.3 */}
      <nav className='text-sm text-muted-foreground'>
        <span>{finalT('breadcrumb.admin')}</span>
        <span className='mx-2'>›</span>
        <span className='font-medium text-foreground'>{finalT('breadcrumb.clients')}</span>
      </nav>
    </div>
  )
}
