import { Suspense } from 'react'
import { Metadata } from 'next/metadata'
import { requireAdminAccess } from '@/actions/auth/getUser'
import { ClientProjectsContent } from './components/ClientProjectsContent'
import { ClientProjectsSkeleton } from './components/ClientProjectsSkeleton'

interface ClientProjectsPageProps {
  params: Promise<{ idclient: string }>
  searchParams?: { [key: string]: string | string[] | undefined }
}

export async function generateMetadata({ params }: ClientProjectsPageProps): Promise<Metadata> {
  const { idclient } = await params

  return {
    title: `Proyectos del Cliente - Trinoa Admin`,
    description: `Gestiona los proyectos del cliente desde el panel administrativo`,
  }
}

/**
 * Página de proyectos de cliente específico
 *
 * Esta página será implementada completamente en la tarea 4.2
 * Muestra todos los proyectos de un cliente específico con capacidades CRUD
 */
export default async function ClientProjectsPage({
  params,
  searchParams,
}: ClientProjectsPageProps) {
  // Validar acceso de administrador
  const adminUser = await requireAdminAccess()
  const { idclient } = await params

  // Convertir searchParams a formato esperado
  const cleanSearchParams = searchParams
    ? Object.fromEntries(
        Object.entries(searchParams).map(([key, value]) => [
          key,
          Array.isArray(value) ? value[0] : value,
        ]),
      )
    : {}

  return (
    <Suspense fallback={<ClientProjectsSkeleton />}>
      <ClientProjectsContent
        adminUser={adminUser}
        clientId={idclient}
        searchParams={cleanSearchParams}
      />
    </Suspense>
  )
}
