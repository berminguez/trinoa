'use client'

import { IconAlertTriangle, IconTrash, IconEyeOff, IconRefresh } from '@tabler/icons-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface UnavailableContentIndicatorProps {
  type: 'project' | 'video'
  reason?: 'deleted' | 'access_denied' | 'processing_error' | 'unknown'
  title: string
  onRemove?: () => void
  onRetry?: () => void
  compact?: boolean
  className?: string
}

/**
 * Componente que indica cuando un proyecto o video seleccionado ya no está disponible
 */
export default function UnavailableContentIndicator({
  type,
  reason = 'unknown',
  title,
  onRemove,
  onRetry,
  compact = false,
  className = '',
}: UnavailableContentIndicatorProps) {
  // Configuración por razón de no disponibilidad
  const reasonConfig = {
    deleted: {
      icon: IconTrash,
      label: 'Eliminado',
      description: 'Este contenido fue eliminado',
      color: 'red',
      canRetry: false,
    },
    access_denied: {
      icon: IconEyeOff,
      label: 'Sin acceso',
      description: 'No tienes permisos para acceder',
      color: 'orange',
      canRetry: true,
    },
    processing_error: {
      icon: IconAlertTriangle,
      label: 'Error',
      description: 'Error al procesar el contenido',
      color: 'yellow',
      canRetry: true,
    },
    unknown: {
      icon: IconAlertTriangle,
      label: 'No disponible',
      description: 'Contenido temporalmente no disponible',
      color: 'gray',
      canRetry: true,
    },
  }

  const config = reasonConfig[reason]
  const IconComponent = config.icon
  const contentType = type === 'project' ? 'proyecto' : 'video'

  // Versión compacta para uso en listas
  if (compact) {
    return (
      <div
        className={`flex items-center gap-2 p-2 bg-gray-50 rounded-md border-l-4 border-${config.color}-400 ${className}`}
      >
        <IconComponent className={`h-4 w-4 text-${config.color}-600 flex-shrink-0`} />
        <div className='flex-1 min-w-0'>
          <span className='text-sm text-gray-900 truncate'>{title}</span>
          <Badge
            variant='outline'
            className={`ml-2 text-xs text-${config.color}-700 border-${config.color}-300`}
          >
            {config.label}
          </Badge>
        </div>
        {onRemove && (
          <Button
            variant='ghost'
            size='sm'
            onClick={onRemove}
            className='h-6 w-6 p-0 text-gray-500 hover:text-red-600'
          >
            ×
          </Button>
        )}
      </div>
    )
  }

  // Versión completa para uso en cards
  return (
    <Card
      className={`p-4 border-l-4 border-${config.color}-400 bg-${config.color}-50 ${className}`}
    >
      <div className='flex items-start gap-3'>
        <div className={`p-2 rounded-full bg-${config.color}-100`}>
          <IconComponent className={`h-5 w-5 text-${config.color}-600`} />
        </div>

        <div className='flex-1 min-w-0'>
          <div className='flex items-center gap-2 mb-1'>
            <h4 className='text-sm font-medium text-gray-900 truncate'>{title}</h4>
            <Badge
              variant='outline'
              className={`text-xs text-${config.color}-700 border-${config.color}-300`}
            >
              {config.label}
            </Badge>
          </div>

          <p className={`text-xs text-${config.color}-700 mb-2`}>
            {config.description} ({contentType})
          </p>

          <div className='flex items-center gap-2'>
            {config.canRetry && onRetry && (
              <Button
                variant='outline'
                size='sm'
                onClick={onRetry}
                className={`text-xs border-${config.color}-300 text-${config.color}-700 hover:bg-${config.color}-100`}
              >
                <IconRefresh className='h-3 w-3 mr-1' />
                Reintentar
              </Button>
            )}

            {onRemove && (
              <Button
                variant='ghost'
                size='sm'
                onClick={onRemove}
                className='text-xs text-gray-600 hover:text-red-600'
              >
                <IconTrash className='h-3 w-3 mr-1' />
                Quitar
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}

/**
 * Componente específico para proyectos no disponibles
 */
export function UnavailableProject({
  title,
  reason = 'deleted',
  onRemove,
  onRetry,
  compact = false,
  className = '',
}: {
  title: string
  reason?: 'deleted' | 'access_denied' | 'processing_error' | 'unknown'
  onRemove?: () => void
  onRetry?: () => void
  compact?: boolean
  className?: string
}) {
  return (
    <UnavailableContentIndicator
      type='project'
      reason={reason}
      title={title}
      onRemove={onRemove}
      onRetry={onRetry}
      compact={compact}
      className={className}
    />
  )
}

/**
 * Componente específico para videos no disponibles
 */
export function UnavailableVideo({
  title,
  reason = 'deleted',
  onRemove,
  onRetry,
  compact = false,
  className = '',
}: {
  title: string
  reason?: 'deleted' | 'access_denied' | 'processing_error' | 'unknown'
  onRemove?: () => void
  onRetry?: () => void
  compact?: boolean
  className?: string
}) {
  return (
    <UnavailableContentIndicator
      type='video'
      reason={reason}
      title={title}
      onRemove={onRemove}
      onRetry={onRetry}
      compact={compact}
      className={className}
    />
  )
}

/**
 * Wrapper para mostrar múltiples elementos no disponibles
 */
export function UnavailableContentList({
  unavailableProjects = [],
  unavailableVideos = [],
  onRemoveProject,
  onRemoveVideo,
  onRetryProject,
  onRetryVideo,
  className = '',
}: {
  unavailableProjects?: Array<{
    id: string
    title: string
    reason?: 'deleted' | 'access_denied' | 'processing_error' | 'unknown'
  }>
  unavailableVideos?: Array<{
    id: string
    title: string
    reason?: 'deleted' | 'access_denied' | 'processing_error' | 'unknown'
  }>
  onRemoveProject?: (id: string) => void
  onRemoveVideo?: (id: string) => void
  onRetryProject?: (id: string) => void
  onRetryVideo?: (id: string) => void
  className?: string
}) {
  const hasUnavailableContent = unavailableProjects.length > 0 || unavailableVideos.length > 0

  if (!hasUnavailableContent) {
    return null
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Proyectos no disponibles */}
      {unavailableProjects.map((project) => (
        <UnavailableProject
          key={project.id}
          title={project.title}
          reason={project.reason}
          onRemove={() => onRemoveProject?.(project.id)}
          onRetry={() => onRetryProject?.(project.id)}
          compact={true}
        />
      ))}

      {/* Videos no disponibles */}
      {unavailableVideos.map((video) => (
        <UnavailableVideo
          key={video.id}
          title={video.title}
          reason={video.reason}
          onRemove={() => onRemoveVideo?.(video.id)}
          onRetry={() => onRetryVideo?.(video.id)}
          compact={true}
        />
      ))}
    </div>
  )
}
