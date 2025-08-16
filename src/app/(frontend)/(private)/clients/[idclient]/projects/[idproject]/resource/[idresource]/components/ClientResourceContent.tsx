import type { User } from '@/payload-types'
import { AdminBreadcrumbs } from '@/components'

interface ClientResourceContentProps {
  adminUser: User
  clientId: string
  projectId: string
  resourceId: string
}

/**
 * Contenido principal para detalle de recurso específico de proyecto de cliente
 *
 * Este componente será implementado en la tarea 5.5
 * Adaptará los componentes de recurso para contexto administrativo
 */
export async function ClientResourceContent({
  adminUser,
  clientId,
  projectId,
  resourceId,
}: ClientResourceContentProps) {
  // TODO: Implementar en tarea 5.5
  // - Validar que el cliente, proyecto y recurso existen
  // - Obtener datos completos del recurso
  // - Adaptar componentes de recurso para contexto administrativo
  // - Implementar breadcrumb con nombres reales
  // - Permitir edición/eliminación como administrador

  return (
    <div className='flex-1 space-y-6 p-4 pt-6'>
      {/* Breadcrumb temporal con IDs */}
      {AdminBreadcrumbs.resourceDetail(
        `Cliente ${clientId.slice(0, 8)}...`,
        clientId,
        `Proyecto ${projectId.slice(0, 8)}...`,
        projectId,
        `Recurso ${resourceId.slice(0, 8)}...`,
        resourceId,
      )}

      {/* Header temporal */}
      <div className='space-y-2'>
        <h1 className='text-3xl font-bold tracking-tight'>Detalle del Recurso</h1>
        <p className='text-muted-foreground'>Cliente ID: {clientId}</p>
        <p className='text-muted-foreground'>Proyecto ID: {projectId}</p>
        <p className='text-muted-foreground'>Recurso ID: {resourceId}</p>
        <p className='text-sm text-green-600'>Admin: {adminUser.name || adminUser.email}</p>
      </div>

      {/* Confirmación de estructura de rutas completa */}
      <div className='rounded-lg bg-green-50 border border-green-200 p-6 text-center mb-6'>
        <h3 className='text-lg font-semibold text-green-900 mb-2'>
          ✅ Estructura Completa de Rutas - Tarea 4.1 Completada
        </h3>
        <p className='text-green-700 mb-2'>
          La ruta completa /clients/{clientId}/projects/{projectId}/resource/{resourceId} funciona
          correctamente
        </p>
        <p className='text-sm text-green-600'>
          Todas las rutas administrativas dinámicas están implementadas y operativas
        </p>
      </div>

      {/* Estado de desarrollo */}
      <div className='rounded-lg border-2 border-dashed border-gray-300 p-8 text-center'>
        <h3 className='text-lg font-semibold text-gray-900 mb-2'>
          ClientResourceContent - Pendiente
        </h3>
        <p className='text-gray-600 mb-4'>Este componente se implementará en la tarea 5.5</p>
        <div className='bg-yellow-50 p-4 rounded-lg'>
          <p className='text-sm text-yellow-800'>
            ⚠️ Funcionalidades pendientes:
            <br />• Validación de existencia de cliente, proyecto y recurso
            <br />• Carga de datos completos del recurso
            <br />• Adaptación de componentes de recurso para contexto admin
            <br />• Breadcrumb con nombres reales
            <br />• Capacidades de edición/eliminación administrativa
            <br />• Visualización de contenido del recurso
          </p>
        </div>
      </div>
    </div>
  )
}
