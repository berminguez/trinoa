import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export function ProjectDetailSkeleton() {
  return (
    <div className='flex-1 space-y-6 p-4 pt-6'>
      {/* Breadcrumb */}
      <div className='flex items-center space-x-2'>
        <Skeleton className='h-4 w-16' />
        <span>/</span>
        <Skeleton className='h-4 w-20' />
        <span>/</span>
        <Skeleton className='h-4 w-32' />
      </div>

      {/* Header */}
      <div className='space-y-4'>
        <div className='flex items-center justify-between'>
          <div className='space-y-2'>
            <Skeleton className='h-8 w-64' />
            <div className='flex items-center gap-2'>
              <Skeleton className='h-4 w-16' />
              <Skeleton className='h-6 w-24' />
              <Skeleton className='h-6 w-24' />
            </div>
          </div>
          <Skeleton className='h-10 w-32' />
        </div>

        {/* Toolbar */}
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <Skeleton className='h-10 w-32' />
            <Skeleton className='h-10 w-40' />
          </div>
          <Skeleton className='h-10 w-24' />
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <Skeleton className='h-6 w-20' />
            <Skeleton className='h-4 w-32' />
          </div>
        </CardHeader>
        <CardContent className='p-0'>
          {/* Table headers */}
          <div className='border-b px-6 py-3'>
            <div className='grid grid-cols-6 gap-4'>
              <Skeleton className='h-4 w-4' />
              <Skeleton className='h-4 w-16' />
              <Skeleton className='h-4 w-20' />
              <Skeleton className='h-4 w-16' />
              <Skeleton className='h-4 w-20' />
              <Skeleton className='h-4 w-16' />
            </div>
          </div>

          {/* Table rows */}
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className='border-b px-6 py-4'>
              <div className='grid grid-cols-6 gap-4 items-center'>
                <Skeleton className='h-4 w-4' />
                <Skeleton className='h-12 w-16' />
                <Skeleton className='h-4 w-24' />
                <Skeleton className='h-4 w-16' />
                <Skeleton className='h-4 w-20' />
                <Skeleton className='h-4 w-16' />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className='flex items-center justify-between'>
        <Skeleton className='h-4 w-32' />
        <div className='flex items-center gap-2'>
          <Skeleton className='h-8 w-8' />
          <Skeleton className='h-8 w-8' />
          <Skeleton className='h-8 w-8' />
          <Skeleton className='h-8 w-8' />
        </div>
      </div>
    </div>
  )
}
