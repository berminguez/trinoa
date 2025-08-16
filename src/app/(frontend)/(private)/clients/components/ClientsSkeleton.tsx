import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardHeader, CardContent } from '@/components/ui/card'

/**
 * Skeleton para estado de carga de la página de clientes
 *
 * Replica la estructura del ClientsGrid y ClientGridItem
 * para mantener consistencia visual durante la carga
 */
export function ClientsSkeleton() {
  return (
    <div className='space-y-4'>
      {/* Skeleton para controles de búsqueda */}
      <div className='flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between'>
        <Skeleton className='h-10 w-80' /> {/* Barra de búsqueda */}
        <Skeleton className='h-10 w-48' /> {/* Selector de ordenamiento */}
      </div>

      {/* Skeleton para grid de clientes */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
        {Array.from({ length: 6 }).map((_, index) => (
          <ClientGridItemSkeleton key={index} />
        ))}
      </div>

      {/* Skeleton para paginación */}
      <div className='flex justify-center'>
        <Skeleton className='h-10 w-64' />
      </div>
    </div>
  )
}

/**
 * Skeleton para item individual de cliente
 */
function ClientGridItemSkeleton() {
  return (
    <Card className='h-full'>
      <CardHeader className='pb-3'>
        <div className='flex items-start justify-between'>
          <div className='flex items-center space-x-3'>
            {/* Avatar skeleton */}
            <Skeleton className='h-10 w-10 rounded-full' />
            <div className='space-y-2'>
              {/* Nombre */}
              <Skeleton className='h-4 w-24' />
              {/* Email */}
              <Skeleton className='h-3 w-32' />
            </div>
          </div>
          {/* Badge skeleton */}
          <Skeleton className='h-5 w-12 rounded-full' />
        </div>
      </CardHeader>

      <CardContent className='space-y-3'>
        {/* Estadísticas skeleton */}
        <div className='flex items-center space-x-2'>
          <Skeleton className='h-4 w-4' />
          <Skeleton className='h-4 w-20' />
        </div>

        <div className='flex items-center space-x-2'>
          <Skeleton className='h-4 w-4' />
          <Skeleton className='h-4 w-28' />
        </div>

        {/* Última actividad skeleton */}
        <Skeleton className='h-3 w-24' />
      </CardContent>
    </Card>
  )
}
