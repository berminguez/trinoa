import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardHeader, CardContent } from '@/components/ui/card'

/**
 * Skeleton para estado de carga del detalle de recurso de proyecto de cliente
 *
 * Replica la estructura del ResourceContent adaptado para contexto administrativo
 */
export function ClientResourceSkeleton() {
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
        <Skeleton className='h-4 w-4' />
        <Skeleton className='h-4 w-32' />
      </div>

      {/* Header skeleton */}
      <div className='space-y-3'>
        <Skeleton className='h-8 w-64' />
        <Skeleton className='h-4 w-48' />
        <Skeleton className='h-4 w-52' />
        <Skeleton className='h-4 w-56' />
      </div>

      {/* Content skeleton */}
      <div className='grid grid-cols-1 lg:grid-cols-4 gap-6'>
        {/* Main content skeleton */}
        <div className='lg:col-span-3 space-y-6'>
          {/* Resource viewer skeleton */}
          <Card>
            <CardHeader>
              <div className='flex items-center justify-between'>
                <Skeleton className='h-6 w-40' />
                <div className='flex space-x-2'>
                  <Skeleton className='h-8 w-20' />
                  <Skeleton className='h-8 w-24' />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Skeleton className='h-96 w-full' />
            </CardContent>
          </Card>

          {/* Analysis results skeleton */}
          <Card>
            <CardHeader>
              <Skeleton className='h-6 w-48' />
            </CardHeader>
            <CardContent className='space-y-4'>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className='flex items-start space-x-3'>
                  <Skeleton className='h-4 w-4 mt-1' />
                  <div className='space-y-1 flex-1'>
                    <Skeleton className='h-4 w-32' />
                    <Skeleton className='h-3 w-full' />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar skeleton */}
        <div className='space-y-6'>
          {/* Resource info skeleton */}
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
              <div className='space-y-2'>
                <Skeleton className='h-3 w-22' />
                <Skeleton className='h-4 w-20' />
              </div>
            </CardContent>
          </Card>

          {/* Processing status skeleton */}
          <Card>
            <CardHeader>
              <Skeleton className='h-6 w-32' />
            </CardHeader>
            <CardContent className='space-y-3'>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className='flex items-center space-x-2'>
                  <Skeleton className='h-4 w-4 rounded-full' />
                  <Skeleton className='h-4 w-28' />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Actions skeleton */}
          <Card>
            <CardHeader>
              <Skeleton className='h-6 w-24' />
            </CardHeader>
            <CardContent className='space-y-2'>
              <Skeleton className='h-8 w-full' />
              <Skeleton className='h-8 w-full' />
              <Skeleton className='h-8 w-full' />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
