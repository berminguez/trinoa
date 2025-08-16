import { Suspense } from 'react'
import { Metadata } from 'next/metadata'

import { AdminAccessGuard } from '@/components/admin-access-guard'
import { requireAdminAccess } from '@/actions/auth/getUser'

// TODO: Importar componentes cuando estén creados
// import { ClientsContent } from './components/ClientsContent'
// import { ClientsSkeleton } from './components/ClientsSkeleton'

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
export default async function ClientsPage() {
  // PATRÓN ESTÁNDAR: Validación de admin en server component
  const adminUser = await requireAdminAccess()

  return (
    <div className='flex-1 space-y-6 p-4 pt-6'>
      {/* Header básico temporal */}
      <div className='space-y-2'>
        <h1 className='text-3xl font-bold tracking-tight'>Gestión de Clientes</h1>
        <p className='text-muted-foreground'>
          Administra todos los usuarios y sus proyectos desde este panel
        </p>
        <p className='text-sm text-green-600'>
          ✅ Acceso admin verificado para: {adminUser.name || adminUser.email}
        </p>
      </div>

      {/* TODO: Reemplazar con componentes reales cuando estén creados */}
      <div className='rounded-lg border p-8 text-center'>
        <h2 className='text-xl font-semibold mb-2'>Página en Construcción</h2>
        <p className='text-muted-foreground mb-4'>
          Los componentes ClientsContent y ClientsSkeleton se crearán en las siguientes tareas.
        </p>
        <div className='bg-blue-50 p-4 rounded-lg'>
          <p className='text-sm text-blue-800'>
            <strong>Patrón de validación admin implementado:</strong>
            <br />
            ✅ requireAdminAccess() ejecutado
            <br />✅ Usuario admin autenticado: {adminUser.role}
            <br />✅ Redirecciones automáticas configuradas
          </p>
        </div>
      </div>
    </div>
  )

  /* 
  TODO: Estructura final cuando se implementen los componentes:
  
  return (
    <Suspense fallback={<ClientsSkeleton />}>
      <AdminAccessGuard>
        {(adminUser) => <ClientsContent adminUser={adminUser} />}
      </AdminAccessGuard>
    </Suspense>
  )
  */
}
