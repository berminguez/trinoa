import Link from 'next/link'
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ConfidenceStats } from '@/components/ui/confidence-badge'
import { Button } from '@/components/ui/button'
import {
  IconFolder,
  IconCalendar,
  IconClock,
  IconUser,
  IconChevronRight,
  IconFileText,
  IconVideo,
} from '@tabler/icons-react'
import type { User, Project } from '@/payload-types'

interface ProjectConfidenceStats {
  empty?: number
  needs_revision?: number
  trusted?: number
  verified?: number
  total?: number
}

interface ClientProjectGridItemProps {
  project: Project
  client: User
  confidenceStats?: ProjectConfidenceStats
}

/**
 * Tarjeta individual de proyecto en el contexto administrativo
 *
 * Adaptado de ProjectGridItem para mostrar información adicional
 * del cliente y navegación hacia el detalle administrativo
 */
export function ClientProjectGridItem({
  project,
  client,
  confidenceStats,
}: ClientProjectGridItemProps) {
  // Formateo de datos del proyecto
  const projectTitle = project.title || 'Proyecto sin título'
  const createdDate = new Date(project.createdAt).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

  // Usar lastActivity si está disponible (calculado con recursos), sino usar updatedAt
  const lastActivityDate = (project as any).lastActivity || project.updatedAt
  const updatedDate = lastActivityDate
    ? new Date(lastActivityDate).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null

  // Calcular días desde creación
  const daysSinceCreation = Math.floor(
    (Date.now() - new Date(project.createdAt).getTime()) / (1000 * 60 * 60 * 24),
  )

  // Determinar tipo de proyecto basado en datos (placeholder)
  const projectType = 'video' // En futuro se podría determinar del contenido

  return (
    <div className='group cursor-pointer'>
      <Card className='h-full hover:shadow-lg transition-all duration-200 border-2 hover:border-primary/20 group-hover:bg-gradient-to-br group-hover:from-background group-hover:to-muted/30'>
        <Link href={`/clients/${client.id}/projects/${project.id}`} className='w-full'>
          <CardHeader className='pb-4'>
            {/* Header con información del proyecto */}
            <div className='flex items-start justify-between mb-2'>
              <div className='flex items-center space-x-3 flex-1 min-w-0'>
                <div className='h-12 w-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shadow-sm'>
                  {projectType === 'video' ? (
                    <IconVideo className='h-6 w-6' />
                  ) : (
                    <IconFileText className='h-6 w-6' />
                  )}
                </div>
                <div className='flex-1 min-w-0'>
                  <h3 className='font-semibold text-base truncate group-hover:text-primary transition-colors'>
                    {projectTitle}
                  </h3>
                  <div className='flex items-center space-x-1 text-sm text-muted-foreground'>
                    <IconUser className='h-3 w-3 flex-shrink-0' />
                    <span className='truncate'>{client.name || client.email}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className='space-y-4 pb-4'>
            {/* Información temporal */}
            <div className='space-y-2'>
              {/* Fecha de creación */}
              <div className='flex items-center space-x-2 text-sm text-muted-foreground'>
                <IconCalendar className='h-4 w-4' />
                <span>Creado el {createdDate}</span>
                <span className='text-xs opacity-70'>
                  (
                  {daysSinceCreation === 0
                    ? 'hoy'
                    : `hace ${daysSinceCreation} día${daysSinceCreation !== 1 ? 's' : ''}`}
                  )
                </span>
              </div>

              {/* Última actualización */}
              {updatedDate && (
                <div className='flex items-center space-x-2 text-sm text-muted-foreground'>
                  <IconClock className='h-4 w-4' />
                  <span>Actualizado: {updatedDate}</span>
                </div>
              )}
            </div>

            {/* Información del cliente en contexto admin */}
            <div className='p-3 bg-muted/50 rounded-lg'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center space-x-2'>
                  <IconUser className='h-4 w-4 text-primary' />
                  <span className='text-sm font-medium'>Cliente</span>
                </div>
                <Badge
                  variant={client.role === 'admin' ? 'destructive' : 'secondary'}
                  className='text-xs'
                >
                  {client.role?.toUpperCase() || 'USER'}
                </Badge>
              </div>
              <p className='text-sm text-muted-foreground mt-1 truncate'>{client.email}</p>
            </div>

            {/* Estadísticas del proyecto */}
            <div className='space-y-3'>
              {/* Estadísticas básicas */}
              <div className='grid grid-cols-2 gap-3 text-center'>
                <div className='p-2 bg-muted/30 rounded'>
                  <div className='text-lg font-bold text-green-600'>
                    {confidenceStats?.total || 0}
                  </div>
                  <div className='text-xs text-muted-foreground'>Recursos</div>
                </div>
                <div className='p-2 bg-muted/30 rounded'>
                  <div className='text-lg font-bold text-blue-600'>{daysSinceCreation}d</div>
                  <div className='text-xs text-muted-foreground'>Antigüedad</div>
                </div>
              </div>

              {/* Estadísticas de confidence */}
              {confidenceStats && confidenceStats.total && confidenceStats.total > 0 && (
                <div className='space-y-2'>
                  <div className='text-xs font-medium text-muted-foreground uppercase tracking-wide'>
                    Estado de Confianza
                  </div>
                  <ConfidenceStats
                    stats={confidenceStats}
                    total={confidenceStats.total}
                    className='justify-center flex-wrap gap-1'
                    showPercentages={false}
                  />
                </div>
              )}
            </div>
          </CardContent>

          {/* Footer con botón de acción */}
          <CardFooter className='pt-2'>
            <Button
              variant='outline'
              className='w-full group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all duration-200'
            >
              <IconFolder className='h-4 w-4 mr-2' />
              <span>Ver proyecto</span>
              <IconChevronRight className='h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform duration-200' />
            </Button>
          </CardFooter>
        </Link>
      </Card>
    </div>
  )
}

export type { ProjectConfidenceStats }
