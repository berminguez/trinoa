'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { IconLoader2, IconPlus } from '@tabler/icons-react'
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

  const t = useTranslations('projects.create')

  const validateTitle = (value: string): string => {
    if (!value.trim()) {
      return t('errors.titleRequired')
    }

    if (value.trim().length < 3) {
      return t('errors.titleMinLength')
    }

    if (value.trim().length > 100) {
      return t('errors.titleMaxLength')
    }

    // Verificar unicidad local (básica)
    const titleExists = projects.some(
      (project) => project.title.toLowerCase().trim() === value.toLowerCase().trim(),
    )

    if (titleExists) {
      return t('errors.titleExists')
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
        toast.success(t('toast.successTitle'), {
          description: t('toast.successDescription', { title: result.data.title }),
        })

        // Callback opcional
        onSuccess?.()
      } else {
        // Manejar errores del servidor
        const errorMessage = result.error || t('toast.serverErrorTitle')

        // Si es error de título duplicado, mostrarlo en el campo
        if (
          errorMessage.toLowerCase().includes('título') ||
          errorMessage.toLowerCase().includes('title') ||
          errorMessage.toLowerCase().includes('unique')
        ) {
          setTitleError(t('errors.titleExists'))
        } else {
          toast.error(t('toast.serverErrorTitle'), {
            description: errorMessage,
          })
        }
      }
    } catch (error) {
      console.error('Error creating project:', error)
      toast.error(t('toast.unexpectedTitle'), {
        description: t('toast.unexpectedDescription'),
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
            {t('newProject')}
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <IconPlus className='h-5 w-5' />
            {t('createProject')}
          </DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className='space-y-4'>
          <div className='space-y-2'>
            <Label htmlFor='title'>{t('title')} *</Label>
            <Input
              id='title'
              placeholder={t('titlePlaceholder')}
              value={title}
              onChange={handleTitleChange}
              className={titleError ? 'border-destructive' : ''}
              disabled={isCreating}
              maxLength={100}
            />
            {titleError && <p className='text-sm text-destructive'>{titleError}</p>}
            <p className='text-xs text-muted-foreground'>
              {title.length}/100 {t('characters')}
            </p>
          </div>

          <div className='space-y-2'>
            <Label htmlFor='description'>{t('descriptionLabel')}</Label>
            <Textarea
              id='description'
              placeholder={t('descriptionPlaceholder')}
              value={description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setDescription(e.target.value)
              }
              disabled={isCreating}
              rows={3}
              maxLength={500}
            />
            <p className='text-xs text-muted-foreground'>
              {description.length}/500 {t('characters')}
            </p>
          </div>

          <DialogFooter className='gap-2'>
            <Button
              type='button'
              variant='outline'
              onClick={() => setOpen(false)}
              disabled={isCreating}
            >
              {t('cancel')}
            </Button>
            <Button type='submit' disabled={!isFormValid} className='gap-2'>
              {isCreating ? (
                <>
                  <IconLoader2 className='h-4 w-4 animate-spin' />
                  {t('creating')}
                </>
              ) : (
                <>
                  <IconPlus className='h-4 w-4' />
                  {t('create')}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
