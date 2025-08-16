import { Button } from '@/components/ui/button'
import { IconAlertCircle, IconArrowLeft, IconRefresh } from '@tabler/icons-react'
import Link from 'next/link'
import type { User } from '@/payload-types'

interface ClientProjectsErrorBoundaryProps {
  error: string
  adminUser: User
  clientId: string
  onRetry?: () => void
}

/**
 * Componente para mostrar errores en la página de proyectos de cliente
 *
 * Mantiene la estructura de la página pero muestra un mensaje de error
 * en lugar del contenido principal
 */
export function ClientProjectsErrorBoundary({
  error,
  adminUser,
  clientId,
  onRetry,
}: ClientProjectsErrorBoundaryProps) {
  return (
    <div className='flex-1 space-y-6 p-4 pt-6'>
      {/* Breadcrumb simplificado */}
      <div className='flex items-center space-x-2 text-sm text-muted-foreground'>
        <Link href='/clients' className='hover:text-foreground'>
          Clientes
        </Link>
        <span>→</span>
        <span>Cliente {clientId.slice(0, 8)}...</span>
        <span>→</span>
        <span>Proyectos</span>
      </div>

      <div className='rounded-lg border border-red-200 bg-red-50 p-8 text-center'>
        <div className='flex justify-center mb-4'>
          <IconAlertCircle className='h-12 w-12 text-red-600' />
        </div>

        <h2 className='text-xl font-semibold text-red-900 mb-2'>
          Error Cargando Proyectos del Cliente
        </h2>

        <p className='text-red-700 mb-6 max-w-md mx-auto'>{error}</p>

        <div className='space-y-4'>
          {onRetry && (
            <Button
              onClick={onRetry}
              variant='outline'
              className='border-red-300 text-red-700 hover:bg-red-100'
            >
              <IconRefresh className='h-4 w-4 mr-2' />
              Reintentar
            </Button>
          )}

          <div className='flex flex-col sm:flex-row gap-2 justify-center'>
            <Button asChild variant='outline'>
              <Link href='/clients'>
                <IconArrowLeft className='h-4 w-4 mr-2' />
                Volver a Clientes
              </Link>
            </Button>

            <Button asChild>
              <Link href='/dashboard'>Ir al Dashboard</Link>
            </Button>
          </div>

          <div className='text-sm text-red-600'>
            <p>Posibles soluciones:</p>
            <ul className='list-disc list-inside mt-2 space-y-1'>
              <li>Verificar que el ID del cliente es correcto</li>
              <li>Comprobar permisos de administrador</li>
              <li>Contactar al administrador del sistema si el problema persiste</li>
            </ul>
          </div>

          <div className='text-xs text-muted-foreground border-t pt-4'>
            <p>Admin: {adminUser.name || adminUser.email}</p>
            <p>Cliente ID: {clientId}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
