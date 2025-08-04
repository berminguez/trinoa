'use client'

import { useState } from 'react'
import { IconLoader2, IconTrash, IconAlertTriangle } from '@tabler/icons-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { deleteApiKeyAction } from '@/actions/api-keys'
import { toast } from 'sonner'
import type { ApiKey } from '@/payload-types'

interface DeleteApiKeyDialogProps {
  apiKey: ApiKey
  children: React.ReactNode
  onSuccess?: () => void
}

export function DeleteApiKeyDialog({ apiKey, children, onSuccess }: DeleteApiKeyDialogProps) {
  const [open, setOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)

    try {
      const result = await deleteApiKeyAction(apiKey.id)

      if (result.success) {
        toast.success('API Key eliminada exitosamente')
        setOpen(false)
        onSuccess?.()

        // Recargar la página para actualizar la lista
        window.location.reload()
      } else {
        toast.error(result.error || 'Error al eliminar la API Key')
      }
    } catch (error) {
      console.error('Error deleting API key:', error)
      toast.error('Error interno. Intenta nuevamente.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className='flex items-center gap-2'>
            <IconAlertTriangle className='h-5 w-5 text-destructive' />
            ¿Eliminar API Key?
          </AlertDialogTitle>
          <AlertDialogDescription className='space-y-2'>
            <p>
              Estás a punto de eliminar la API Key <strong>"{apiKey.name}"</strong>.
            </p>
            <p>
              Esta acción no se puede deshacer. Todos los servicios que usen esta API Key perderán
              acceso inmediatamente.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className='bg-destructive text-destructive-foreground hover:bg-destructive/90 text-white'
          >
            {isDeleting ? (
              <>
                <IconLoader2 className='h-4 w-4 mr-2 animate-spin' />
                Eliminando...
              </>
            ) : (
              <>
                <IconTrash className='h-4 w-4 mr-2' />
                Eliminar API Key
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
