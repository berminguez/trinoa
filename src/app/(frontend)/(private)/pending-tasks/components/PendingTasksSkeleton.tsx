import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * Skeleton para la página de tareas pendientes
 *
 * Replica la estructura de PendingTasksContent mientras carga
 */
export function PendingTasksSkeleton() {
  return (
    <div className='flex-1 space-y-6 p-4 pt-6'>
      {/* Breadcrumb skeleton */}
      <div className='flex items-center space-x-2'>
        <Skeleton className='h-4 w-16' />
        <Skeleton className='h-4 w-4' />
        <Skeleton className='h-4 w-32' />
      </div>

      {/* Header skeleton */}
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <Skeleton className='h-6 w-6' />
              <div>
                <Skeleton className='h-6 w-40' />
                <Skeleton className='h-4 w-64 mt-1' />
              </div>
            </div>

            <div className='flex items-center gap-2'>
              <Skeleton className='h-6 w-16' />
              <Skeleton className='h-8 w-24' />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className='p-4 bg-muted/30 rounded-lg'>
            <div className='flex items-center justify-between'>
              <div className='flex-1'>
                <Skeleton className='h-4 w-20 mb-2' />
                <Skeleton className='h-4 w-48' />
              </div>

              <div className='text-right'>
                <Skeleton className='h-4 w-24 mb-1' />
                <div className='flex items-center gap-2 justify-end'>
                  <Skeleton className='h-5 w-20' />
                  <Skeleton className='h-5 w-24' />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content skeleton */}
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        {/* Left column - Tasks list */}
        <div className='lg:col-span-1 space-y-4'>
          <Card>
            <CardHeader>
              <Skeleton className='h-6 w-32' />
            </CardHeader>
            <CardContent className='space-y-3'>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className='p-3 border rounded-lg space-y-2'>
                  <Skeleton className='h-4 w-full' />
                  <div className='flex items-center gap-2'>
                    <Skeleton className='h-4 w-16' />
                    <Skeleton className='h-4 w-20' />
                  </div>
                  <Skeleton className='h-3 w-24' />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right columns - Task detail */}
        <div className='lg:col-span-2 space-y-4'>
          <Card>
            <CardHeader>
              <div className='flex items-center justify-between'>
                <Skeleton className='h-6 w-48' />
                <div className='flex gap-2'>
                  <Skeleton className='h-8 w-20' />
                  <Skeleton className='h-8 w-20' />
                </div>
              </div>
            </CardHeader>

            <CardContent className='space-y-6'>
              {/* Resource info skeleton */}
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <div className='space-y-2'>
                  <Skeleton className='h-4 w-16' />
                  <Skeleton className='h-4 w-32' />
                </div>
                <div className='space-y-2'>
                  <Skeleton className='h-4 w-20' />
                  <Skeleton className='h-4 w-28' />
                </div>
              </div>

              {/* Fields skeleton */}
              <div className='space-y-4'>
                <Skeleton className='h-5 w-40' />
                <div className='grid gap-4'>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className='space-y-2'>
                      <Skeleton className='h-4 w-24' />
                      <Skeleton className='h-8 w-full' />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
