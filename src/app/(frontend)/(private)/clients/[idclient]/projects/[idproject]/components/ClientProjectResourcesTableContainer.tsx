'use client'

import { useState, useCallback } from 'react'
import { ClientProjectResourcesTable } from './ClientProjectResourcesTable'
import type { User, Project, Resource } from '@/payload-types'

interface ClientProjectResourcesTableContainerProps {
  project: Project
  client: User
  adminUser: User
  initialResources: Resource[]
}

/**
 * Container para la tabla de recursos del proyecto con actualizaciones optimistas
 *
 * Adaptado de DocumentTableContainer para contexto administrativo
 * Maneja el estado local de recursos con optimistic updates
 */
export function ClientProjectResourcesTableContainer({
  project,
  client,
  adminUser,
  initialResources,
}: ClientProjectResourcesTableContainerProps) {
  // Estado local para manejar los recursos con optimistic updates
  const [resources, setResources] = useState<Resource[]>(initialResources)

  // Función para añadir un nuevo recurso (optimistic update)
  const addResource = useCallback((newResource: any) => {
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

    console.log('ClientProjectResourcesTableContainer: Recurso añadido', newResource.id)
  }, [])

  // Función para eliminar un recurso (cuando falla la subida)
  const removeResource = useCallback((resourceId: string) => {
    setResources((prev) => prev.filter((resource) => resource.id !== resourceId))
    console.log('ClientProjectResourcesTableContainer: Recurso removido', resourceId)
  }, [])

  // Función para marcar un recurso como fallido
  const markResourceAsFailed = useCallback((resourceId: string) => {
    setResources((prev) =>
      prev.map((resource) =>
        resource.id === resourceId
          ? {
              ...resource,
              // Añadir marcador de error temporal
              _uploadFailed: true,
            }
          : resource,
      ),
    )
    console.log('ClientProjectResourcesTableContainer: Recurso marcado como fallido', resourceId)
  }, [])

  // Función para actualizar un recurso existente
  const updateResource = useCallback((updatedResource: Resource) => {
    setResources((prev) =>
      prev.map((resource) => (resource.id === updatedResource.id ? updatedResource : resource)),
    )
    console.log('ClientProjectResourcesTableContainer: Recurso actualizado', updatedResource.id)
  }, [])

  return (
    <ClientProjectResourcesTable
      project={project}
      client={client}
      adminUser={adminUser}
      initialResources={resources}
      onResourceAdded={addResource}
      onResourceRemoved={removeResource}
      onResourceFailed={markResourceAsFailed}
      onResourceUpdated={updateResource}
    />
  )
}
