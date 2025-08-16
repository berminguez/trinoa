import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardHeader, CardContent } from '@/components/ui/card'

/**
 * Skeleton para estado de carga del detalle de proyecto de cliente
 *
 * Replica la estructura del ProjectDetailContent adaptado para contexto administrativo
 */
export function ClientProjectDetailSkeleton() {
  return (
    <div className='flex-1 space-y-6 p-4 pt-6'>
      {/* Breadcrumb skeleton */}
      <div className='flex items-center space-x-2'>
        <Skeleton className='h-4 w-16' />
        <Skeleton className='h-4 w-4' />
        <Skeleton className='h-4 w-20' />
        <Skeleton className='h-4 w-4' />
        <Skeleton className='h-4 w-24' />
        <Skeleton className='h-4 w-4' />
        <Skeleton className='h-4 w-28' />
      </div>

      {/* Header skeleton */}
      <div className='space-y-3'>
        <Skeleton className='h-8 w-64' />
        <Skeleton className='h-4 w-48' />
        <Skeleton className='h-4 w-52' />
      </div>

      {/* Content skeleton */}
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        {/* Main content skeleton */}
        <div className='lg:col-span-2 space-y-6'>
          <Card>
            <CardHeader>
              <Skeleton className='h-6 w-40' />
              <Skeleton className='h-4 w-80' />
            </CardHeader>
            <CardContent className='space-y-4'>
              <Skeleton className='h-4 w-full' />
              <Skeleton className='h-4 w-full' />
              <Skeleton className='h-4 w-3/4' />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Skeleton className='h-6 w-32' />
            </CardHeader>
            <CardContent>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className='space-y-2'>
                    <Skeleton className='h-32 w-full' />
                    <Skeleton className='h-4 w-3/4' />
                    <Skeleton className='h-3 w-1/2' />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar skeleton */}
        <div className='space-y-6'>
          <Card>
            <CardHeader>
              <Skeleton className='h-6 w-28' />
            </CardHeader>
            <CardContent className='space-y-3'>
              <div className='space-y-2'>
                <Skeleton className='h-3 w-16' />
                <Skeleton className='h-4 w-24' />
              </div>
              <div className='space-y-2'>
                <Skeleton className='h-3 w-20' />
                <Skeleton className='h-4 w-32' />
              </div>
              <div className='space-y-2'>
                <Skeleton className='h-3 w-18' />
                <Skeleton className='h-4 w-28' />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Skeleton className='h-6 w-24' />
            </CardHeader>
            <CardContent className='space-y-2'>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className='flex items-center space-x-2'>
                  <Skeleton className='h-8 w-8 rounded-full' />
                  <div className='space-y-1'>
                    <Skeleton className='h-3 w-20' />
                    <Skeleton className='h-2 w-16' />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
