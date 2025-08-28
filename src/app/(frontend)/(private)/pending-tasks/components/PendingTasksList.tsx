'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  IconChevronLeft,
  IconChevronRight,
  IconFileText,
  IconUser,
  IconFolder,
} from '@tabler/icons-react'
import type { User, Resource, Project } from '@/payload-types'
import { ConfidenceBadge } from '@/components/ConfidenceBadge'
import { PendingTaskDetail } from './PendingTaskDetail'

interface PendingTasksListProps {
  resources: Resource[]
  currentResource: Resource
  adminUser: User
}

/**
 * Lista y detalle de tareas pendientes con navegación
 */
export function PendingTasksList({
  resources,
  currentResource: initialResource,
  adminUser,
}: PendingTasksListProps) {
  const router = useRouter()
  const [currentResource, setCurrentResource] = useState(initialResource)
  const [isLoading, setIsLoading] = useState(false)

  const currentIndex = resources.findIndex((r) => r.id === currentResource.id)
  const hasPrev = currentIndex > 0
  const hasNext = currentIndex < resources.length - 1

  // Navegación entre recursos
  const handlePrevious = useCallback(() => {
    if (hasPrev && !isLoading) {
      const prevResource = resources[currentIndex - 1]
      setCurrentResource(prevResource)
    }
  }, [hasPrev, resources, currentIndex, isLoading])

  const handleNext = useCallback(() => {
    if (hasNext && !isLoading) {
      const nextResource = resources[currentIndex + 1]
      setCurrentResource(nextResource)
    }
  }, [hasNext, resources, currentIndex, isLoading])

  // Selección directa de recurso
  const handleSelectResource = useCallback(
    (resource: Resource) => {
      if (!isLoading) {
        setCurrentResource(resource)
      }
    },
    [isLoading],
  )

  // Callback cuando se actualiza un recurso (para removerlo de la lista)
  const handleResourceUpdated = useCallback(() => {
    setIsLoading(true)
    // Recargar la página para actualizar la lista
    router.refresh()
  }, [router])

  // Formatear información del proyecto
  const getProjectInfo = (resource: Resource) => {
    const project = resource.project as Project
    const createdBy = project?.createdBy as User

    return {
      projectTitle: project?.title || 'Sin proyecto',
      clientName: createdBy?.name || createdBy?.email || 'Cliente desconocido',
      clientId: typeof project?.createdBy === 'object' ? project.createdBy.id : project?.createdBy,
    }
  }

  return (
    <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
      {/* Lista de tareas pendientes */}
      <div className='lg:col-span-1'>
        <Card>
          <CardHeader>
            <div className='flex items-center justify-between'>
              <CardTitle className='text-lg'>Lista de Tareas</CardTitle>
              <Badge variant='secondary'>{resources.length}</Badge>
            </div>
          </CardHeader>

          <CardContent className='p-0'>
            <ScrollArea className='h-[600px]'>
              <div className='p-4 space-y-2'>
                {resources.map((resource, index) => {
                  const isSelected = resource.id === currentResource.id
                  const { projectTitle, clientName } = getProjectInfo(resource)

                  return (
                    <button
                      key={resource.id}
                      onClick={() => handleSelectResource(resource)}
                      disabled={isLoading}
                      className={`
                        w-full text-left p-3 rounded-lg border transition-colors
                        ${
                          isSelected
                            ? 'bg-primary/10 border-primary shadow-sm'
                            : 'hover:bg-muted/50 border-border'
                        }
                        ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                      `}
                    >
                      <div className='space-y-2'>
                        <div className='flex items-start justify-between'>
                          <p className='font-medium text-sm line-clamp-2'>{resource.title}</p>
                          <span className='text-xs text-muted-foreground ml-2'>#{index + 1}</span>
                        </div>

                        <div className='flex items-center gap-2 text-xs'>
                          <Badge variant='outline' className='text-xs'>
                            {resource.status}
                          </Badge>
                          <ConfidenceBadge confidence={resource.confidence} size='sm' />
                        </div>

                        <div className='space-y-1 text-xs text-muted-foreground'>
                          <div className='flex items-center gap-1'>
                            <IconFolder className='h-3 w-3' />
                            <span className='truncate'>{projectTitle}</span>
                          </div>
                          <div className='flex items-center gap-1'>
                            <IconUser className='h-3 w-3' />
                            <span className='truncate'>{clientName}</span>
                          </div>
                        </div>

                        <div className='text-xs text-muted-foreground'>
                          {new Date(resource.createdAt).toLocaleDateString('es-ES')}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Detalle de la tarea actual */}
      <div className='lg:col-span-2'>
        <Card>
          <CardHeader>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <IconFileText className='h-5 w-5' />
                <CardTitle className='text-lg'>
                  Tarea {currentIndex + 1} de {resources.length}
                </CardTitle>
              </div>

              <div className='flex items-center gap-2'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={handlePrevious}
                  disabled={!hasPrev || isLoading}
                >
                  <IconChevronLeft className='h-4 w-4' />
                  Anterior
                </Button>

                <Button
                  variant='outline'
                  size='sm'
                  onClick={handleNext}
                  disabled={!hasNext || isLoading}
                >
                  Siguiente
                  <IconChevronRight className='h-4 w-4' />
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <PendingTaskDetail
              resource={currentResource}
              adminUser={adminUser}
              onResourceUpdated={handleResourceUpdated}
              isLoading={isLoading}
              setIsLoading={setIsLoading}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
