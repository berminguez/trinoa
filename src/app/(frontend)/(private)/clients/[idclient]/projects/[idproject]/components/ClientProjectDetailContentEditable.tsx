'use client'

import { useState, useCallback, useRef } from 'react'
import type { User, Project, Resource } from '@/payload-types'
import { AdminBreadcrumbs } from '@/components'
import { ClientProjectDetailHeaderEditable } from './ClientProjectDetailHeaderEditable'
import {
  ClientProjectResourcesTableContainer,
  type ClientProjectResourcesTableContainerRef,
} from './ClientProjectResourcesTableContainer'

interface ClientProjectDetailContentEditableProps {
  project: Project
  client: User
  adminUser: User
  initialResources: Resource[]
}

/**
 * Contenido principal editable para detalle de proyecto en contexto administrativo
 *
 * Versión completa con capacidades de edición, upload y gestión de recursos
 * para administradores
 */
export function ClientProjectDetailContentEditable({
  project,
  client,
  adminUser,
  initialResources,
}: ClientProjectDetailContentEditableProps) {
  const [totalResources, setTotalResources] = useState(initialResources.length)
  const tableRef = useRef<ClientProjectResourcesTableContainerRef>(null)

  // Callbacks para manejar cambios en recursos
  const handleResourceAdded = useCallback((resource: Resource) => {
    // Agregar recurso a la tabla mediante ref
    tableRef.current?.addResource(resource)
    setTotalResources((prev) => prev + 1)
    console.log('ClientProjectDetailContentEditable: Recurso añadido', resource.id)
  }, [])

  const handleResourceUploadFailed = useCallback((tempResourceId: string) => {
    // Marcar recurso como fallido en la tabla mediante ref
    tableRef.current?.markResourceAsFailed(tempResourceId)
    console.log('ClientProjectDetailContentEditable: Falló subida de recurso', tempResourceId)
  }, [])

  const handleResourceUploaded = useCallback((resource: Resource) => {
    // Agregar recurso a la tabla mediante ref
    tableRef.current?.addResource(resource)
    console.log('ClientProjectDetailContentEditable: Recurso subido exitosamente', resource.id)
  }, [])

  return (
    <div className='flex-1 space-y-6 p-4 pt-6'>
      {/* Breadcrumb de navegación administrativa */}
      {AdminBreadcrumbs.projectDetail(
        client.name || client.email,
        client.id,
        project.title,
        project.id,
      )}

      {/* Header editable del proyecto */}
      <ClientProjectDetailHeaderEditable
        project={project}
        client={client}
        adminUser={adminUser}
        totalResources={totalResources}
        onResourceAdded={handleResourceAdded}
        onResourceUploadFailed={handleResourceUploadFailed}
        onResourceUploaded={handleResourceUploaded}
        documentTableRef={tableRef}
      />

      {/* Tabla de recursos con funcionalidad administrativa */}
      <ClientProjectResourcesTableContainer
        ref={tableRef}
        project={project}
        client={client}
        adminUser={adminUser}
        initialResources={initialResources}
      />
    </div>
  )
}
