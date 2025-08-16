import { notFound } from 'next/navigation'
import { requireAdminAccess } from '@/actions/auth/getUser'
import { getClients } from '@/actions/clients/getClients'
import { AdminBreadcrumbs } from '@/components/admin-breadcrumb'
import { ClientsHeader } from './ClientsHeader'
import { ClientsGrid } from './ClientsGrid'
import { ErrorBoundaryContent } from './ErrorBoundaryContent'
// import { BreadcrumbDemo } from './BreadcrumbDemo'
import type { ClientsFilters } from '@/actions/clients/types'

interface ClientsContentProps {
  searchParams?: {
    search?: string
    sortBy?: string
    sortOrder?: string
    page?: string
    role?: string
    dateFrom?: string
    dateTo?: string
  }
}

/**
 * Componente principal de contenido para la página de clientes
 *
 * Maneja la carga de datos del servidor y estados de error
 * Soporta filtros via URL search params
 */
export async function ClientsContent({ searchParams = {} }: ClientsContentProps) {
  try {
    // Validación de admin
    const adminUser = await requireAdminAccess()

    // Construir filtros desde searchParams
    const filters: ClientsFilters = {
      searchTerm: searchParams.search || '',
      sortBy: (searchParams.sortBy as any) || 'createdAt',
      sortOrder: (searchParams.sortOrder as any) || 'desc',
      page: searchParams.page ? parseInt(searchParams.page) : 1,
      limit: 12, // Valor fijo por ahora, se puede hacer configurable
      role: searchParams.role as any,
      dateFrom: searchParams.dateFrom,
      dateTo: searchParams.dateTo,
    }

    console.log('ClientsContent: Cargando clientes con filtros:', filters)

    // Obtener datos de clientes
    const clientsResult = await getClients(filters)

    // Manejar errores del server action
    if (!clientsResult.success) {
      console.error('ClientsContent: Error obteniendo clientes:', clientsResult.message)
      return (
        <ErrorBoundaryContent
          error={clientsResult.message || 'Error desconocido'}
          adminUser={adminUser}
        />
      )
    }

    // Verificar que tenemos datos válidos
    if (!clientsResult.data) {
      console.error('ClientsContent: No hay datos en la respuesta exitosa')
      return (
        <ErrorBoundaryContent
          error='No se pudieron cargar los datos de clientes'
          adminUser={adminUser}
        />
      )
    }

    const { clients, totalClients, page, totalPages } = clientsResult.data

    console.log(
      `ClientsContent: Mostrando ${clients.length} clientes (página ${page} de ${totalPages})`,
    )

    return (
      <div className='flex-1 space-y-6 p-4 pt-6'>
        {/* Breadcrumb de navegación administrativa */}
        {/*         {AdminBreadcrumbs.clients()} */}

        {/* Demo del breadcrumb automático */}
        {/* <BreadcrumbDemo /> */}

        <ClientsHeader adminUser={adminUser} totalClients={totalClients} />
        <ClientsGrid
          clients={clients as any}
          pagination={{
            currentPage: page,
            totalPages,
            totalClients,
            clientsPerPage: clients.length,
          }}
          currentFilters={filters}
        />

        {/* Mostrar mensaje informativo si hay filtros activos */}
        {(filters.searchTerm || filters.role || filters.dateFrom || filters.dateTo) && (
          <div className='rounded-lg bg-blue-50 p-4'>
            <p className='text-sm text-blue-800'>
              📊 Mostrando {clients.length} cliente{clients.length !== 1 ? 's' : ''} de{' '}
              {totalClients} total
              {filters.searchTerm && ` | Búsqueda: "${filters.searchTerm}"`}
              {filters.role && ` | Rol: ${filters.role}`}
              {(filters.dateFrom || filters.dateTo) && ` | Fecha filtrada`}
            </p>
          </div>
        )}
      </div>
    )
  } catch (error) {
    console.error('ClientsContent: Error inesperado:', error)

    // En caso de error crítico, mostrar página de error
    // pero no usar el componente ErrorBoundaryContent ya que podríamos no tener adminUser
    return (
      <div className='flex-1 space-y-6 p-4 pt-6'>
        <div className='rounded-lg border border-red-200 bg-red-50 p-6 text-center'>
          <h2 className='text-lg font-semibold text-red-900 mb-2'>Error Cargando Clientes</h2>
          <p className='text-red-700 mb-4'>
            Ha ocurrido un error inesperado al cargar la lista de clientes.
          </p>
          <p className='text-sm text-red-600'>
            Si el problema persiste, contacta al administrador del sistema.
          </p>
        </div>
      </div>
    )
  }
}
