'use client'

import React from 'react'

import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { usePlaygroundContext } from '@/hooks/usePlaygroundContext'

import ProjectSelector from './ProjectSelector'
import VideoSelector from './VideoSelector'
import { SmartEmptyState } from './EmptyContextState'

interface ContextSelectorsProps {
  className?: string
  disabled?: boolean
}

export default function ContextSelectors({
  className = '',
  disabled = false,
}: ContextSelectorsProps) {
  const {
    state: { availableProjects, availableVideos, selectedProject, filteredVideos },
    computed: { isEmpty, isLoading },
  } = usePlaygroundContext()

  // Si está cargando, mostrar selectores normales (con sus estados de loading internos)
  if (isLoading) {
    return (
      <Card className={`p-3 bg-white border-gray-200 ${className}`}>
        {/* Header */}
        <div className='mb-3'>
          <h3 className='text-sm font-medium text-gray-700 mb-1'>Contexto de búsqueda</h3>
          <p className='text-xs text-gray-500'>
            Selecciona proyectos y videos para enfocar las respuestas de la IA
          </p>
        </div>

        {/* Selectores con loading */}
        <div className='space-y-3'>
          <ProjectSelector disabled={disabled} />
          <Separator className='my-3' />
          <VideoSelector disabled={disabled} />
        </div>
      </Card>
    )
  }

  // Si no hay contenido, mostrar estado vacío
  if (isEmpty) {
    return (
      <Card className={`p-3 bg-white border-gray-200 ${className}`}>
        <SmartEmptyState
          hasProjects={availableProjects.length > 0}
          hasVideos={availableVideos.length > 0}
          selectedProjectEmpty={selectedProject !== null && filteredVideos.length === 0}
          compact={true}
        />
      </Card>
    )
  }

  // Estado normal: mostrar selectores
  return (
    <Card className={`p-3 bg-white border-gray-200 ${className}`}>
      {/* Header */}
      <div className='mb-3'>
        <h3 className='text-sm font-medium text-gray-700 mb-1'>Contexto de búsqueda</h3>
        <p className='text-xs text-gray-500'>
          Selecciona proyectos y videos para enfocar las respuestas de la IA
        </p>
      </div>

      {/* Selectores */}
      <div className='space-y-3'>
        {/* Selector de Proyectos */}
        <ProjectSelector disabled={disabled} />

        {/* Separador visual */}
        <Separator className='my-3' />

        {/* Selector de Videos */}
        <VideoSelector disabled={disabled} />
      </div>
    </Card>
  )
}
