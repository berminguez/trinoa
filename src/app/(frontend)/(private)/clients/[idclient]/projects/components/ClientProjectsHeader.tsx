import type { User } from '@/payload-types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { IconUser, IconFolder, IconPlus } from '@tabler/icons-react'
import { CreateClientProjectModal } from './CreateClientProjectModal'
import { useTranslations } from 'next-intl'

interface ClientProjectsHeaderProps {
  adminUser: User
  client: User
  totalProjects: number
  onProjectCreated?: () => void
}

/**
 * Header para la página de proyectos de cliente específico
 *
 * Muestra información del cliente y estadísticas de proyectos
 * Adaptado para contexto administrativo
 */
export function ClientProjectsHeader({
  adminUser,
  client,
  totalProjects,
  onProjectCreated,
}: ClientProjectsHeaderProps) {
  const t = useTranslations('clientProjects')
  return (
    <div className='space-y-4'>
      {/* Información del cliente */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
        <div className='space-y-2'>
          <div className='flex items-center gap-3'>
            <div className='h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center'>
              <IconUser className='h-6 w-6 text-primary' />
            </div>
            <div>
              <h1 className='text-3xl font-bold tracking-tight'>
                {client.name || 'Usuario sin nombre'}
              </h1>
              <p className='text-muted-foreground flex items-center gap-2'>
                {client.email}
                <Badge variant={client.role === 'admin' ? 'destructive' : 'secondary'}>
                  {(client.role || 'user').toUpperCase()}
                </Badge>
              </p>
            </div>
          </div>

          <div className='flex items-center gap-2 text-sm text-muted-foreground'>
            <IconFolder className='h-4 w-4' />
            <span>
              {totalProjects} {totalProjects === 1 ? t('stats.project') : t('stats.projects')} total
              {totalProjects === 0 ? ` - ${t('grid.noProjectsDescription')}` : ''}
            </span>
          </div>
        </div>

        {/* Información del administrador y acciones */}
        <div className='flex flex-col items-end gap-3'>
          <div className='text-right'>
            <p className='text-sm text-muted-foreground'>{t('managedBy')}</p>
            <p className='text-sm font-medium text-green-600'>
              {adminUser.name || adminUser.email}
            </p>
            <Badge variant='outline' className='text-xs'>
              {t('administrator')}
            </Badge>
          </div>

          {/* Botón para crear proyecto */}
          <CreateClientProjectModal
            client={client}
            onSuccess={onProjectCreated}
            trigger={
              <Button className='gap-2'>
                <IconPlus className='h-4 w-4' />
                {t('actions.create')}
              </Button>
            }
          />
        </div>
      </div>

      {/* Estadísticas adicionales */}
      <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
        <div className='bg-muted/50 p-4 rounded-lg'>
          <div className='text-2xl font-bold text-primary'>{totalProjects}</div>
          <div className='text-sm text-muted-foreground'>{t('totalProjects')}</div>
        </div>

        <div className='bg-muted/50 p-4 rounded-lg'>
          <div className='text-2xl font-bold text-green-600'>
            {client.role === 'admin' ? 'Admin' : 'Usuario'}
          </div>
          <div className='text-sm text-muted-foreground'>{t('accountType')}</div>
        </div>

        <div className='bg-muted/50 p-4 rounded-lg'>
          <div className='text-2xl font-bold text-blue-600'>
            {new Date(client.createdAt).toLocaleDateString('es-ES', {
              year: 'numeric',
              month: 'short',
            })}
          </div>
          <div className='text-sm text-muted-foreground'>Registrado en</div>
        </div>
      </div>
    </div>
  )
}
