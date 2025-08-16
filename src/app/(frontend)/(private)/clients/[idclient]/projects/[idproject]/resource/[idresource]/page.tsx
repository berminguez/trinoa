import { Suspense } from 'react'
import { Metadata } from 'next/metadata'
import { requireAdminAccess } from '@/actions/auth/getUser'
import { ClientResourceContent } from './components/ClientResourceContent'
import { ClientResourceSkeleton } from './components/ClientResourceSkeleton'

interface ClientResourcePageProps {
  params: Promise<{ idclient: string; idproject: string; idresource: string }>
}

export async function generateMetadata({ params }: ClientResourcePageProps): Promise<Metadata> {
  const { idclient, idproject, idresource } = await params

  return {
    title: `Recurso ${idresource.slice(0, 8)}... - Proyecto ${idproject.slice(0, 8)}... - Trinoa Admin`,
    description: `Gestiona el recurso específico del proyecto del cliente desde el panel administrativo`,
  }
}

/**
 * Página de detalle de recurso específico de proyecto de cliente
 *
 * Esta página será implementada completamente en la tarea 5.4
 * Muestra el detalle de un recurso específico con capacidades CRUD administrativas
 */
export default async function ClientResourcePage({ params }: ClientResourcePageProps) {
  // Validar acceso de administrador
  const adminUser = await requireAdminAccess()
  const { idclient, idproject, idresource } = await params

  return (
    <Suspense fallback={<ClientResourceSkeleton />}>
      <ClientResourceContent
        adminUser={adminUser}
        clientId={idclient}
        projectId={idproject}
        resourceId={idresource}
      />
    </Suspense>
  )
}
