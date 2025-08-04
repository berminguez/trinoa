'use client'

import { IconFolder, IconFolders } from '@tabler/icons-react'
import React from 'react'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { usePlaygroundContextStore } from '@/stores/playground-context-store'
import type { PlaygroundProject, ProjectSelectorOption } from '@/types/playground'

interface ProjectSelectorProps {
  className?: string
  disabled?: boolean
}

export default function ProjectSelector({
  className = '',
  disabled = false,
}: ProjectSelectorProps) {
  const {
    selectedProject,
    availableProjects,
    isLoadingProjects,
    projectsError,
    setSelectedProject,
  } = usePlaygroundContextStore()

  // Crear opciones para el selector
  const selectorOptions: ProjectSelectorOption[] = React.useMemo(() => {
    const options: ProjectSelectorOption[] = [
      {
        value: null,
        label: 'Todos los proyectos',
      },
    ]

    // Agregar proyectos disponibles
    availableProjects.forEach((project) => {
      options.push({
        value: project.id,
        label: project.title,
        project,
      })
    })

    return options
  }, [availableProjects])

  // Manejar cambio de selección
  const handleValueChange = (value: string) => {
    if (value === 'all') {
      // "Todos los proyectos"
      setSelectedProject(null)
    } else {
      // Proyecto específico
      const project = availableProjects.find((p) => p.id === value)
      if (project) {
        setSelectedProject(project)
      }
    }
  }

  // Obtener valor actual para el selector
  const currentValue = selectedProject ? selectedProject.id : 'all'

  // Estado de loading
  if (isLoadingProjects) {
    return (
      <div className={`space-y-2 ${className}`}>
        <div className='text-xs text-gray-500 font-medium'>Proyecto</div>
        <Skeleton className='h-9 w-full' />
      </div>
    )
  }

  // Estado de error
  if (projectsError) {
    return (
      <div className={`space-y-2 ${className}`}>
        <div className='text-xs text-gray-500 font-medium'>Proyecto</div>
        <div className='h-9 px-3 py-2 border border-red-200 bg-red-50 rounded-md flex items-center text-sm text-red-600'>
          <IconFolder className='h-4 w-4 mr-2' />
          Error cargando proyectos
        </div>
      </div>
    )
  }

  // Sin proyectos disponibles
  if (availableProjects.length === 0) {
    return (
      <div className={`space-y-2 ${className}`}>
        <div className='text-xs text-gray-500 font-medium'>Proyecto</div>
        <div className='h-9 px-3 py-2 border border-gray-200 bg-gray-50 rounded-md flex items-center text-sm text-gray-500'>
          <IconFolder className='h-4 w-4 mr-2' />
          No tienes proyectos
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className='text-xs text-gray-500 font-medium'>Proyecto</div>
      <Select value={currentValue} onValueChange={handleValueChange} disabled={disabled}>
        <SelectTrigger className='w-full'>
          <SelectValue placeholder='Seleccionar proyecto' className='truncate' />
        </SelectTrigger>
        <SelectContent>
          {/* Opción "Todos los proyectos" */}
          <SelectItem value='all'>
            <div className='flex items-center gap-2'>
              <IconFolders className='h-4 w-4 text-gray-600' />
              <span>Todos los proyectos</span>
              <span className='text-xs text-gray-400 ml-auto'>({availableProjects.length})</span>
            </div>
          </SelectItem>

          {/* Proyectos individuales */}
          {availableProjects.map((project) => (
            <SelectItem key={project.id} value={project.id}>
              <div className='flex items-center gap-2'>
                <IconFolder className='h-4 w-4 text-gray-600' />
                <span className='truncate'>{project.title}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
