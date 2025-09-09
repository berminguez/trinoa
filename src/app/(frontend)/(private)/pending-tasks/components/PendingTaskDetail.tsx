'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { IconFileText, IconUser, IconFolder, IconExternalLink, IconEdit } from '@tabler/icons-react'
import type { User, Resource, Project } from '@/payload-types'
import { ConfidenceBadge } from '@/components/ConfidenceBadge'
import Link from 'next/link'
import { updateResourceAction } from '@/actions/resources/updateResource'
import { toast } from 'sonner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface PendingTaskDetailProps {
  resource: Resource
  adminUser: User
  onResourceUpdated: () => void
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
}

/**
 * Componente de detalle para una tarea pendiente
 * Permite revisar y actualizar el estado de confianza del recurso
 */
export function PendingTaskDetail({
  resource,
  adminUser,
  onResourceUpdated,
  isLoading,
  setIsLoading,
}: PendingTaskDetailProps) {
  const [confidence, setConfidence] = useState(resource.confidence)
  const [isSaving, setIsSaving] = useState(false)

  // Información del proyecto y cliente
  const project = resource.project as Project
  const createdBy = project?.createdBy as User
  const projectId = typeof resource.project === 'object' ? resource.project.id : resource.project
  const clientId =
    typeof project?.createdBy === 'object' ? project.createdBy.id : project?.createdBy

  // Formatear fechas
  const createdDate = new Date(resource.createdAt).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const updatedDate = resource.updatedAt
    ? new Date(resource.updatedAt).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null

  // Manejar actualización de confianza
  const handleConfidenceUpdate = useCallback(
    async (newConfidence: string) => {
      if (isSaving || isLoading) return

      setIsSaving(true)
      setIsLoading(true)

      try {
        const result = await updateResourceAction(projectId, resource.id, {
          confidence: newConfidence,
        })

        if (result.success) {
          setConfidence(newConfidence as any)
          toast.success('Confianza actualizada correctamente')

          // Si se cambió a trusted o verified, ya no es una tarea pendiente
          if (newConfidence === 'trusted' || newConfidence === 'verified') {
            toast.success('Tarea completada - será removida de la lista')
            setTimeout(() => {
              onResourceUpdated()
            }, 1000)
          }
        } else {
          toast.error(result.error || 'No se pudo actualizar la confianza')
        }
      } catch (error) {
        console.error('Error updating confidence:', error)
        toast.error('Error inesperado al actualizar')
      } finally {
        setIsSaving(false)
        setIsLoading(false)
      }
    },
    [projectId, resource.id, isSaving, isLoading, setIsLoading, onResourceUpdated],
  )

  // Enlaces de navegación
  const viewResourceUrl = `/clients/${clientId}/projects/${projectId}/resource/${resource.id}`
  const viewProjectUrl = `/clients/${clientId}/projects/${projectId}`
  const viewClientUrl = `/clients/${clientId}`

  return (
    <div className='space-y-6'>
      {/* Información básica del recurso */}
      <div className='space-y-4'>
        <div>
          <h2 className='text-xl font-semibold mb-2'>{resource.title}</h2>
          <div className='flex items-center gap-2 mb-4'>
            <Badge variant={resource.status === 'completed' ? 'default' : 'destructive'}>
              {resource.status}
            </Badge>
            <ConfidenceBadge confidence={confidence} />
          </div>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-2 gap-4 text-sm'>
          <div className='space-y-2'>
            <div>
              <span className='font-medium'>Creado:</span>
              <p className='text-muted-foreground'>{createdDate}</p>
            </div>
            {updatedDate && (
              <div>
                <span className='font-medium'>Actualizado:</span>
                <p className='text-muted-foreground'>{updatedDate}</p>
              </div>
            )}
          </div>

          <div className='space-y-2'>
            <div>
              <span className='font-medium'>Proyecto:</span>
              <p className='text-muted-foreground'>{project?.title || 'Sin proyecto'}</p>
            </div>
            <div>
              <span className='font-medium'>Cliente:</span>
              <p className='text-muted-foreground'>
                {createdBy?.name || createdBy?.email || 'Cliente desconocido'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Actualización de confianza */}
      <Card>
        <CardHeader>
          <CardTitle className='text-lg'>Actualizar Estado de Confianza</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='space-y-4'>
            <div>
              <label className='text-sm font-medium mb-2 block'>
                Estado actual: <ConfidenceBadge confidence={confidence} />
              </label>
              <p className='text-sm text-muted-foreground mb-4'>
                Cambia el estado de confianza según tu revisión del recurso
              </p>
            </div>

            <div className='flex items-center gap-3'>
              <Select
                value={confidence || undefined}
                onValueChange={handleConfidenceUpdate}
                disabled={isSaving || isLoading}
              >
                <SelectTrigger className='w-48'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='empty'>Vacío o no aplica</SelectItem>
                  <SelectItem value='needs_revision'>Necesita revisión</SelectItem>
                  <SelectItem value='trusted'>Confiable</SelectItem>
                  <SelectItem value='verified'>Verificado</SelectItem>
                </SelectContent>
              </Select>

              {(isSaving || isLoading) && (
                <span className='text-sm text-muted-foreground'>Guardando...</span>
              )}
            </div>

            <div className='text-xs text-muted-foreground'>
              <p>
                <strong>Confiable:</strong> Los datos extraídos son correctos y se pueden usar
              </p>
              <p>
                <strong>Verificado:</strong> Los datos han sido verificados manualmente por un
                administrador
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Campos extraídos */}
      {resource.nombre_cliente && (
        <Card>
          <CardHeader>
            <CardTitle className='text-lg'>Campos Extraídos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='grid gap-3'>
              <div>
                <label className='text-sm font-medium'>Nombre Cliente:</label>
                <p className='text-sm bg-muted p-2 rounded mt-1'>
                  {resource.nombre_cliente || 'No especificado'}
                </p>
              </div>

              {resource.caso && (
                <div>
                  <label className='text-sm font-medium'>Caso:</label>
                  <p className='text-sm bg-muted p-2 rounded mt-1'>{resource.caso}</p>
                </div>
              )}

              {resource.tipo && (
                <div>
                  <label className='text-sm font-medium'>Tipo:</label>
                  <p className='text-sm bg-muted p-2 rounded mt-1'>{resource.tipo}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enlaces de navegación */}
      <Card>
        <CardHeader>
          <CardTitle className='text-lg'>Navegación</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='grid gap-2'>
            <Button asChild variant='outline' className='justify-start'>
              <Link href={viewResourceUrl}>
                <IconEdit className='h-4 w-4 mr-2' />
                Editar recurso completo
                <IconExternalLink className='h-3 w-3 ml-auto' />
              </Link>
            </Button>

            <Button asChild variant='outline' className='justify-start'>
              <Link href={viewProjectUrl}>
                <IconFolder className='h-4 w-4 mr-2' />
                Ver proyecto completo
                <IconExternalLink className='h-3 w-3 ml-auto' />
              </Link>
            </Button>

            <Button asChild variant='outline' className='justify-start'>
              <Link href={viewClientUrl}>
                <IconUser className='h-4 w-4 mr-2' />
                Ver perfil del cliente
                <IconExternalLink className='h-3 w-3 ml-auto' />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
