import { IconVideo, IconClock, IconCalendar } from '@tabler/icons-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import type { Resource } from '@/payload-types'
import Link from 'next/link'

interface ProjectVideosTableProps {
  resources: Resource[]
  projectId: string
}

export function ProjectVideosTable({ resources, projectId }: ProjectVideosTableProps) {
  return (
    <Card>
      <CardHeader>
        <div className='flex items-center justify-between'>
          <CardTitle>Videos</CardTitle>
          <span className='text-sm text-muted-foreground'>
            {resources.length} video{resources.length !== 1 ? 's' : ''}
          </span>
        </div>
      </CardHeader>
      <CardContent className='p-0'>
        {resources.length === 0 ? (
          // Estado vacío
          <div className='text-center py-12'>
            <IconVideo className='h-12 w-12 text-muted-foreground mx-auto mb-4' />
            <h3 className='text-lg font-semibold mb-2'>No videos yet</h3>
            <p className='text-muted-foreground'>
              Sube documentos para empezar a construir tu proyecto
            </p>
          </div>
        ) : (
          // Tabla de videos
          <div className='overflow-x-auto'>
            {/* Header */}
            <div className='border-b px-6 py-3 bg-muted/50'>
              <div className='grid grid-cols-6 gap-4 text-sm font-medium text-muted-foreground'>
                <div className='flex items-center'>
                  <Checkbox className='mr-2' />
                  <span>Select</span>
                </div>
                <div>Thumbnail</div>
                <div>Filename</div>
                <div>Duration</div>
                <div>Uploaded</div>
                <div>Status</div>
              </div>
            </div>

            {/* Rows */}
            {resources.map((resource) => (
              <div key={resource.id} className='border-b px-6 py-4 hover:bg-muted/50'>
                <div className='grid grid-cols-6 gap-4 items-center'>
                  {/* Checkbox */}
                  <div className='flex items-center'>
                    <Checkbox />
                  </div>

                  {/* Thumbnail */}
                  <div className='flex items-center'>
                    <div className='h-12 w-16 bg-muted rounded flex items-center justify-center'>
                      <IconVideo className='h-6 w-6 text-muted-foreground' />
                    </div>
                  </div>

                  {/* Filename */}
                  <div className='min-w-0'>
                    <Link
                      href={`/projects/${projectId}/resource/${resource.id}`}
                      className='font-medium truncate block hover:underline'
                    >
                      {resource.title}
                    </Link>
                    <p className='text-sm text-muted-foreground truncate'>
                      {resource.namespace || 'No namespace'}
                    </p>
                  </div>

                  {/* Duration */}
                  <div className='flex items-center gap-1 text-sm text-muted-foreground'>
                    <IconClock className='h-4 w-4' />
                    <span>--:--</span> {/* TODO: Add actual duration */}
                  </div>

                  {/* Uploaded date */}
                  <div className='flex items-center gap-1 text-sm text-muted-foreground'>
                    <IconCalendar className='h-4 w-4' />
                    <span>{new Date(resource.createdAt).toLocaleDateString()}</span>
                  </div>

                  {/* Status */}
                  <div>
                    <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800'>
                      {resource.status || 'Pending'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
