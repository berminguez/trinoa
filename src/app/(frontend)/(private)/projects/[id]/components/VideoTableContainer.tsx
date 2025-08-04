'use client'

import { useState, useCallback } from 'react'
import { VideoTable } from './VideoTable'
import type { Resource } from '@/payload-types'

interface VideoTableContainerProps {
  initialResources: Resource[]
  projectId: string
  onResourceAdded?: (resource: Resource) => void
  onResourceUploadFailed?: (tempResourceId: string) => void
}

export function VideoTableContainer({
  initialResources,
  projectId,
  onResourceAdded,
  onResourceUploadFailed,
}: VideoTableContainerProps) {
  // Estado local para manejar los recursos con optimistic updates
  const [resources, setResources] = useState<Resource[]>(initialResources)

  // Función para añadir un nuevo recurso (optimistic update)
  const addResource = useCallback(
    (newResource: any) => {
      setResources((prev) => {
        // Si el recurso tiene _replacesTempId, reemplazar el temporal
        if (newResource._replacesTempId) {
          return prev.map((resource) =>
            resource.id === newResource._replacesTempId
              ? { ...newResource, _replacesTempId: undefined } // Limpiar el marcador
              : resource,
          )
        }

        // Si es un recurso nuevo (temporal o real), añadir al principio
        return [newResource, ...prev]
      })

      // También llamar el callback externo si existe
      if (onResourceAdded) {
        onResourceAdded(newResource)
      }
    },
    [onResourceAdded],
  )

  // Función para rollback: remover recurso temporal fallido
  const handleResourceUploadFailed = useCallback(
    (tempResourceId: string) => {
      setResources((prev) => prev.filter((resource) => resource.id !== tempResourceId))

      // También llamar el callback externo si existe
      if (onResourceUploadFailed) {
        onResourceUploadFailed(tempResourceId)
      }
    },
    [onResourceUploadFailed],
  )

  // Función para actualizar un recurso existente
  const updateResource = useCallback((resourceId: string, updates: Partial<Resource>) => {
    setResources((prev) =>
      prev.map((resource) => (resource.id === resourceId ? { ...resource, ...updates } : resource)),
    )
  }, [])

  // Función para remover un recurso
  const removeResource = useCallback((resourceId: string) => {
    setResources((prev) => prev.filter((resource) => resource.id !== resourceId))
  }, [])

  // Función para resetear a los datos iniciales (en caso de error)
  const resetResources = useCallback(() => {
    setResources(initialResources)
  }, [initialResources])

  return (
    <VideoTable
      resources={resources}
      projectId={projectId}
      onAddResource={addResource}
      onUpdateResource={updateResource}
      onRemoveResource={removeResource}
      onResetResources={resetResources}
      onResourceUploadFailed={handleResourceUploadFailed}
    />
  )
}
