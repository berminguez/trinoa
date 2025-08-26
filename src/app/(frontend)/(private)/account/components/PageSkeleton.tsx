import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * Skeleton de carga para la página de cuenta
 */
export function PageSkeleton() {
  return (
    <div className='container mx-auto p-6 max-w-4xl'>
      {/* Header skeleton */}
      <div className='mb-8'>
        <Skeleton className='h-8 w-48 mb-2' />
        <Skeleton className='h-4 w-96' />
      </div>

      {/* Perfil card skeleton */}
      <Card className='mb-6'>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <div className='flex items-center space-x-4'>
              <Skeleton className='h-16 w-16 rounded-full' />
              <div className='space-y-2'>
                <Skeleton className='h-6 w-32' />
                <Skeleton className='h-4 w-48' />
              </div>
            </div>
            <Skeleton className='h-10 w-24' />
          </div>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div className='space-y-2'>
              <Skeleton className='h-4 w-16' />
              <Skeleton className='h-6 w-full' />
            </div>
            <div className='space-y-2'>
              <Skeleton className='h-4 w-16' />
              <Skeleton className='h-6 w-full' />
            </div>
            <div className='space-y-2'>
              <Skeleton className='h-4 w-16' />
              <Skeleton className='h-6 w-full' />
            </div>
            <div className='space-y-2'>
              <Skeleton className='h-4 w-16' />
              <Skeleton className='h-6 w-full' />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuración card skeleton */}
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <div className='space-y-2'>
              <Skeleton className='h-6 w-32' />
              <Skeleton className='h-4 w-64' />
            </div>
          </div>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='space-y-3'>
            <Skeleton className='h-4 w-24' />
            <Skeleton className='h-10 w-full' />
          </div>
          <div className='space-y-3'>
            <Skeleton className='h-4 w-24' />
            <Skeleton className='h-10 w-full' />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
