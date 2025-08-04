'use client'

import { IconFolder, IconVideo, IconAlertCircle, IconLoader2 } from '@tabler/icons-react'

import { useContextDisplay } from '@/hooks/usePlaygroundContext'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface ContextIndicatorProps {
  className?: string
  variant?: 'compact' | 'full'
}

/**
 * Componente que muestra indicadores sutiles del contexto activo en el playground
 * Se integra en el área del input para mostrar qué proyectos/videos están seleccionados
 */
export default function ContextIndicator({
  className = '',
  variant = 'compact',
}: ContextIndicatorProps) {
  const { displayState, description } = useContextDisplay()

  // Variante compacta: solo texto descriptivo
  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-2 text-xs text-gray-500 ${className}`}>
        <IconFolder className='h-3 w-3 flex-shrink-0' />
        <span className='truncate'>{description}</span>
      </div>
    )
  }

  // Variante completa: con más detalles e iconos
  return (
    <Card className={`p-3 bg-blue-50 border-blue-200 ${className}`}>
      <div className='flex items-start gap-3'>
        <div className='flex-shrink-0'>
          {displayState.type === 'all_projects' ? (
            <IconFolder className='h-4 w-4 text-blue-600' />
          ) : (
            <IconVideo className='h-4 w-4 text-blue-600' />
          )}
        </div>

        <div className='flex-1 min-w-0'>
          <div className='flex items-center gap-2 mb-1'>
            <h4 className='text-sm font-medium text-blue-900'>Contexto de búsqueda</h4>
            <Badge variant='secondary' className='text-xs'>
              {displayState.type === 'all_projects' ? 'Global' : 'Específico'}
            </Badge>
          </div>

          <p className='text-xs text-blue-700 leading-relaxed'>{description}</p>

          {/* Mostrar detalles adicionales según el tipo */}
          {displayState.type === 'specific_project_with_videos' && (
            <div className='flex items-center gap-2 mt-2'>
              <div className='flex items-center gap-1 text-xs text-blue-600'>
                <IconFolder className='h-3 w-3' />
                <span>{displayState.projectName}</span>
              </div>
              <div className='flex items-center gap-1 text-xs text-blue-600'>
                <IconVideo className='h-3 w-3' />
                <span>
                  {displayState.videoCount} video{displayState.videoCount !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}

/**
 * Indicador de estado de carga para el contexto
 */
export function ContextLoadingIndicator({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 text-xs text-gray-500 ${className}`}>
      <IconLoader2 className='h-3 w-3 animate-spin flex-shrink-0' />
      <span>Cargando contexto...</span>
    </div>
  )
}

/**
 * Indicador de error para el contexto
 */
export function ContextErrorIndicator({
  error,
  className = '',
}: {
  error: string
  className?: string
}) {
  return (
    <div className={`flex items-center gap-2 text-xs text-red-600 ${className}`}>
      <IconAlertCircle className='h-3 w-3 flex-shrink-0' />
      <span className='truncate'>{error}</span>
    </div>
  )
}

/**
 * Indicador para estado vacío (sin proyectos/videos)
 */
export function ContextEmptyIndicator({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 text-xs text-gray-400 ${className}`}>
      <IconAlertCircle className='h-3 w-3 flex-shrink-0' />
      <span>Sin proyectos disponibles</span>
    </div>
  )
}

/**
 * Indicador principal que maneja todos los estados
 */
export function SmartContextIndicator({
  isLoading = false,
  hasError = false,
  isEmpty = false,
  error = '',
  className = '',
  variant = 'compact',
}: {
  isLoading?: boolean
  hasError?: boolean
  isEmpty?: boolean
  error?: string
  className?: string
  variant?: 'compact' | 'full'
}) {
  // Estados prioritarios
  if (isLoading) {
    return <ContextLoadingIndicator className={className} />
  }

  if (hasError && error) {
    return <ContextErrorIndicator error={error} className={className} />
  }

  if (isEmpty) {
    return <ContextEmptyIndicator className={className} />
  }

  // Estado normal: mostrar contexto
  return <ContextIndicator className={className} variant={variant} />
}
