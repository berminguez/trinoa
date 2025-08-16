'use client'

import { useState, useEffect } from 'react'
import {
  IconUpload,
  IconCopy,
  IconEdit,
  IconCheck,
  IconX,
  IconFolder,
  IconUser,
  IconClock,
  IconCalendar,
  IconFileText,
  IconSettings,
  IconShield,
} from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import type { Project, User, Resource } from '@/payload-types'
import { updateProjectAsAdmin } from '@/actions/projects/updateProjectAsAdmin'
import { DocumentUploadModal } from '@/app/(frontend)/(private)/projects/[id]/components/DocumentUploadModal'

interface ClientProjectDetailHeaderEditableProps {
  project: Project
  client: User
  adminUser: User
  totalResources: number
  onResourceUploaded?: (resource: Resource) => void
  onResourceUploadFailed?: (tempResourceId: string) => void
  onResourceAdded?: (resource: Resource) => void
}

/**
 * Header editable para el detalle de proyecto en contexto administrativo
 *
 * Adaptado de ProjectDetailHeader.tsx con capacidades de edición
 * para administradores gestionando proyectos de clientes
 */
export function ClientProjectDetailHeaderEditable({
  project,
  client,
  adminUser,
  totalResources,
  onResourceUploaded,
  onResourceUploadFailed,
  onResourceAdded,
}: ClientProjectDetailHeaderEditableProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editedTitle, setEditedTitle] = useState(project.title)
  const [isUpdating, setIsUpdating] = useState(false)

  // Formatear fechas
  const createdDate = new Date(project.createdAt).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const updatedDate = project.updatedAt
    ? new Date(project.updatedAt).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null

  // Calcular días desde última actualización
  const daysSinceUpdate = project.updatedAt
    ? Math.floor((Date.now() - new Date(project.updatedAt).getTime()) / (1000 * 60 * 60 * 24))
    : Math.floor((Date.now() - new Date(project.createdAt).getTime()) / (1000 * 60 * 60 * 24))

  // Copiar ID del proyecto al clipboard
  const copyProjectId = async () => {
    try {
      await navigator.clipboard.writeText(project.id)
      toast.success('ID del proyecto copiado', {
        description: 'El ID del proyecto se ha copiado al portapapeles',
      })
    } catch (error) {
      toast.error('Error al copiar', {
        description: 'No se pudo copiar el ID del proyecto',
      })
    }
  }

  // Manejar la edición del título
  const handleTitleEdit = () => {
    setIsEditingTitle(true)
    setEditedTitle(project.title)
  }

  const handleTitleCancel = () => {
    setIsEditingTitle(false)
    setEditedTitle(project.title)
  }

  const handleTitleSave = async () => {
    if (editedTitle.trim() === project.title || !editedTitle.trim()) {
      setIsEditingTitle(false)
      return
    }

    setIsUpdating(true)

    try {
      const result = await updateProjectAsAdmin(project.id, {
        title: editedTitle.trim(),
        clientId: client.id, // Validación adicional de seguridad
      })

      if (result.success && result.data) {
        toast.success('Título actualizado', {
          description:
            result.message || `El título del proyecto se cambió a "${editedTitle.trim()}"`,
        })
        setIsEditingTitle(false)

        // Refrescar la página para mostrar los cambios
        window.location.reload()
      } else {
        toast.error('Error al actualizar', {
          description: result.message || 'No se pudo actualizar el título del proyecto',
        })
      }
    } catch (error) {
      console.error('Error updating project title as admin:', error)
      toast.error('Error inesperado', {
        description: 'Ocurrió un error inesperado al actualizar el título',
      })
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className='space-y-6'>
      {/* Banner administrativo */}
      <div className='bg-amber-50 border border-amber-200 p-4 rounded-lg'>
        <div className='flex items-center gap-2 mb-2'>
          <IconShield className='h-4 w-4 text-amber-600' />
          <p className='text-sm font-medium text-amber-900'>Modo de Edición Administrativa</p>
        </div>
        <p className='text-sm text-amber-700'>
          Estás editando el proyecto "{project.title}" del cliente {client.email} como
          administrador. Todos los cambios se registrarán en el log de auditoría.
        </p>
      </div>

      {/* Información principal del proyecto y cliente */}
      <div className='flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6'>
        {/* Lado izquierdo: Información del proyecto */}
        <div className='flex-1 space-y-4'>
          {/* Título editable y descripción */}
          <div className='space-y-2'>
            <div className='flex items-center gap-3'>
              <div className='h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center'>
                <IconFolder className='h-6 w-6 text-primary' />
              </div>
              <div className='flex-1'>
                {isEditingTitle ? (
                  <div className='space-y-2'>
                    <Input
                      value={editedTitle}
                      onChange={(e) => setEditedTitle(e.target.value)}
                      className='text-2xl font-bold h-12'
                      disabled={isUpdating}
                      placeholder='Título del proyecto...'
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleTitleSave()
                        if (e.key === 'Escape') handleTitleCancel()
                      }}
                      autoFocus
                    />
                    <div className='flex items-center gap-2'>
                      <Button
                        size='sm'
                        onClick={handleTitleSave}
                        disabled={isUpdating || !editedTitle.trim()}
                        className='gap-2'
                      >
                        <IconCheck className='h-4 w-4' />
                        {isUpdating ? 'Guardando...' : 'Guardar'}
                      </Button>
                      <Button
                        size='sm'
                        variant='outline'
                        onClick={handleTitleCancel}
                        disabled={isUpdating}
                        className='gap-2'
                      >
                        <IconX className='h-4 w-4' />
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className='flex items-center gap-3'>
                      <h1 className='text-3xl font-bold tracking-tight'>{project.title}</h1>
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={handleTitleEdit}
                        className='gap-2 text-muted-foreground hover:text-foreground'
                      >
                        <IconEdit className='h-4 w-4' />
                        Editar
                      </Button>
                    </div>
                    <div className='flex items-center gap-2'>
                      <p className='text-muted-foreground'>Proyecto ID: {project.id}</p>
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={copyProjectId}
                        className='h-6 px-2 gap-1 text-muted-foreground hover:text-foreground'
                      >
                        <IconCopy className='h-3 w-3' />
                        Copiar
                      </Button>
                      <Badge variant='outline' className='text-xs'>
                        {project.slug}
                      </Badge>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Descripción si existe */}
            {project.description && (
              <div className='bg-muted/30 p-4 rounded-lg'>
                <div className='prose prose-sm max-w-none'>
                  {/* Renderizar description que es un array de RichText */}
                  {Array.isArray(project.description) ? (
                    project.description.map((block: any, index: number) => (
                      <p key={index} className='text-sm text-muted-foreground mb-2 last:mb-0'>
                        {block.children?.map((child: any) => child.text).join('') || ''}
                      </p>
                    ))
                  ) : (
                    <p className='text-sm text-muted-foreground'>{project.description}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Información del cliente propietario */}
          <div className='bg-blue-50 border border-blue-200 p-4 rounded-lg'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-3'>
                <IconUser className='h-5 w-5 text-blue-600' />
                <div>
                  <p className='text-sm font-medium text-blue-900'>Propietario del Proyecto</p>
                  <p className='text-sm text-blue-700'>{client.name || client.email}</p>
                  <p className='text-xs text-blue-600'>{client.email}</p>
                </div>
              </div>
              <Badge variant={client.role === 'admin' ? 'destructive' : 'secondary'}>
                {client.role.toUpperCase()}
              </Badge>
            </div>
          </div>
        </div>

        {/* Lado derecho: Estadísticas y acciones */}
        <div className='lg:w-80 space-y-4'>
          {/* Información del administrador */}
          <div className='bg-green-50 border border-green-200 p-4 rounded-lg'>
            <div className='flex items-center gap-2 mb-2'>
              <IconShield className='h-4 w-4 text-green-600' />
              <p className='text-sm font-medium text-green-900'>Gestionado por Admin</p>
            </div>
            <p className='text-sm text-green-700'>{adminUser.name || adminUser.email}</p>
            <Badge variant='outline' className='text-xs mt-2'>
              Administrador
            </Badge>
          </div>

          {/* Acciones administrativas */}
          <div className='space-y-2'>
            <DocumentUploadModal
              projectId={project.id}
              onResourceUploaded={onResourceUploaded}
              onResourceUploadFailed={onResourceUploadFailed}
              onResourceAdded={onResourceAdded}
              trigger={
                <Button className='w-full gap-2'>
                  <IconUpload className='h-4 w-4' />
                  Subir Recurso para Cliente
                </Button>
              }
            />

            <Button variant='outline' className='w-full gap-2'>
              <IconSettings className='h-4 w-4' />
              Configurar Proyecto
            </Button>

            <Button variant='outline' className='w-full gap-2'>
              <IconFileText className='h-4 w-4' />
              Ver Logs del Proyecto
            </Button>
          </div>
        </div>
      </div>

      {/* Estadísticas del proyecto */}
      <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
        <div className='bg-muted/50 p-4 rounded-lg'>
          <div className='text-2xl font-bold text-primary'>{totalResources}</div>
          <div className='text-sm text-muted-foreground'>Recursos Totales</div>
        </div>

        <div className='bg-muted/50 p-4 rounded-lg'>
          <div className='text-2xl font-bold text-green-600'>{daysSinceUpdate}d</div>
          <div className='text-sm text-muted-foreground'>Días sin actividad</div>
        </div>

        <div className='bg-muted/50 p-4 rounded-lg'>
          <div className='text-2xl font-bold text-blue-600'>
            {createdDate.split(' ')[2]} {/* Solo el año */}
          </div>
          <div className='text-sm text-muted-foreground'>Año de creación</div>
        </div>

        <div className='bg-muted/50 p-4 rounded-lg'>
          <div className='text-2xl font-bold text-purple-600'>
            {project.slug?.split('-').length || 1}
          </div>
          <div className='text-sm text-muted-foreground'>Palabras en slug</div>
        </div>
      </div>

      {/* Información temporal detallada */}
      <div className='flex flex-wrap gap-4 text-sm text-muted-foreground'>
        <div className='flex items-center gap-2'>
          <IconCalendar className='h-4 w-4' />
          <span>Creado: {createdDate}</span>
        </div>
        {updatedDate && (
          <div className='flex items-center gap-2'>
            <IconClock className='h-4 w-4' />
            <span>Actualizado: {updatedDate}</span>
          </div>
        )}
        <div className='flex items-center gap-2'>
          <IconFolder className='h-4 w-4' />
          <span>
            Última actividad: hace {daysSinceUpdate} día{daysSinceUpdate !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
    </div>
  )
}
