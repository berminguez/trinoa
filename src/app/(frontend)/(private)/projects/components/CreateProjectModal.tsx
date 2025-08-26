'use client'

import { useState } from 'react'
import { IconLoader2, IconPlus, IconX } from '@tabler/icons-react'
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
import { useProjectsStore } from '@/stores/projects-store'
import { createProjectAction } from '@/actions/projects/createProject'
import { toast } from 'sonner'

interface CreateProjectModalProps {
  trigger?: React.ReactNode
  onSuccess?: () => void
}

export function CreateProjectModal({ trigger, onSuccess }: CreateProjectModalProps) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [titleError, setTitleError] = useState('')

  const { isCreating, setCreating, addProject, projects } = useProjectsStore()

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

    // Verificar unicidad local (básica)
    const titleExists = projects.some(
      (project) => project.title.toLowerCase().trim() === value.toLowerCase().trim(),
    )

    if (titleExists) {
      return 'Ya existe un proyecto con este título'
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

    setCreating(true)

    try {
      const result = await createProjectAction({
        title: title.trim(),
        description: description.trim() || undefined,
      })

      if (result.success && result.data) {
        // Añadir al store
        addProject(result.data)

        // Limpiar formulario
        setTitle('')
        setDescription('')
        setTitleError('')

        // Cerrar modal
        setOpen(false)

        // Toast de éxito
        toast.success('Proyecto creado exitosamente', {
          description: `El proyecto "${result.data.title}" se ha creado correctamente.`,
        })

        // Callback opcional
        onSuccess?.()
      } else {
        // Manejar errores del servidor
        const errorMessage = result.error || 'Error al crear el proyecto'

        // Si es error de título duplicado, mostrarlo en el campo
        if (
          errorMessage.toLowerCase().includes('título') ||
          errorMessage.toLowerCase().includes('title') ||
          errorMessage.toLowerCase().includes('unique')
        ) {
          setTitleError('Este título ya está en uso. Elige otro título.')
        } else {
          toast.error('Error al crear proyecto', {
            description: errorMessage,
          })
        }
      }
    } catch (error) {
      console.error('Error creating project:', error)
      toast.error('Error inesperado', {
        description: 'Ocurrió un error inesperado al crear el proyecto.',
      })
    } finally {
      setCreating(false)
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
            Nuevo proyecto
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <IconPlus className='h-5 w-5' />
            Crear nuevo proyecto
          </DialogTitle>
          <DialogDescription>Crea un nuevo proyecto para organizar tus recursos.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className='space-y-4'>
          <div className='space-y-2'>
            <Label htmlFor='title'>Title *</Label>
            <Input
              id='title'
              placeholder='Enter project title...'
              value={title}
              onChange={handleTitleChange}
              className={titleError ? 'border-destructive' : ''}
              disabled={isCreating}
              maxLength={100}
            />
            {titleError && <p className='text-sm text-destructive'>{titleError}</p>}
            <p className='text-xs text-muted-foreground'>{title.length}/100 characters</p>
          </div>

          <div className='space-y-2'>
            <Label htmlFor='description'>Description</Label>
            <Textarea
              id='description'
              placeholder='Enter project description (optional)...'
              value={description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setDescription(e.target.value)
              }
              disabled={isCreating}
              rows={3}
              maxLength={500}
            />
            <p className='text-xs text-muted-foreground'>{description.length}/500 characters</p>
          </div>

          <DialogFooter className='gap-2'>
            <Button
              type='button'
              variant='outline'
              onClick={() => setOpen(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button type='submit' disabled={!isFormValid} className='gap-2'>
              {isCreating ? (
                <>
                  <IconLoader2 className='h-4 w-4 animate-spin' />
                  Creating...
                </>
              ) : (
                <>
                  <IconPlus className='h-4 w-4' />
                  Create Project
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
