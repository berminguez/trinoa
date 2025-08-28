import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { IconClipboardList, IconRefresh } from '@tabler/icons-react'
import type { User, Resource } from '@/payload-types'
import Link from 'next/link'

interface PendingTasksHeaderProps {
  totalTasks: number
  adminUser: User
  currentTask?: Resource
  currentIndex?: number
}

/**
 * Header para la página de tareas pendientes
 *
 * Muestra información general sobre las tareas pendientes y navegación
 */
export function PendingTasksHeader({
  totalTasks,
  adminUser,
  currentTask,
  currentIndex,
}: PendingTasksHeaderProps) {
  return (
    <Card>
      <CardHeader>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <IconClipboardList className='h-6 w-6 text-orange-600' />
            <div>
              <CardTitle>Tareas Pendientes</CardTitle>
              <p className='text-sm text-muted-foreground mt-1'>
                Recursos que requieren revisión administrativa
              </p>
            </div>
          </div>

          <div className='flex items-center gap-2'>
            <Badge variant={totalTasks > 0 ? 'destructive' : 'secondary'}>
              {totalTasks} {totalTasks === 1 ? 'tarea' : 'tareas'}
            </Badge>

            <Button variant='outline' size='sm' asChild>
              <Link href='/pending-tasks'>
                <IconRefresh className='h-4 w-4 mr-2' />
                Actualizar
              </Link>
            </Button>
          </div>
        </div>
      </CardHeader>

      {currentTask && typeof currentIndex === 'number' && (
        <CardContent>
          <div className='flex items-center justify-between p-4 bg-muted/30 rounded-lg'>
            <div>
              <h3 className='font-medium'>Revisando:</h3>
              <p className='text-sm text-muted-foreground truncate max-w-md'>{currentTask.title}</p>
            </div>

            <div className='text-right'>
              <p className='text-sm font-medium'>
                Tarea {currentIndex + 1} de {totalTasks}
              </p>
              <div className='flex items-center gap-2 mt-1'>
                <Badge variant='outline'>{currentTask.status}</Badge>
                <Badge variant='outline'>{currentTask.confidence}</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
