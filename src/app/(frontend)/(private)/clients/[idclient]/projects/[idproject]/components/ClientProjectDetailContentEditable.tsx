'use client'

import { useState, useCallback } from 'react'
import type { User, Project, Resource } from '@/payload-types'
import { AdminBreadcrumbs } from '@/components'
import { ClientProjectDetailHeaderEditable } from './ClientProjectDetailHeaderEditable'
import { ClientProjectResourcesTableContainer } from './ClientProjectResourcesTableContainer'

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

  // Callbacks para manejar cambios en recursos
  const handleResourceAdded = useCallback((resource: Resource) => {
    setTotalResources((prev) => prev + 1)
    console.log('ClientProjectDetailContentEditable: Recurso añadido', resource.id)
  }, [])

  const handleResourceUploadFailed = useCallback((tempResourceId: string) => {
    console.log('ClientProjectDetailContentEditable: Falló subida de recurso', tempResourceId)
  }, [])

  const handleResourceUploaded = useCallback((resource: Resource) => {
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
      />

      {/* Tabla de recursos con funcionalidad administrativa */}
      <ClientProjectResourcesTableContainer
        project={project}
        client={client}
        adminUser={adminUser}
        initialResources={initialResources}
      />
    </div>
  )
}
