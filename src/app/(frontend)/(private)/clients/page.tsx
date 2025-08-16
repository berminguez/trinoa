import { Suspense } from 'react'
import { Metadata } from 'next/metadata'

import { ClientsContent } from './components/ClientsContent'
import { ClientsSkeleton } from './components/ClientsSkeleton'

export const metadata: Metadata = {
  title: 'Gestión de Clientes - Trinoa Admin',
  description: 'Panel administrativo para gestionar todos los clientes de la plataforma',
}

/**
 * Página principal de administración de clientes
 *
 * Esta página implementa el patrón estándar de validación admin:
 * 1. Validación de permisos en el servidor con requireAdminAccess()
 * 2. Estructura de Suspense para manejo de loading
 * 3. Componentes separados para contenido y skeleton
 */
interface ClientsPageProps {
  searchParams: Promise<{
    search?: string
    sortBy?: string
    sortOrder?: string
    page?: string
    role?: string
    dateFrom?: string
    dateTo?: string
  }>
}

export default async function ClientsPage({ searchParams }: ClientsPageProps) {
  const resolvedSearchParams = await searchParams

  return (
    <Suspense fallback={<ClientsSkeleton />}>
      <ClientsContent searchParams={resolvedSearchParams} />
    </Suspense>
  )
}
