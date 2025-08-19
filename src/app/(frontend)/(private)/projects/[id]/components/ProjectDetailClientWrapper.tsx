'use client'

import { useCallback, useState, useRef } from 'react'
import type { Project, Resource, User } from '@/payload-types'
import { getProjectPreResources } from '@/actions/projects/getProjectPreResources'

import { ProjectDetailHeader } from './ProjectDetailHeader'
import { DocumentTableContainer } from './VideoTableContainer'
import type { DocumentTableRef } from './VideoTable'

interface ProjectDetailClientWrapperProps {
  project: Project
  user: User
  initialResources: Resource[]
  projectId: string
  getProjectResourcesAction: (
    projectId: string,
  ) => Promise<{ success: boolean; data?: Resource[]; error?: string }>
}

export function ProjectDetailClientWrapper({
  project,
  user,
  initialResources,
  projectId,
  getProjectResourcesAction,
}: ProjectDetailClientWrapperProps) {
  // Ref para acceder a los métodos del DocumentTable desde el modal de upload
  const documentTableRef = useRef<DocumentTableRef>(null)
  // Función para crear pre-resource temporal optimista
  const handleMultiInvoiceUploadStarted = useCallback(
    (fileName: string) => {
      console.log('🎯 [PROJECT-WRAPPER] Multi-invoice upload started:', fileName)

      // Crear un pre-resource temporal para mostrar inmediatamente
      const tempPreResource = {
        id: `temp-${Date.now()}`,
        project: projectId,
        user: 'current-user', // Será reemplazado por datos reales
        file: 'temp-file',
        originalName: fileName.replace(/\.[^/.]+$/, ''),
        status: 'pending' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isTemporary: true, // Flag para identificar temporales
      }

      // Disparar evento para que VideoTable agregue inmediatamente el pre-resource temporal
      window.dispatchEvent(
        new CustomEvent('addTemporaryPreResource', {
          detail: {
            projectId,
            preResource: tempPreResource,
          },
        }),
      )
    },
    [projectId],
  )

  // Función para refrescar pre-resources inmediatamente después de subir
  const handlePreResourceRefreshNeeded = useCallback(async () => {
    console.log('🔄 [PROJECT-WRAPPER] Pre-resource refresh requested')

    // Intentar refrescar pre-resources inmediatamente
    try {
      const result = await getProjectPreResources(projectId)
      if (result.success) {
        console.log('✅ [PROJECT-WRAPPER] Pre-resources refreshed successfully')
        // Disparar evento para que VideoTable/DocumentTable refresque su estado
        window.dispatchEvent(
          new CustomEvent('forcePreResourcesReload', {
            detail: {
              projectId,
              preResources: result.data,
            },
          }),
        )
      } else {
        console.warn('⚠️ [PROJECT-WRAPPER] Failed to refresh pre-resources:', result.error)
      }
    } catch (error) {
      console.error('❌ [PROJECT-WRAPPER] Error refreshing pre-resources:', error)
    }
  }, [projectId])

  return (
    <div className='flex-1 space-y-6 p-4 pt-6'>
      <ProjectDetailHeader
        project={project}
        user={user}
        onUploadComplete={handlePreResourceRefreshNeeded}
        onMultiInvoiceUploadStarted={handleMultiInvoiceUploadStarted}
        documentTableRef={documentTableRef}
      />
      <DocumentTableContainer
        ref={documentTableRef}
        initialResources={initialResources}
        projectId={projectId}
        onPreResourceRefreshNeeded={handlePreResourceRefreshNeeded}
        getProjectResourcesAction={getProjectResourcesAction}
        key={initialResources.length} // Force re-render when resources change
      />
    </div>
  )
}
