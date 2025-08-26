'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  IconAlertTriangle,
  IconUser,
  IconFolder,
  IconFile,
  IconTrash,
  IconLoader2,
  IconExclamationMark,
} from '@tabler/icons-react'
import { deleteClientAction } from '@/actions/clients/deleteClient'
import type { ClientWithStats } from '@/actions/clients/types'
import { toast } from 'sonner'

interface DeleteClientModalProps {
  client: ClientWithStats
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

/**
 * Modal de confirmación para eliminar un cliente/usuario
 *
 * Incluye doble confirmación escribiendo el nombre del usuario
 * Muestra información clara sobre las consecuencias de la eliminación
 * Solo disponible para administradores
 */
export function DeleteClientModal({ client, isOpen, onClose, onSuccess }: DeleteClientModalProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmationText, setConfirmationText] = useState('')
  const [step, setStep] = useState<'warning' | 'confirmation'>('warning')

  // El usuario debe escribir exactamente el nombre para confirmar
  const requiredText = client.name || client.email
  const isConfirmationValid = confirmationText.trim() === requiredText

  // Handler para continuar a la confirmación
  const handleContinueToConfirmation = () => {
    setStep('confirmation')
    setError(null)
  }

  // Handler para volver a la advertencia
  const handleBackToWarning = () => {
    setStep('warning')
    setConfirmationText('')
    setError(null)
  }

  // Handler para eliminar cliente
  const handleDeleteClient = async () => {
    if (!isConfirmationValid) {
      setError('El texto de confirmación no coincide')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await deleteClientAction(client.id)

      if (result.success) {
        toast.success(result.message)

        // Llamar callback de éxito si existe
        if (onSuccess) {
          onSuccess()
        }

        // Refrescar página para asegurar datos actualizados
        router.refresh()
        onClose()
      } else {
        setError(result.message)
      }
    } catch (err) {
      console.error('Error eliminando cliente:', err)
      setError('Error interno del servidor. Intenta nuevamente.')
    } finally {
      setIsLoading(false)
    }
  }

  // Handler para cancelar
  const handleCancel = () => {
    setStep('warning')
    setConfirmationText('')
    setError(null)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className='sm:max-w-[600px]'>
        {step === 'warning' ? (
          // Paso 1: Advertencia
          <>
            <DialogHeader>
              <DialogTitle className='flex items-center gap-2 text-red-600'>
                <IconAlertTriangle className='h-5 w-5' />
                ¡Eliminar Cliente!
              </DialogTitle>
              <DialogDescription>
                Esta acción eliminará permanentemente el cliente y todos sus datos relacionados.
              </DialogDescription>
            </DialogHeader>

            <div className='space-y-4'>
              {/* Información del cliente */}
              <div className='flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg'>
                <div className='flex items-center gap-3'>
                  <div className='h-10 w-10 rounded-full bg-red-100 flex items-center justify-center'>
                    <IconUser className='h-5 w-5 text-red-600' />
                  </div>
                  <div>
                    <p className='font-medium text-red-900'>
                      {client.name || 'Usuario sin nombre'}
                    </p>
                    <p className='text-sm text-red-700'>{client.email}</p>
                  </div>
                </div>
                <Badge variant={client.role === 'admin' ? 'destructive' : 'secondary'}>
                  {client.role?.toUpperCase() || 'USER'}
                </Badge>
              </div>

              {/* Lista de datos que se eliminarán */}
              <Alert variant='destructive'>
                <IconExclamationMark className='h-4 w-4' />
                <AlertDescription>
                  <strong>Los siguientes datos se eliminarán de forma permanente:</strong>
                </AlertDescription>
              </Alert>

              <div className='space-y-3 pl-4'>
                <div className='flex items-center gap-3 text-sm'>
                  <IconUser className='h-4 w-4 text-red-500' />
                  <span>
                    <strong>Cuenta de usuario:</strong> Perfil, configuraciones y credenciales
                  </span>
                </div>
                <div className='flex items-center gap-3 text-sm'>
                  <IconFolder className='h-4 w-4 text-red-500' />
                  <span>
                    <strong>Proyectos:</strong> {client.projectCount} proyecto
                    {client.projectCount !== 1 ? 's' : ''}
                    {client.projectCount > 0 && ' y todo su contenido'}
                  </span>
                </div>
                <div className='flex items-center gap-3 text-sm'>
                  <IconFile className='h-4 w-4 text-red-500' />
                  <span>
                    <strong>Recursos:</strong> Todos los documentos, análisis y datos procesados
                  </span>
                </div>
                <div className='flex items-center gap-3 text-sm'>
                  <IconFile className='h-4 w-4 text-red-500' />
                  <span>
                    <strong>Historial:</strong> Conversaciones, API keys y logs de actividad
                  </span>
                </div>
              </div>

              <Alert>
                <IconAlertTriangle className='h-4 w-4' />
                <AlertDescription>
                  <strong>Esta acción no se puede deshacer.</strong> Una vez eliminado el cliente,
                  todos sus datos se perderán permanentemente.
                </AlertDescription>
              </Alert>

              {/* Advertencia especial para admins */}
              {client.role === 'admin' && (
                <Alert variant='destructive'>
                  <IconExclamationMark className='h-4 w-4' />
                  <AlertDescription>
                    <strong>¡Advertencia!</strong> Estás eliminando una cuenta de administrador.
                    Asegúrate de que haya otros administradores en el sistema.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <DialogFooter className='gap-2'>
              <Button variant='outline' onClick={handleCancel}>
                Cancelar
              </Button>
              <Button
                variant='destructive'
                onClick={handleContinueToConfirmation}
                className='bg-red-600 hover:bg-red-700'
              >
                Continuar con Eliminación
              </Button>
            </DialogFooter>
          </>
        ) : (
          // Paso 2: Confirmación
          <>
            <DialogHeader>
              <DialogTitle className='flex items-center gap-2 text-red-600'>
                <IconTrash className='h-5 w-5' />
                Confirmar Eliminación
              </DialogTitle>
              <DialogDescription>
                Para confirmar, escribe <strong>{requiredText}</strong> exactamente como aparece.
              </DialogDescription>
            </DialogHeader>

            <div className='space-y-4'>
              {/* Recordatorio del cliente */}
              <div className='p-3 bg-muted rounded-lg'>
                <p className='text-sm text-muted-foreground'>Cliente a eliminar:</p>
                <p className='font-medium'>{requiredText}</p>
              </div>

              {/* Campo de confirmación */}
              <div className='space-y-2'>
                <Label htmlFor='confirmation'>Escribe el nombre exacto para confirmar:</Label>
                <Input
                  id='confirmation'
                  value={confirmationText}
                  onChange={(e) => {
                    setConfirmationText(e.target.value)
                    if (error) setError(null)
                  }}
                  placeholder={requiredText}
                  className={error ? 'border-red-500' : ''}
                  disabled={isLoading}
                />
                {!isConfirmationValid && confirmationText && (
                  <p className='text-sm text-red-500'>El texto no coincide</p>
                )}
              </div>

              {/* Error general */}
              {error && (
                <Alert variant='destructive'>
                  <IconAlertTriangle className='h-4 w-4' />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Confirmación visual */}
              {isConfirmationValid && (
                <Alert className='border-green-200 bg-green-50'>
                  <IconUser className='h-4 w-4 text-green-600' />
                  <AlertDescription className='text-green-800'>
                    Confirmación válida. Puedes proceder con la eliminación.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <DialogFooter className='gap-2'>
              <Button variant='outline' onClick={handleBackToWarning} disabled={isLoading}>
                Volver
              </Button>
              <Button
                variant='destructive'
                onClick={handleDeleteClient}
                disabled={!isConfirmationValid || isLoading}
                className='bg-red-600 hover:bg-red-700'
              >
                {isLoading ? (
                  <>
                    <IconLoader2 className='h-4 w-4 mr-2 animate-spin' />
                    Eliminando...
                  </>
                ) : (
                  <>
                    <IconTrash className='h-4 w-4 mr-2' />
                    Eliminar Cliente Definitivamente
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
