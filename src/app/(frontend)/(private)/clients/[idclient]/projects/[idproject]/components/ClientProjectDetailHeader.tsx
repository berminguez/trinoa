import type { User, Project } from '@/payload-types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  IconFolder,
  IconUser,
  IconSettings,
  IconShield,
} from '@tabler/icons-react'

interface ClientProjectDetailHeaderProps {
  project: Project
  client: User
  adminUser: User
  totalResources: number
}

/**
 * Header para el detalle de proyecto en contexto administrativo
 *
 * Adaptado de ProjectDetailHeader.tsx para mostrar información
 * tanto del proyecto como del cliente propietario
 */
export function ClientProjectDetailHeader({
  project,
  client,
  adminUser,
  totalResources,
}: ClientProjectDetailHeaderProps) {
  // Formatear fechas
  const createdDate = new Date(project.createdAt).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  // Usar lastActivity si está disponible (calculado con recursos), sino usar updatedAt
  const lastActivityDate = (project as any).lastActivity || project.updatedAt
  const updatedDate = lastActivityDate
    ? new Date(lastActivityDate).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null

  // Calcular días desde última actualización usando lastActivity
  const daysSinceUpdate = lastActivityDate
    ? Math.floor((Date.now() - new Date(lastActivityDate).getTime()) / (1000 * 60 * 60 * 24))
    : Math.floor((Date.now() - new Date(project.createdAt).getTime()) / (1000 * 60 * 60 * 24))

  return (
    <div className='space-y-6'>
      {/* Información principal del proyecto y cliente */}
      <div className='flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6'>
        {/* Lado izquierdo: Información del proyecto */}
        <div className='flex-1 space-y-4'>
          {/* Título y descripción */}
          <div className='space-y-2'>
            <div className='flex items-center gap-3'>
              <div className='h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center'>
                <IconFolder className='h-6 w-6 text-primary' />
              </div>
              <div>
                <h1 className='text-3xl font-bold tracking-tight'>{project.title}</h1>
                <p className='text-muted-foreground flex items-center gap-2'>
                  Proyecto ID: {project.id}
                  <Badge variant='outline' className='text-xs'>
                    {project.slug}
                  </Badge>
                </p>
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
                  ) : project.description ? (
                    <p className='text-sm text-muted-foreground'>
                      {typeof project.description === 'string'
                        ? project.description
                        : 'Descripción no disponible'}
                    </p>
                  ) : (
                    <p className='text-sm text-muted-foreground'>Sin descripción</p>
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
                {(client.role || 'user').toUpperCase()}
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
            <Button variant='outline' className='w-full gap-2'>
              <IconSettings className='h-4 w-4' />
              Configurar Proyecto
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
          <div className='text-sm font-medium text-blue-600'>{createdDate}</div>
          <div className='text-sm text-muted-foreground'>Creado</div>
        </div>

        <div className='bg-muted/50 p-4 rounded-lg'>
          <div className='text-sm font-medium text-purple-600'>
            {updatedDate || createdDate}
          </div>
          <div className='text-sm text-muted-foreground'>Actualizado</div>
        </div>
      </div>
    </div>
  )
}
