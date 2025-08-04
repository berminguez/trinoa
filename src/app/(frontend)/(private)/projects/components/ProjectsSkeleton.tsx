import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export function ProjectsSkeleton() {
  return (
    <div className='flex-1 space-y-4 p-4 pt-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div className='space-y-1'>
          <Skeleton className='h-8 w-32' />
          <Skeleton className='h-4 w-64' />
        </div>
        <Skeleton className='h-10 w-32' />
      </div>

      {/* Sort dropdown */}
      <div className='flex justify-end'>
        <Skeleton className='h-10 w-48' />
      </div>

      {/* Grid de proyectos */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
        {/* Tarjeta "Create Project" */}
        <Card className='border-dashed'>
          <CardHeader>
            <Skeleton className='h-6 w-6 mx-auto' />
          </CardHeader>
          <CardContent className='text-center'>
            <Skeleton className='h-4 w-24 mx-auto' />
          </CardContent>
        </Card>

        {/* Tarjetas de proyectos */}
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className='animate-pulse'>
            <CardHeader className='p-0'>
              <Skeleton className='h-48 w-full rounded-t-lg' />
            </CardHeader>
            <CardContent className='p-4'>
              <Skeleton className='h-6 w-3/4 mb-2' />
              <div className='flex justify-between items-center'>
                <Skeleton className='h-4 w-16' />
                <Skeleton className='h-4 w-20' />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
