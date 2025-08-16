'use client'

import { useState } from 'react'
import { IconLoader2, IconPlus, IconUser } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { createProjectForClient } from '@/actions/projects/createProjectForClient'
import { toast } from 'sonner'
import type { User } from '@/payload-types'

interface CreateClientProjectModalProps {
  client: User
  trigger?: React.ReactNode
  onSuccess?: () => void
}

/**
 * Modal para crear proyectos como administrador para un cliente específico
 *
 * Adaptado de CreateProjectModal para contexto administrativo
 * Usa createProjectForClient en lugar de createProjectAction
 */
export function CreateClientProjectModal({
  client,
  trigger,
  onSuccess,
}: CreateClientProjectModalProps) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [titleError, setTitleError] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const validateTitle = (value: string): string => {
    if (!value.trim()) {
      return 'El título es requerido'
    }

    if (value.trim().length < 3) {
      return 'El título debe tener al menos 3 caracteres'
    }

    if (value.trim().length > 100) {
      return 'El título no puede exceder 100 caracteres'
    }

    return ''
  }

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setTitle(value)

    // Validar en tiempo real
    const error = validateTitle(value)
    setTitleError(error)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validar antes de enviar
    const error = validateTitle(title)
    if (error) {
      setTitleError(error)
      return
    }

    setIsCreating(true)

    try {
      const result = await createProjectForClient({
        title: title.trim(),
        description: description.trim() || undefined,
        clientId: client.id,
      })

      if (result.success && result.data) {
        // Limpiar formulario
        setTitle('')
        setDescription('')
        setTitleError('')

        // Cerrar modal
        setOpen(false)

        // Toast de éxito con información del cliente
        toast.success('Proyecto creado para el cliente', {
          description:
            result.message ||
            `Proyecto "${result.data.project.title}" creado para ${client.name || client.email}`,
        })

        // Callback opcional para refrescar la lista
        onSuccess?.()
      } else {
        // Manejar errores del servidor
        const errorMessage = result.message || 'Error al crear el proyecto para el cliente'

        // Si es error de título duplicado, mostrarlo en el campo
        if (
          errorMessage.toLowerCase().includes('título') ||
          errorMessage.toLowerCase().includes('title') ||
          errorMessage.toLowerCase().includes('ya existe')
        ) {
          setTitleError('Este cliente ya tiene un proyecto con este título. Elige otro título.')
        } else {
          toast.error('Error al crear proyecto', {
            description: errorMessage,
          })
        }
      }
    } catch (error) {
      console.error('Error creating project for client:', error)
      toast.error('Error inesperado', {
        description: 'Ocurrió un error inesperado al crear el proyecto para el cliente.',
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)

    // Limpiar formulario al cerrar
    if (!newOpen) {
      setTitle('')
      setDescription('')
      setTitleError('')
    }
  }

  const isFormValid = title.trim().length >= 3 && !titleError && !isCreating

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className='gap-2'>
            <IconPlus className='h-4 w-4' />
            Crear Proyecto
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <IconPlus className='h-5 w-5' />
            Crear Proyecto para Cliente
          </DialogTitle>
          <DialogDescription>
            Crear un nuevo proyecto en nombre del cliente seleccionado.
          </DialogDescription>
        </DialogHeader>

        {/* Información del cliente */}
        <div className='bg-muted/30 p-3 rounded-lg border'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <IconUser className='h-4 w-4 text-muted-foreground' />
              <div>
                <p className='text-sm font-medium'>{client.name || 'Sin nombre'}</p>
                <p className='text-xs text-muted-foreground'>{client.email}</p>
              </div>
            </div>
            <Badge
              variant={client.role === 'admin' ? 'destructive' : 'secondary'}
              className='text-xs'
            >
              {client.role.toUpperCase()}
            </Badge>
          </div>
        </div>

        <form onSubmit={handleSubmit} className='space-y-4'>
          <div className='space-y-2'>
            <Label htmlFor='title'>Título del Proyecto *</Label>
            <Input
              id='title'
              placeholder='Ingresa el título del proyecto...'
              value={title}
              onChange={handleTitleChange}
              className={titleError ? 'border-destructive' : ''}
              disabled={isCreating}
              maxLength={100}
            />
            {titleError && <p className='text-sm text-destructive'>{titleError}</p>}
            <p className='text-xs text-muted-foreground'>{title.length}/100 caracteres</p>
          </div>

          <div className='space-y-2'>
            <Label htmlFor='description'>Descripción</Label>
            <Textarea
              id='description'
              placeholder='Ingresa la descripción del proyecto (opcional)...'
              value={description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setDescription(e.target.value)
              }
              disabled={isCreating}
              rows={3}
              maxLength={500}
            />
            <p className='text-xs text-muted-foreground'>{description.length}/500 caracteres</p>
          </div>

          <DialogFooter className='gap-2'>
            <Button
              type='button'
              variant='outline'
              onClick={() => setOpen(false)}
              disabled={isCreating}
            >
              Cancelar
            </Button>
            <Button type='submit' disabled={!isFormValid} className='gap-2'>
              {isCreating ? (
                <>
                  <IconLoader2 className='h-4 w-4 animate-spin' />
                  Creando...
                </>
              ) : (
                <>
                  <IconPlus className='h-4 w-4' />
                  Crear Proyecto
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
