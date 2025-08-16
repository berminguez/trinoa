'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { User, Project } from '@/payload-types'
import { AdminBreadcrumbs } from '@/components'
import { ClientProjectsHeader } from './ClientProjectsHeader'
import { ClientProjectsGrid } from './ClientProjectsGrid'
import type { ClientProjectsFilters } from '@/actions/clients/types'

interface ClientProjectsContentClientProps {
  adminUser: User
  client: User
  projects: Project[]
  totalProjects: number
  page: number
  totalPages: number
  currentFilters: ClientProjectsFilters
}

/**
 * Componente cliente para proyectos de cliente específico
 *
 * Maneja la interacción del usuario y recarga de datos
 * cuando se crean nuevos proyectos
 */
export function ClientProjectsContentClient({
  adminUser,
  client,
  projects,
  totalProjects,
  page,
  totalPages,
  currentFilters,
}: ClientProjectsContentClientProps) {
  const router = useRouter()
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Callback para refrescar la página cuando se crea un proyecto
  const handleProjectCreated = useCallback(async () => {
    setIsRefreshing(true)

    try {
      // Refrescar la página para mostrar el nuevo proyecto
      router.refresh()
    } catch (error) {
      console.error('Error refreshing page after project creation:', error)
    } finally {
      // Reset del estado de loading después de un delay
      setTimeout(() => setIsRefreshing(false), 1000)
    }
  }, [router])

  return (
    <div className='flex-1 space-y-6 p-4 pt-6'>
      {/* Breadcrumb de navegación administrativa */}
      {AdminBreadcrumbs.clientProjects(client.name || client.email, client.id)}

      <ClientProjectsHeader
        adminUser={adminUser}
        client={client}
        totalProjects={totalProjects}
        onProjectCreated={handleProjectCreated}
      />

      <ClientProjectsGrid
        client={client}
        projects={projects}
        pagination={{
          currentPage: page,
          totalPages,
          totalProjects,
          projectsPerPage: projects.length,
        }}
        currentFilters={currentFilters}
      />

      {/* Mostrar mensaje informativo si hay filtros activos */}
      {(currentFilters.searchTerm || currentFilters.dateFrom || currentFilters.dateTo) && (
        <div className='rounded-lg bg-blue-50 p-4'>
          <p className='text-sm text-blue-800'>
            📊 Mostrando {projects.length} proyecto{projects.length !== 1 ? 's' : ''} de{' '}
            {totalProjects} total
            {currentFilters.searchTerm && ` | Búsqueda: "${currentFilters.searchTerm}"`}
            {(currentFilters.dateFrom || currentFilters.dateTo) && ` | Fecha filtrada`}
          </p>
        </div>
      )}

      {/* Indicador de recarga */}
      {isRefreshing && (
        <div className='fixed top-4 right-4 bg-green-100 border border-green-300 text-green-800 px-4 py-2 rounded-lg shadow-lg z-50'>
          <p className='text-sm font-medium'>✅ Actualizando lista de proyectos...</p>
        </div>
      )}
    </div>
  )
}
