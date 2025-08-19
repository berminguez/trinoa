import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  IconFolder,
  IconFiles,
  IconExternalLink,
  IconPlus,
  IconListDetails,
} from '@tabler/icons-react'
import { getRecentProjects } from '@/actions/dashboard'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import Link from 'next/link'

interface PersonalProjectsProps {
  userId: string
}

/**
 * Componente que muestra los proyectos personales del usuario
 */
export default async function PersonalProjects({ userId }: PersonalProjectsProps) {
  // Obtener proyectos reales del servidor
  const result = await getRecentProjects(3)

  // Transformar datos para mostrar
  const projects =
    result.success && result.data
      ? result.data.map((project) => ({
          id: project.id,
          title: project.title,
          slug: project.slug,
          resourcesCount: project.resourcesCount, // Contador real de recursos
          lastUpdated: formatDistanceToNow(new Date(project.updatedAt), {
            addSuffix: true,
            locale: es,
          }),
          status: 'active',
        }))
      : []

  return (
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          <IconFolder className='h-5 w-5' />
          Mis Proyectos
        </CardTitle>
        <CardDescription>Proyectos recientes y más utilizados</CardDescription>
      </CardHeader>
      <CardContent>
        <div className='space-y-4'>
          {projects.length === 0 ? (
            <div className='text-center py-8'>
              <IconFolder className='h-12 w-12 text-gray-400 mx-auto mb-4' />
              <p className='text-gray-500 mb-2'>No tienes proyectos aún</p>
              <p className='text-sm text-gray-400'>Crea tu primer proyecto para comenzar</p>
            </div>
          ) : (
            projects.map((project) => (
              <div
                key={project.id}
                className='flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors'
              >
                <Link
                  href={`/projects/${project.id}`}
                  className='flex items-center justify-between w-full'
                >
                  <div className='flex items-center gap-3 cursor-pointer'>
                    <div className='h-10 w-10 bg-blue-500 rounded-lg flex items-center justify-center'>
                      <IconFolder className='h-5 w-5 text-white' />
                    </div>
                    <div>
                      <p className='font-medium text-sm'>{project.title}</p>
                      <div className='flex items-center gap-2 mt-1'>
                        <div className='flex items-center gap-1 text-xs text-gray-600'>
                          <IconFiles className='h-3 w-3' />
                          {project.resourcesCount || 0} documentos
                        </div>
                        <Badge variant='outline' className='text-xs py-0'>
                          {project.lastUpdated}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <Button variant='ghost' size='sm' asChild>
                    <a href={`/projects/${project.id}`}>
                      <IconExternalLink className='h-4 w-4' />
                    </a>
                  </Button>
                </Link>
              </div>
            ))
          )}
        </div>

        {/* Botón para crear nuevo proyecto */}
        <div className='mt-6 pt-4 border-t'>
          <Button variant='outline' className='w-full' asChild>
            <a href='/projects' className='flex items-center gap-2'>
              <IconListDetails className='h-4 w-4' />
              Ver todos los proyectos
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
