'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { User, Project, Resource } from '@/payload-types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  IconFileText,
  IconVideo,
  IconPhoto,
  IconFile,
  IconEye,
  IconClock,
  IconCalendar,
  IconSettings,
  IconUser,
  IconFolder,
} from '@tabler/icons-react'

interface ClientProjectResourcesTableProps {
  project: Project
  client: User
  adminUser: User
  initialResources: Resource[]
  onResourceAdded?: (resource: Resource) => void
  onResourceRemoved?: (resourceId: string) => void
  onResourceFailed?: (resourceId: string) => void
  onResourceUpdated?: (resource: Resource) => void
}

/**
 * Tabla de recursos del proyecto para contexto administrativo
 *
 * Adaptada de VideoTableContainer/VideoTable para administradores
 * Muestra recursos con información adicional del contexto administrativo
 */
export function ClientProjectResourcesTable({
  project,
  client,
  adminUser,
  initialResources,
  onResourceAdded,
  onResourceRemoved,
  onResourceFailed,
  onResourceUpdated,
}: ClientProjectResourcesTableProps) {
  const [resources] = useState<Resource[]>(initialResources)

  // Función para obtener icono según tipo de recurso
  const getResourceIcon = (resource: Resource) => {
    // Determinar tipo basado en el título o tipo de archivo
    const title = resource.title?.toLowerCase() || ''

    if (title.includes('video') || title.includes('.mp4') || title.includes('.mov')) {
      return <IconVideo className='h-4 w-4 text-blue-600' />
    }

    if (
      title.includes('image') ||
      title.includes('.jpg') ||
      title.includes('.png') ||
      title.includes('.gif')
    ) {
      return <IconPhoto className='h-4 w-4 text-green-600' />
    }

    if (title.includes('document') || title.includes('.pdf') || title.includes('.doc')) {
      return <IconFileText className='h-4 w-4 text-red-600' />
    }

    return <IconFile className='h-4 w-4 text-gray-600' />
  }

  // Función para obtener estado del recurso
  const getResourceStatus = (resource: Resource) => {
    // Lógica básica - se puede expandir según las propiedades disponibles
    if (resource.updatedAt) {
      const daysSinceUpdate = Math.floor(
        (Date.now() - new Date(resource.updatedAt).getTime()) / (1000 * 60 * 60 * 24),
      )

      if (daysSinceUpdate <= 1) return { label: 'Reciente', variant: 'default' as const }
      if (daysSinceUpdate <= 7) return { label: 'Activo', variant: 'secondary' as const }
      if (daysSinceUpdate <= 30) return { label: 'Estable', variant: 'outline' as const }
      return { label: 'Antiguo', variant: 'destructive' as const }
    }

    return { label: 'Sin datos', variant: 'outline' as const }
  }

  // Formatear fecha
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (resources.length === 0) {
    return (
      <div className='space-y-4'>
        <div className='flex items-center justify-between'>
          <h2 className='text-2xl font-semibold'>Recursos del Proyecto</h2>
          <Badge variant='outline'>{resources.length} recursos</Badge>
        </div>

        <div className='rounded-lg border-2 border-dashed border-gray-300 p-12 text-center'>
          <IconFolder className='h-12 w-12 text-gray-400 mx-auto mb-4' />
          <h3 className='text-lg font-semibold text-gray-900 mb-2'>No hay recursos</h3>
          <p className='text-gray-600 mb-4'>Este proyecto no tiene recursos cargados aún.</p>
          <div className='bg-blue-50 p-4 rounded-lg'>
            <p className='text-sm text-blue-800'>
              ℹ️ Los recursos aparecerán aquí cuando el cliente {client.name || client.email} suba
              archivos al proyecto.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className='space-y-4'>
      {/* Header con información */}
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='text-2xl font-semibold'>Recursos del Proyecto</h2>
          <p className='text-sm text-muted-foreground'>
            Gestionando recursos para <strong>{client.name || client.email}</strong>
          </p>
        </div>
        <Badge variant='outline'>{resources.length} recursos</Badge>
      </div>

      {/* Información del contexto administrativo */}
      <div className='bg-amber-50 border border-amber-200 p-4 rounded-lg'>
        <div className='flex items-center gap-2 mb-2'>
          <IconUser className='h-4 w-4 text-amber-600' />
          <p className='text-sm font-medium text-amber-900'>Vista Administrativa</p>
        </div>
        <p className='text-sm text-amber-700'>
          Estás viendo los recursos del proyecto "{project.title}" del cliente {client.email} como
          administrador.
        </p>
      </div>

      {/* Tabla de recursos */}
      <div className='rounded-lg border'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Recurso</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Fecha de Creación</TableHead>
              <TableHead>Última Actualización</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {resources.map((resource) => {
              const status = getResourceStatus(resource)

              return (
                <TableRow key={resource.id}>
                  {/* Información del recurso */}
                  <TableCell>
                    <div className='flex items-center gap-3'>
                      {getResourceIcon(resource)}
                      <div>
                        <p className='font-medium'>
                          {resource.title || `Recurso ${resource.id.slice(0, 8)}`}
                        </p>
                        <p className='text-sm text-muted-foreground'>ID: {resource.id}</p>
                      </div>
                    </div>
                  </TableCell>

                  {/* Estado */}
                  <TableCell>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </TableCell>

                  {/* Fecha de creación */}
                  <TableCell>
                    <div className='flex items-center gap-2 text-sm'>
                      <IconCalendar className='h-4 w-4 text-muted-foreground' />
                      {formatDate(resource.createdAt)}
                    </div>
                  </TableCell>

                  {/* Última actualización */}
                  <TableCell>
                    {resource.updatedAt ? (
                      <div className='flex items-center gap-2 text-sm'>
                        <IconClock className='h-4 w-4 text-muted-foreground' />
                        {formatDate(resource.updatedAt)}
                      </div>
                    ) : (
                      <span className='text-sm text-muted-foreground'>No actualizado</span>
                    )}
                  </TableCell>

                  {/* Acciones */}
                  <TableCell>
                    <div className='flex items-center gap-2'>
                      <Link
                        href={`/clients/${client.id}/projects/${project.id}/resource/${resource.id}`}
                      >
                        <Button variant='outline' size='sm' className='gap-2'>
                          <IconEye className='h-4 w-4' />
                          Ver
                        </Button>
                      </Link>

                      <Button variant='ghost' size='sm' className='gap-2'>
                        <IconSettings className='h-4 w-4' />
                        Configurar
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* Información adicional para administradores */}
      <div className='grid grid-cols-1 md:grid-cols-3 gap-4 text-sm'>
        <div className='bg-muted/50 p-3 rounded-lg'>
          <p className='font-medium text-muted-foreground'>Total de recursos</p>
          <p className='text-lg font-semibold'>{resources.length}</p>
        </div>

        <div className='bg-muted/50 p-3 rounded-lg'>
          <p className='font-medium text-muted-foreground'>Proyecto creado</p>
          <p className='text-lg font-semibold'>
            {new Date(project.createdAt).toLocaleDateString('es-ES', {
              month: 'short',
              year: 'numeric',
            })}
          </p>
        </div>

        <div className='bg-muted/50 p-3 rounded-lg'>
          <p className='font-medium text-muted-foreground'>Cliente</p>
          <p className='text-lg font-semibold truncate'>{client.name || client.email}</p>
        </div>
      </div>
    </div>
  )
}
