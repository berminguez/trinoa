import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

/**
 * Skeleton para la página de recurso pendiente con pantalla partida
 *
 * Replica la estructura de PendingTaskResourceContent mientras carga
 */
export function PendingTaskResourceSkeleton() {
  return (
    <div className='flex h-[calc(100vh-50px)] w-full min-w-0 max-w-full flex-col overflow-hidden'>
      {/* Navigation skeleton */}
      <div className='border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60'>
        <div className='p-4 space-y-4'>
          {/* Breadcrumbs skeleton */}
          <div className='flex items-center space-x-2'>
            <Skeleton className='h-4 w-16' />
            <Skeleton className='h-4 w-4' />
            <Skeleton className='h-4 w-32' />
            <Skeleton className='h-4 w-4' />
            <Skeleton className='h-4 w-48' />
          </div>

          {/* Resource info and navigation skeleton */}
          <div className='flex items-center justify-between gap-4'>
            <div className='flex-1 min-w-0'>
              <div className='flex items-center gap-3 mb-2'>
                <Skeleton className='h-6 w-64' />
                <Skeleton className='h-5 w-20' />
                <Skeleton className='h-5 w-24' />
              </div>

              <div className='flex items-center gap-4 text-sm'>
                <Skeleton className='h-4 w-32' />
                <Skeleton className='h-4 w-40' />
                <Skeleton className='h-4 w-24' />
              </div>
            </div>

            <div className='flex items-center gap-2'>
              <Skeleton className='h-8 w-20' />
              <div className='flex items-center border rounded-lg'>
                <Skeleton className='h-8 w-20 rounded-r-none' />
                <Skeleton className='h-8 w-16 rounded-none' />
                <Skeleton className='h-8 w-20 rounded-l-none' />
              </div>
            </div>
          </div>

          {/* Context links skeleton */}
          <div className='flex items-center gap-2'>
            <Skeleton className='h-4 w-16' />
            <Skeleton className='h-4 w-2' />
            <Skeleton className='h-4 w-20' />
          </div>
        </div>
      </div>

      {/* Split view skeleton */}
      <div className='flex min-w-0 max-w-full flex-1 overflow-hidden'>
        {/* Left panel - Document viewer skeleton */}
        <div className='flex-1 border-r'>
          <div className='h-full p-4'>
            <Card className='h-full'>
              <CardContent className='p-6 h-full flex items-center justify-center'>
                <div className='text-center space-y-4'>
                  <Skeleton className='h-12 w-12 rounded mx-auto' />
                  <Skeleton className='h-4 w-32 mx-auto' />
                  <div className='space-y-2'>
                    {Array.from({ length: 8 }).map((_, i) => (
                      <Skeleton key={i} className='h-4 w-full' />
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right panel - Form skeleton */}
        <div className='w-80 lg:w-96'>
          <div className='p-4 h-full overflow-auto'>
            {/* Title editor skeleton */}
            <div className='mb-6'>
              <Skeleton className='h-6 w-full mb-2' />
              <Skeleton className='h-3 w-48' />
            </div>

            {/* Form skeleton */}
            <div className='space-y-6'>
              {/* Basic fields */}
              <div className='space-y-4'>
                <div>
                  <Skeleton className='h-4 w-24 mb-2' />
                  <Skeleton className='h-8 w-full' />
                </div>
                <div>
                  <Skeleton className='h-4 w-16 mb-2' />
                  <Skeleton className='h-8 w-full' />
                </div>
                <div>
                  <Skeleton className='h-4 w-12 mb-2' />
                  <Skeleton className='h-8 w-full' />
                </div>
              </div>

              {/* Confidence section */}
              <Card>
                <CardHeader>
                  <Skeleton className='h-5 w-40' />
                </CardHeader>
                <CardContent>
                  <Skeleton className='h-8 w-full mb-3' />
                  <div className='space-y-2'>
                    <Skeleton className='h-3 w-full' />
                    <Skeleton className='h-3 w-3/4' />
                  </div>
                </CardContent>
              </Card>

              {/* Analyze fields skeleton */}
              <Card>
                <CardHeader>
                  <Skeleton className='h-5 w-32' />
                </CardHeader>
                <CardContent className='space-y-3'>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i}>
                      <Skeleton className='h-4 w-20 mb-2' />
                      <Skeleton className='h-8 w-full' />
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Action buttons skeleton */}
              <div className='flex gap-2'>
                <Skeleton className='h-8 w-20' />
                <Skeleton className='h-8 w-24' />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
