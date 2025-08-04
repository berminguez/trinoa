'use client'

import { useState, useEffect } from 'react'
import { IconLoader2, IconPlus, IconX, IconKey } from '@tabler/icons-react'
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
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent } from '@/components/ui/card'
import { createApiKeyAction } from '@/actions/api-keys'
import { getUserProjectsAction } from '@/actions/projects/getUserProjects'
import { toast } from 'sonner'
import type { Project } from '@/payload-types'

interface CreateApiKeyModalProps {
  trigger?: React.ReactNode
  onSuccess?: () => void
}

export function CreateApiKeyModal({ trigger, onSuccess }: CreateApiKeyModalProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [hasAllProjects, setHasAllProjects] = useState(false)
  const [selectedProjects, setSelectedProjects] = useState<string[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [nameError, setNameError] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [isLoadingProjects, setIsLoadingProjects] = useState(false)
  const [createdKey, setCreatedKey] = useState<string | null>(null)

  // Validar nombre
  const validateName = (value: string): string => {
    if (!value.trim()) {
      return 'El nombre es requerido'
    }
    if (value.trim().length > 50) {
      return 'El nombre no puede exceder 50 caracteres'
    }
    return ''
  }

  // Cargar proyectos del usuario cuando se abre el modal
  useEffect(() => {
    if (open && !hasAllProjects) {
      loadUserProjects()
    }
  }, [open, hasAllProjects])

  const loadUserProjects = async () => {
    setIsLoadingProjects(true)
    try {
      const result = await getUserProjectsAction()

      if (result.success && result.data) {
        setProjects(result.data)
      } else {
        console.error('Error loading projects:', result.error)
        toast.error('Error al cargar proyectos')
        setProjects([])
      }
    } catch (error) {
      console.error('Error loading projects:', error)
      toast.error('Error al cargar proyectos')
      setProjects([])
    } finally {
      setIsLoadingProjects(false)
    }
  }

  const handleNameChange = (value: string) => {
    setName(value)
    setNameError(validateName(value))
  }

  const handleHasAllProjectsChange = (checked: boolean) => {
    setHasAllProjects(checked)
    if (checked) {
      setSelectedProjects([]) // Limpiar selección específica
    }
  }

  const handleProjectToggle = (projectId: string) => {
    setSelectedProjects((prev) =>
      prev.includes(projectId) ? prev.filter((id) => id !== projectId) : [...prev, projectId],
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validar nombre
    const error = validateName(name)
    if (error) {
      setNameError(error)
      return
    }

    setIsCreating(true)

    try {
      const result = await createApiKeyAction({
        name: name.trim(),
        hasAllProjects,
        projects: hasAllProjects ? [] : selectedProjects,
      })

      if (result.success && result.data?.plainKey) {
        setCreatedKey(result.data.plainKey)
        toast.success('API Key creada exitosamente')

        // Reset form after successful creation
        setTimeout(() => {
          setName('')
          setHasAllProjects(false)
          setSelectedProjects([])
          setNameError('')
          setCreatedKey(null)
          setOpen(false)
          onSuccess?.()
        }, 5000) // Dar tiempo para que copie la key
      } else {
        toast.error(result.error || 'Error al crear la API Key')
      }
    } catch (error) {
      console.error('Error creating API key:', error)
      toast.error('Error interno. Intenta nuevamente.')
    } finally {
      setIsCreating(false)
    }
  }

  const copyKeyToClipboard = async (key: string) => {
    try {
      await navigator.clipboard.writeText(key)
      toast.success('API Key copiada al portapapeles')
    } catch (error) {
      toast.error('Error al copiar la API Key')
    }
  }

  const resetAndClose = () => {
    setName('')
    setHasAllProjects(false)
    setSelectedProjects([])
    setNameError('')
    setCreatedKey(null)
    setOpen(false)
  }

  // Si ya se creó la key, mostrar pantalla de éxito
  if (createdKey) {
    return (
      <Dialog open={open} onOpenChange={resetAndClose}>
        {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2'>
              <IconKey className='h-5 w-5 text-green-600' />
              API Key Creada
            </DialogTitle>
            <DialogDescription>
              Tu API Key ha sido creada exitosamente. Cópiala ahora, ya que no podrás verla de
              nuevo.
            </DialogDescription>
          </DialogHeader>

          <Card>
            <CardContent className='p-4'>
              <div className='space-y-2'>
                <Label className='text-sm font-medium'>Tu nueva API Key:</Label>
                <div className='flex items-center gap-2'>
                  <code className='flex-1 text-xs bg-muted p-2 rounded font-mono break-all'>
                    {createdKey}
                  </code>
                  <Button
                    size='sm'
                    onClick={() => copyKeyToClipboard(createdKey)}
                    variant='outline'
                  >
                    Copiar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <DialogFooter>
            <Button onClick={resetAndClose} variant='outline'>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button>
            <IconPlus className='h-4 w-4 mr-2' />
            Nueva API Key
          </Button>
        </DialogTrigger>
      )}

      <DialogContent className='sm:max-w-md'>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Crear nueva API Key</DialogTitle>
            <DialogDescription>
              Crea una nueva API Key para conectar servicios externos mediante MCP o API
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-4 py-4'>
            {/* Campo nombre */}
            <div className='space-y-2'>
              <Label htmlFor='name'>Nombre</Label>
              <Input
                id='name'
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder='Ej: Development Key'
                maxLength={50}
                className={nameError ? 'border-destructive' : ''}
              />
              {nameError && <p className='text-sm text-destructive'>{nameError}</p>}
            </div>

            {/* Checkbox "Todos los proyectos" */}
            <div className='flex items-center space-x-2'>
              <Checkbox
                id='hasAllProjects'
                checked={hasAllProjects}
                onCheckedChange={handleHasAllProjectsChange}
              />
              <Label htmlFor='hasAllProjects'>Acceso a todos los proyectos</Label>
            </div>

            {/* Lista de proyectos específicos */}
            {!hasAllProjects && (
              <div className='space-y-2'>
                <Label>Proyectos específicos</Label>
                {isLoadingProjects ? (
                  <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                    <IconLoader2 className='h-4 w-4 animate-spin' />
                    Cargando proyectos...
                  </div>
                ) : projects.length > 0 ? (
                  <div className='space-y-2 max-h-32 overflow-y-auto border rounded p-2'>
                    {projects.map((project) => (
                      <div key={project.id} className='flex items-center space-x-2'>
                        <Checkbox
                          id={`project-${project.id}`}
                          checked={selectedProjects.includes(project.id)}
                          onCheckedChange={() => handleProjectToggle(project.id)}
                        />
                        <Label htmlFor={`project-${project.id}`} className='text-sm'>
                          {project.title}
                        </Label>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className='text-sm text-muted-foreground'>
                    No tienes proyectos disponibles. La API Key tendrá acceso limitado.
                  </p>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type='button' variant='outline' onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type='submit' disabled={isCreating || !!nameError || name.trim() === ''}>
              {isCreating ? (
                <>
                  <IconLoader2 className='h-4 w-4 mr-2 animate-spin' />
                  Creando...
                </>
              ) : (
                <>
                  <IconKey className='h-4 w-4 mr-2' />
                  Crear API Key
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
