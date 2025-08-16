import { IconAlertCircle, IconRefresh } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { ClientsHeader } from './ClientsHeader'
import type { User } from '@/payload-types'

interface ErrorBoundaryContentProps {
  error: string
  adminUser: User
  onRetry?: () => void
}

/**
 * Componente para mostrar errores en la página de clientes
 *
 * Mantiene la estructura de la página pero muestra un mensaje de error
 * en lugar del contenido principal
 */
export function ErrorBoundaryContent({ error, adminUser, onRetry }: ErrorBoundaryContentProps) {
  return (
    <div className='flex-1 space-y-6 p-4 pt-6'>
      <ClientsHeader adminUser={adminUser} totalClients={0} />

      <div className='rounded-lg border border-red-200 bg-red-50 p-8 text-center'>
        <div className='flex justify-center mb-4'>
          <IconAlertCircle className='h-12 w-12 text-red-600' />
        </div>

        <h2 className='text-xl font-semibold text-red-900 mb-2'>Error Cargando Clientes</h2>

        <p className='text-red-700 mb-6 max-w-md mx-auto'>{error}</p>

        <div className='space-y-4'>
          {onRetry && (
            <Button
              onClick={onRetry}
              variant='outline'
              className='border-red-300 text-red-700 hover:bg-red-100'
            >
              <IconRefresh className='h-4 w-4 mr-2' />
              Intentar de Nuevo
            </Button>
          )}

          <div className='text-sm text-red-600'>
            <p>Posibles soluciones:</p>
            <ul className='list-disc list-inside mt-2 space-y-1 text-left max-w-sm mx-auto'>
              <li>Verificar tu conexión a internet</li>
              <li>Recargar la página</li>
              <li>Contactar al administrador del sistema</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
