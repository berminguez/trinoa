import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { IconKey } from '@tabler/icons-react'

export default function PageSkeleton() {
  return (
    <div className='flex flex-col gap-6 max-w-4xl mx-auto'>
      {/* Header Skeleton */}
      <div className='flex items-center gap-3'>
        <IconKey className='h-8 w-8 text-primary animate-pulse' />
        <div className='flex-1 space-y-2'>
          <div className='h-8 w-64 bg-gray-200 animate-pulse rounded' />
          <div className='h-4 w-96 bg-gray-200 animate-pulse rounded' />
        </div>
      </div>

      {/* Alert Skeleton */}
      <div className='h-16 bg-gray-100 animate-pulse rounded-lg' />

      {/* Card Skeleton */}
      <Card>
        <CardHeader>
          <div className='space-y-2'>
            <div className='h-6 w-48 bg-gray-200 animate-pulse rounded' />
            <div className='h-4 w-72 bg-gray-200 animate-pulse rounded' />
          </div>
        </CardHeader>
        <CardContent>
          <div className='space-y-6'>
            <div className='space-y-2'>
              <div className='h-4 w-48 bg-gray-200 animate-pulse rounded' />
              <div className='h-10 w-full bg-gray-200 animate-pulse rounded' />
            </div>
            <div className='h-10 w-32 bg-primary/20 animate-pulse rounded' />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
