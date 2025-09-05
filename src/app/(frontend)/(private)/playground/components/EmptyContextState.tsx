'use client'

import { IconFolderPlus, IconUpload, IconArrowRight, IconAlertCircle } from '@tabler/icons-react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useTranslations } from 'next-intl'

interface EmptyContextStateProps {
  type?: 'no_projects' | 'no_videos' | 'no_content'
  className?: string
  compact?: boolean
}

/**
 * Componente que muestra un estado vacío cuando el usuario no tiene proyectos ni videos
 * Incluye CTAs para guiar al usuario a crear contenido
 */
export default function EmptyContextState({
  type = 'no_content',
  className = '',
  compact = false,
}: EmptyContextStateProps) {
  const t = useTranslations('playground.emptyState')

  // Configuración por tipo de estado vacío
  const config = {
    no_projects: {
      icon: IconFolderPlus,
      title: t('noProjects.title'),
      description: t('noProjects.description'),
      ctaText: t('noProjects.ctaText'),
      ctaHref: '/projects',
      badge: t('noProjects.badge'),
      color: 'blue',
    },
    no_videos: {
      icon: IconUpload,
      title: t('noVideos.title'),
      description: t('noVideos.description'),
      ctaText: t('noVideos.ctaText'),
      ctaHref: '/projects',
      badge: t('noVideos.badge'),
      color: 'green',
    },
    no_content: {
      icon: IconAlertCircle,
      title: t('noContent.title'),
      description: t('noContent.description'),
      ctaText: t('noContent.ctaText'),
      ctaHref: '/projects',
      badge: t('noContent.badge'),
      color: 'gray',
    },
  }

  const currentConfig = config[type]
  const IconComponent = currentConfig.icon

  // Versión compacta para espacios reducidos
  if (compact) {
    return (
      <div className={`text-center py-6 px-4 ${className}`}>
        <div className='flex flex-col items-center gap-3'>
          <IconComponent className='h-8 w-8 text-gray-400' />
          <div>
            <h3 className='text-sm font-medium text-gray-900 mb-1'>{currentConfig.title}</h3>
            <p className='text-xs text-gray-500 mb-3 max-w-xs leading-relaxed'>
              {currentConfig.description}
            </p>
            <Link href={currentConfig.ctaHref}>
              <Button size='sm' className='text-xs'>
                {currentConfig.ctaText}
                <IconArrowRight className='h-3 w-3 ml-1' />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Versión completa
  return (
    <Card className={`p-8 text-center ${className}`}>
      <div className='flex flex-col items-center gap-6 max-w-md mx-auto'>
        {/* Icono principal */}
        <div
          className={`p-4 rounded-full bg-${currentConfig.color}-50 border border-${currentConfig.color}-200`}
        >
          <IconComponent className={`h-12 w-12 text-${currentConfig.color}-600`} />
        </div>

        {/* Badge indicativo */}
        <Badge
          variant='outline'
          className={`text-${currentConfig.color}-700 border-${currentConfig.color}-300`}
        >
          {currentConfig.badge}
        </Badge>

        {/* Contenido textual */}
        <div className='space-y-2'>
          <h2 className='text-xl font-semibold text-gray-900'>{currentConfig.title}</h2>
          <p className='text-gray-600 leading-relaxed'>{currentConfig.description}</p>
        </div>

        {/* Call to Action */}
        <div className='flex flex-col sm:flex-row gap-3 w-full'>
          <Link href={currentConfig.ctaHref} className='flex-1'>
            <Button className='w-full' size='lg'>
              {currentConfig.ctaText}
              <IconArrowRight className='h-4 w-4 ml-2' />
            </Button>
          </Link>
        </div>

        {/* Información adicional */}
        <div className='text-xs text-gray-500 space-y-1'>
          <p>
            💡 <strong>Tip:</strong> Los proyectos te permiten organizar tus videos por temas
          </p>
          <p>
            🎥 <strong>Formatos soportados:</strong> MP4, AVI, MOV, PDF, PPT
          </p>
        </div>
      </div>
    </Card>
  )
}

/**
 * Variante específica para cuando no hay proyectos
 */
export function NoProjectsState({
  className = '',
  compact = false,
}: {
  className?: string
  compact?: boolean
}) {
  return <EmptyContextState type='no_projects' className={className} compact={compact} />
}

/**
 * Variante específica para cuando no hay videos en un proyecto
 */
export function NoVideosState({
  className = '',
  compact = false,
}: {
  className?: string
  compact?: boolean
}) {
  return <EmptyContextState type='no_videos' className={className} compact={compact} />
}

/**
 * Variante específica para cuando no hay contenido en absoluto
 */
export function NoContentState({
  className = '',
  compact = false,
}: {
  className?: string
  compact?: boolean
}) {
  return <EmptyContextState type='no_content' className={className} compact={compact} />
}

/**
 * Componente inteligente que decide qué estado mostrar basado en props
 */
export function SmartEmptyState({
  hasProjects = false,
  hasVideos = false,
  selectedProjectEmpty = false,
  className = '',
  compact = false,
}: {
  hasProjects?: boolean
  hasVideos?: boolean
  selectedProjectEmpty?: boolean
  className?: string
  compact?: boolean
}) {
  // Lógica de decisión para el tipo de estado
  let stateType: 'no_projects' | 'no_videos' | 'no_content'

  if (!hasProjects) {
    stateType = 'no_projects'
  } else if (selectedProjectEmpty) {
    stateType = 'no_videos'
  } else if (!hasVideos) {
    stateType = 'no_content'
  } else {
    // Fallback - no debería llegar aquí si se usa correctamente
    stateType = 'no_content'
  }

  return <EmptyContextState type={stateType} className={className} compact={compact} />
}
