import { Suspense } from 'react'
import { Metadata } from 'next/metadata'
import { requireAdminAccess } from '@/actions/auth/getUser'
import { ClientProjectDetailContent } from './components/ClientProjectDetailContent'
import { ClientProjectDetailSkeleton } from './components/ClientProjectDetailSkeleton'

interface ClientProjectDetailPageProps {
  params: Promise<{ idclient: string; idproject: string }>
}

export async function generateMetadata({
  params,
}: ClientProjectDetailPageProps): Promise<Metadata> {
  const { idclient, idproject } = await params

  return {
    title: `Proyecto ${idproject.slice(0, 8)}... - Cliente ${idclient.slice(0, 8)}... - Trinoa Admin`,
    description: `Gestiona el proyecto específico del cliente desde el panel administrativo`,
  }
}

/**
 * Página de detalle de proyecto específico de cliente
 *
 * Esta página será implementada completamente en la tarea 5.1
 * Muestra el detalle de un proyecto específico con capacidades CRUD administrativas
 */
export default async function ClientProjectDetailPage({ params }: ClientProjectDetailPageProps) {
  // Validar acceso de administrador
  const adminUser = await requireAdminAccess()
  const { idclient, idproject } = await params

  return (
    <Suspense fallback={<ClientProjectDetailSkeleton />}>
      <ClientProjectDetailContent adminUser={adminUser} clientId={idclient} projectId={idproject} />
    </Suspense>
  )
}
