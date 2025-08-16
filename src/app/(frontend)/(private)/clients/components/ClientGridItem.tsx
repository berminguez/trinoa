import Link from 'next/link'
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  IconUser,
  IconFolder,
  IconCalendar,
  IconClock,
  IconMail,
  IconTrendingUp,
  IconChevronRight,
  IconCircleCheck,
  IconClock12,
} from '@tabler/icons-react'
import type { ClientWithStats } from '@/actions/clients/types'

interface ClientGridItemProps {
  client: ClientWithStats
}

/**
 * Tarjeta individual de cliente en el grid administrativo
 *
 * Componente completamente funcional con información detallada del cliente,
 * estadísticas, estado de actividad y navegación hacia sus proyectos
 */
export function ClientGridItem({ client }: ClientGridItemProps) {
  // Formateo de datos del cliente
  const clientName = client.name || 'Usuario sin nombre'
  const displayEmail = client.email
  const joinDate = new Date(client.createdAt).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

  // Formateo de estadísticas
  const projectCount = client.projectCount || 0
  const lastActivity = client.lastActivity
    ? new Date(client.lastActivity).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null

  // Cálculo de tiempo desde registro
  const daysSinceJoin = Math.floor(
    (Date.now() - new Date(client.createdAt).getTime()) / (1000 * 60 * 60 * 24),
  )

  // Determinar color del avatar basado en rol
  const avatarColor =
    {
      admin: 'bg-red-100 text-red-600',
      user: 'bg-blue-100 text-blue-600',
      api: 'bg-purple-100 text-purple-600',
    }[client.role] || 'bg-gray-100 text-gray-600'

  // Determinar badge variant basado en rol
  const badgeVariant =
    client.role === 'admin' ? 'destructive' : client.role === 'api' ? 'outline' : 'secondary'

  return (
    <div className='group cursor-pointer'>
      <Card className='h-full hover:shadow-lg transition-all duration-200 border-2 hover:border-primary/20 group-hover:bg-gradient-to-br group-hover:from-background group-hover:to-muted/30'>
        <CardHeader className='pb-4'>
          {/* Header con avatar y badge */}
          <div className='flex items-start justify-between mb-2'>
            <div className='flex items-center space-x-3 flex-1 min-w-0'>
              <div
                className={`h-12 w-12 rounded-full flex items-center justify-center ${avatarColor} ring-2 ring-background shadow-sm`}
              >
                <IconUser className='h-6 w-6' />
              </div>
              <div className='flex-1 min-w-0'>
                <h3 className='font-semibold text-base truncate group-hover:text-primary transition-colors'>
                  {clientName}
                </h3>
                <div className='flex items-center space-x-1 text-sm text-muted-foreground'>
                  <IconMail className='h-3 w-3 flex-shrink-0' />
                  <span className='truncate'>{displayEmail}</span>
                </div>
              </div>
            </div>
            <Badge variant={badgeVariant} className='flex-shrink-0 ml-2'>
              {client.role.toUpperCase()}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className='space-y-4 pb-4'>
          {/* Estadísticas principales */}
          <div className='grid grid-cols-2 gap-3'>
            {/* Proyectos */}
            <div className='flex flex-col space-y-1'>
              <div className='flex items-center space-x-2'>
                <IconFolder className='h-4 w-4 text-primary' />
                <span className='text-sm font-medium text-muted-foreground'>Proyectos</span>
              </div>
              <span className='text-lg font-bold text-foreground pl-6'>{projectCount}</span>
            </div>

            {/* Estado de actividad */}
            <div className='flex flex-col space-y-1'>
              <div className='flex items-center space-x-2'>
                <IconCircleCheck className='h-4 w-4 text-primary' />
                <span className='text-sm font-medium text-muted-foreground'>Estado</span>
              </div>
              <div className='pl-6'>
                <span
                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    client.isActive
                      ? 'bg-green-100 text-green-800 border border-green-200'
                      : 'bg-gray-100 text-gray-600 border border-gray-200'
                  }`}
                >
                  {client.isActive ? (
                    <>
                      <IconCircleCheck className='h-3 w-3 mr-1' />
                      Activo
                    </>
                  ) : (
                    <>
                      <IconClock12 className='h-3 w-3 mr-1' />
                      Inactivo
                    </>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Información temporal */}
          <div className='space-y-2 pt-2 border-t border-muted'>
            {/* Fecha de registro */}
            <div className='flex items-center space-x-2 text-sm text-muted-foreground'>
              <IconCalendar className='h-4 w-4' />
              <span>Registrado el {joinDate}</span>
              <span className='text-xs opacity-70'>
                (
                {daysSinceJoin === 0
                  ? 'hoy'
                  : `hace ${daysSinceJoin} día${daysSinceJoin !== 1 ? 's' : ''}`}
                )
              </span>
            </div>

            {/* Última actividad */}
            <div className='flex items-center space-x-2 text-sm text-muted-foreground'>
              <IconClock className='h-4 w-4' />
              <span>
                {lastActivity ? `Última actividad: ${lastActivity}` : 'Sin actividad reciente'}
              </span>
            </div>
          </div>

          {/* Métricas adicionales */}
          {projectCount > 0 && (
            <div className='flex items-center justify-between p-3 bg-muted/50 rounded-lg'>
              <div className='flex items-center space-x-2'>
                <IconTrendingUp className='h-4 w-4 text-green-600' />
                <span className='text-sm font-medium'>
                  {projectCount > 1 ? 'Usuario activo' : 'Usuario nuevo'}
                </span>
              </div>
              <span className='text-xs text-muted-foreground'>
                {projectCount > 5 ? 'Alto uso' : projectCount > 1 ? 'Uso moderado' : 'Uso inicial'}
              </span>
            </div>
          )}
        </CardContent>

        {/* Footer con botón de acción */}
        <CardFooter className='pt-2'>
          <Link href={`/clients/${client.id}/projects`} className='w-full'>
            <Button
              variant='outline'
              className='w-full group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all duration-200'
            >
              <span>Ver proyectos</span>
              <IconChevronRight className='h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform duration-200' />
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
