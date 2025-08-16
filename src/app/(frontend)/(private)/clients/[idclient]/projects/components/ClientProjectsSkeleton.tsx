import { Skeleton } from '@/components/ui/skeleton'

/**
 * Skeleton para página de proyectos de cliente
 *
 * Replica la estructura que tendrá ClientProjectsContent
 * cuando esté completamente implementado
 */
export function ClientProjectsSkeleton() {
  return (
    <div className='flex-1 space-y-6 p-4 pt-6'>
      {/* Header skeleton */}
      <div className='space-y-2'>
        <Skeleton className='h-8 w-80' /> {/* Título */}
        <Skeleton className='h-4 w-96' /> {/* Descripción */}
        <Skeleton className='h-4 w-64' /> {/* Breadcrumb */}
      </div>

      {/* Controles de búsqueda y filtros skeleton */}
      <div className='flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between'>
        <Skeleton className='h-10 w-80' />
        <Skeleton className='h-10 w-48' />
      </div>

      {/* Grid de proyectos skeleton */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
        {/* Botón crear proyecto */}
        <Skeleton className='h-32 border-2 border-dashed' />

        {/* Proyectos del cliente */}
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className='h-32' />
        ))}
      </div>

      {/* Paginación skeleton */}
      <div className='flex justify-center'>
        <Skeleton className='h-10 w-64' />
      </div>
    </div>
  )
}
