import { notFound } from 'next/navigation'
import type { User } from '@/payload-types'
import { getClientProjects } from '@/actions/clients/getClientProjects'
import { ClientProjectsContentClient } from './ClientProjectsContentClient'
import { ClientProjectsErrorBoundary } from './ClientProjectsErrorBoundary'
import type { ClientProjectsFilters } from '@/actions/clients/types'

interface ClientProjectsContentProps {
  adminUser: User
  clientId: string
  searchParams?: {
    search?: string
    sortBy?: string
    sortOrder?: string
    page?: string
    dateFrom?: string
    dateTo?: string
  }
}

/**
 * Contenido principal para proyectos de cliente específico
 *
 * Componente completamente funcional que adapta la lógica de ProjectsContent.tsx
 * para contexto administrativo con capacidades CRUD y navegación
 */
export async function ClientProjectsContent({
  adminUser,
  clientId,
  searchParams = {},
}: ClientProjectsContentProps) {
  try {
    // Construir filtros desde searchParams
    const filters: ClientProjectsFilters = {
      searchTerm: searchParams.search || '',
      sortBy: (searchParams.sortBy as any) || 'createdAt',
      sortOrder: (searchParams.sortOrder as any) || 'desc',
      page: searchParams.page ? parseInt(searchParams.page) : 1,
      limit: 12, // Valor fijo, se puede hacer configurable
      dateFrom: searchParams.dateFrom,
      dateTo: searchParams.dateTo,
    }

    console.log(
      `ClientProjectsContent: Cargando proyectos del cliente ${clientId} con filtros:`,
      filters,
    )

    // Obtener datos del cliente y sus proyectos
    const clientProjectsResult = await getClientProjects(clientId, filters)

    // Manejar errores del server action
    if (!clientProjectsResult.success) {
      console.error(
        'ClientProjectsContent: Error obteniendo proyectos:',
        clientProjectsResult.message,
      )

      // Si el cliente no existe, mostrar 404
      if (clientProjectsResult.message === 'Cliente no encontrado') {
        notFound()
      }

      return (
        <ClientProjectsErrorBoundary
          error={clientProjectsResult.message || 'Error desconocido'}
          adminUser={adminUser}
          clientId={clientId}
        />
      )
    }

    // Verificar que tenemos datos válidos
    if (!clientProjectsResult.data) {
      console.error('ClientProjectsContent: No hay datos en la respuesta exitosa')
      return (
        <ClientProjectsErrorBoundary
          error='No se pudieron cargar los datos de proyectos del cliente'
          adminUser={adminUser}
          clientId={clientId}
        />
      )
    }

    const { client, projects, totalProjects, page, totalPages } = clientProjectsResult.data

    console.log(
      `ClientProjectsContent: Mostrando ${projects.length} proyectos de ${totalProjects} total para cliente ${client.email}`,
    )

    return (
      <ClientProjectsContentClient
        adminUser={adminUser}
        client={client}
        projects={projects}
        totalProjects={totalProjects}
        page={page}
        totalPages={totalPages}
        currentFilters={filters}
      />
    )
  } catch (error) {
    console.error('ClientProjectsContent: Error inesperado:', error)

    // En caso de error crítico, mostrar página de error
    return (
      <ClientProjectsErrorBoundary
        error='Ha ocurrido un error inesperado al cargar los proyectos del cliente'
        adminUser={adminUser}
        clientId={clientId}
      />
    )
  }
}
