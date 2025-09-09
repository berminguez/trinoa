import type { User, Resource, Project } from '@/payload-types'
import { AdminBreadcrumbs } from '@/components'
import { ConfidenceBadge } from '@/components/ui/confidence-badge'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getPayload } from 'payload'
import config from '@/payload.config'
import Link from 'next/link'
import {
  IconExternalLink,
  IconCalendar,
  IconUser,
  IconFileText,
  IconShield,
} from '@tabler/icons-react'

interface ClientResourceContentProps {
  adminUser: User
  clientId: string
  projectId: string
  resourceId: string
}

/**
 * Contenido principal para detalle de recurso específico de proyecto de cliente
 *
 * Vista administrativa completa del recurso incluyendo:
 * - ConfidenceBadge para mostrar estado de confianza
 * - Información detallada del recurso, proyecto y cliente
 * - Navegación contextual y breadcrumbs con nombres reales
 * - Acciones administrativas y enlaces a visualizador
 */
export async function ClientResourceContent({
  adminUser,
  clientId,
  projectId,
  resourceId,
}: ClientResourceContentProps) {
  try {
    const payload = await getPayload({ config })

    // Obtener datos del recurso con relaciones
    const resource = (await payload.findByID({
      collection: 'resources',
      id: resourceId,
      depth: 2,
      overrideAccess: true,
    })) as Resource

    // Obtener datos del proyecto
    const project = (await payload.findByID({
      collection: 'projects',
      id: projectId,
      depth: 1,
      overrideAccess: true,
    })) as Project

    // Obtener datos del cliente
    const client = (await payload.findByID({
      collection: 'users',
      id: clientId,
      depth: 0,
      overrideAccess: true,
    })) as User

    // Verificar que el recurso pertenece al proyecto
    const resourceProjectId =
      typeof resource.project === 'object' ? resource.project.id : resource.project
    if (resourceProjectId !== projectId) {
      throw new Error('Resource does not belong to the specified project')
    }

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

    // Obtener URL del archivo si existe
    const mediaFile = resource.file
    const fileUrl = typeof mediaFile === 'object' && mediaFile?.url ? mediaFile.url : null

    return (
      <div className='flex-1 space-y-6 p-4 pt-6'>
        {/* Breadcrumb con nombres reales */}
        {AdminBreadcrumbs.resourceDetail(
          client.name || client.email,
          clientId,
          project.title || 'Proyecto sin título',
          projectId,
          resource.title || 'Recurso sin título',
          resourceId,
        )}

        {/* Header con información principal */}
        <div className='space-y-4'>
          <div className='flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4'>
            <div className='space-y-2'>
              <h1 className='text-3xl font-bold tracking-tight'>
                {resource.title || 'Recurso sin título'}
              </h1>
              <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                <IconShield className='h-4 w-4 text-green-600' />
                <span>Administrando como {adminUser.name || adminUser.email}</span>
              </div>
            </div>

            {/* Badges de estado y confidence */}
            <div className='flex flex-col sm:flex-row gap-2'>
              {/* Estado del procesamiento */}
              <Badge
                className={
                  resource.status === 'completed'
                    ? 'bg-green-100 text-green-800'
                    : resource.status === 'processing'
                      ? 'bg-blue-100 text-blue-800'
                      : resource.status === 'failed'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                }
              >
                {resource.status === 'completed'
                  ? 'Completado'
                  : resource.status === 'processing'
                    ? 'Procesando'
                    : resource.status === 'failed'
                      ? 'Fallido'
                      : 'Pendiente'}
              </Badge>

              {/* Badge de confidence */}
              <ConfidenceBadge
                confidence={resource.confidence || 'empty'}
                showIcon={true}
                showTooltip={true}
              />
            </div>
          </div>
        </div>

        {/* Información del recurso */}
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
          {/* Información principal */}
          <div className='lg:col-span-2 space-y-6'>
            {/* Metadatos principales */}
            <Card>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <IconFileText className='h-5 w-5' />
                  Información del Recurso
                </CardTitle>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                  <div>
                    <label className='text-sm font-medium text-muted-foreground'>Tipo</label>
                    <p className='text-sm'>{resource.type || 'No especificado'}</p>
                  </div>
                  <div>
                    <label className='text-sm font-medium text-muted-foreground'>Namespace</label>
                    <p className='text-sm'>{resource.namespace || 'Sin namespace'}</p>
                  </div>
                  <div>
                    <label className='text-sm font-medium text-muted-foreground'>Caso</label>
                    <p className='text-sm'>{resource.caso || 'No especificado'}</p>
                  </div>
                  <div>
                    <label className='text-sm font-medium text-muted-foreground'>
                      Tipo de negocio
                    </label>
                    <p className='text-sm'>{resource.tipo || 'No especificado'}</p>
                  </div>
                </div>

                {/* Descripción si existe */}
                {resource.description && (
                  <div>
                    <label className='text-sm font-medium text-muted-foreground'>Descripción</label>
                    <p className='text-sm'>{resource.description}</p>
                  </div>
                )}

                {/* Información temporal */}
                <div className='pt-4 border-t'>
                  <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                    <div className='flex items-center gap-2 text-sm'>
                      <IconCalendar className='h-4 w-4 text-muted-foreground' />
                      <div>
                        <p className='font-medium'>Creado</p>
                        <p className='text-muted-foreground'>{createdDate}</p>
                      </div>
                    </div>
                    {updatedDate && (
                      <div className='flex items-center gap-2 text-sm'>
                        <IconCalendar className='h-4 w-4 text-muted-foreground' />
                        <div>
                          <p className='font-medium'>Actualizado</p>
                          <p className='text-muted-foreground'>{updatedDate}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Acciones del archivo */}
            {fileUrl && (
              <Card>
                <CardHeader>
                  <CardTitle>Archivo del Recurso</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className='flex flex-col sm:flex-row gap-3'>
                    <Button asChild>
                      <a href={fileUrl} target='_blank' rel='noopener noreferrer'>
                        <IconExternalLink className='h-4 w-4 mr-2' />
                        Ver archivo original
                      </a>
                    </Button>
                    <Button asChild variant='outline'>
                      <Link href={`/projects/${projectId}/resource/${resourceId}`}>
                        <IconFileText className='h-4 w-4 mr-2' />
                        Ver en visualizador
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Panel lateral */}
          <div className='space-y-6'>
            {/* Información del contexto */}
            <Card>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <IconUser className='h-5 w-5' />
                  Contexto
                </CardTitle>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div>
                  <label className='text-sm font-medium text-muted-foreground'>Cliente</label>
                  <p className='text-sm font-medium'>{client.name || client.email}</p>
                  <Badge variant='outline' className='mt-1'>
                    {client.role?.toUpperCase() || 'USER'}
                  </Badge>
                </div>
                <div>
                  <label className='text-sm font-medium text-muted-foreground'>Proyecto</label>
                  <p className='text-sm font-medium'>{project.title || 'Sin título'}</p>
                </div>
              </CardContent>
            </Card>

            {/* Navegación rápida */}
            <Card>
              <CardHeader>
                <CardTitle>Navegación</CardTitle>
              </CardHeader>
              <CardContent className='space-y-2'>
                <Button asChild variant='outline' className='w-full justify-start'>
                  <Link href={`/clients/${clientId}`}>
                    <IconUser className='h-4 w-4 mr-2' />
                    Ver perfil del cliente
                  </Link>
                </Button>
                <Button asChild variant='outline' className='w-full justify-start'>
                  <Link href={`/clients/${clientId}/projects/${projectId}`}>
                    <IconFileText className='h-4 w-4 mr-2' />
                    Ver proyecto completo
                  </Link>
                </Button>
                <Button asChild variant='outline' className='w-full justify-start'>
                  <Link href={`/clients/${clientId}/projects`}>
                    <IconFileText className='h-4 w-4 mr-2' />
                    Todos los proyectos
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  } catch (error) {
    console.error('Error loading resource details:', error)

    return (
      <div className='flex-1 space-y-6 p-4 pt-6'>
        <div className='space-y-2'>
          <h1 className='text-3xl font-bold tracking-tight text-red-600'>
            Error al cargar recurso
          </h1>
          <p className='text-muted-foreground'>
            No se pudo cargar la información del recurso. Verifica que existe y que tienes permisos.
          </p>
        </div>

        <Card>
          <CardContent className='pt-6'>
            <div className='space-y-4'>
              <p className='text-sm text-muted-foreground'>
                <strong>Cliente ID:</strong> {clientId}
              </p>
              <p className='text-sm text-muted-foreground'>
                <strong>Proyecto ID:</strong> {projectId}
              </p>
              <p className='text-sm text-muted-foreground'>
                <strong>Recurso ID:</strong> {resourceId}
              </p>
              <Button asChild>
                <Link href={`/clients/${clientId}/projects`}>Volver a proyectos del cliente</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }
}
