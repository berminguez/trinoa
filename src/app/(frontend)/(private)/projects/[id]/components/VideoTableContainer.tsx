'use client'

import { useState, useCallback } from 'react'
import { DocumentTable } from './VideoTable'
import type { Resource } from '@/payload-types'
import { toast } from 'sonner'

interface DocumentTableContainerProps {
  initialResources: Resource[]
  projectId: string
  onResourceAdded?: (resource: Resource) => void
  onResourceUploadFailed?: (tempResourceId: string) => void
  onPreResourceRefreshNeeded?: () => void
  getProjectResourcesAction?: (
    projectId: string,
  ) => Promise<{ success: boolean; data?: Resource[]; error?: string }>
}

export function DocumentTableContainer({
  initialResources,
  projectId,
  onResourceAdded,
  onResourceUploadFailed,
  onPreResourceRefreshNeeded,
  getProjectResourcesAction,
}: DocumentTableContainerProps) {
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

  // Función para refrescar resources desde la base de datos
  const resetResources = useCallback(async () => {
    if (!getProjectResourcesAction) {
      console.warn('⚠️ [RESOURCES] No refresh action provided, keeping current state')
      return
    }

    try {
      console.log('🔄 [RESOURCES] Refreshing resources from database...')
      const result = await getProjectResourcesAction(projectId)

      if (result.success && result.data) {
        setResources(result.data)
        console.log(`✅ [RESOURCES] Refreshed ${result.data.length} resources`)
      } else {
        console.warn('⚠️ [RESOURCES] Failed to refresh resources:', result.error)
        // En caso de error, mantener el estado actual en lugar de volver a initialResources
        toast.error('Error al actualizar la lista de documentos')
      }
    } catch (error) {
      console.error('❌ [RESOURCES] Error refreshing resources:', error)
      toast.error('Error al actualizar la lista de documentos')
    }
  }, [projectId, getProjectResourcesAction])

  // Función para refrescar pre-resources inmediatamente (ej: después de subir)
  const triggerPreResourcesRefresh = useCallback(() => {
    console.log('🔄 [PRE-RESOURCES] Triggering immediate refresh...')

    // Notificar al componente padre si existe el callback
    if (onPreResourceRefreshNeeded) {
      onPreResourceRefreshNeeded()
    }

    // También enviar evento personalizado para que el DocumentTable pueda escuchar
    window.dispatchEvent(new CustomEvent('refreshPreResources', { detail: { projectId } }))
  }, [projectId, onPreResourceRefreshNeeded])

  return (
    <DocumentTable
      resources={resources}
      projectId={projectId}
      onAddResource={addResource}
      onUpdateResource={updateResource}
      onRemoveResource={removeResource}
      onResetResources={resetResources}
      onResourceUploadFailed={handleResourceUploadFailed}
      onTriggerPreResourcesRefresh={triggerPreResourcesRefresh}
    />
  )
}
