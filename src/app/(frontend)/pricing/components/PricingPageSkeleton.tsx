import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default function PricingPageSkeleton() {
  return (
    <div className='container mx-auto px-4 py-8'>
      {/* Header */}
      <div className='text-center mb-12'>
        <Skeleton className='h-10 w-96 mx-auto mb-4' />
        <Skeleton className='h-6 w-[600px] mx-auto' />
      </div>

      {/* Plans Grid */}
      <div className='grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto'>
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={index} className='relative'>
            <CardHeader className='text-center'>
              <Skeleton className='h-8 w-32 mx-auto mb-2' />
              <div className='mb-4'>
                <Skeleton className='h-12 w-24 mx-auto mb-1' />
                <Skeleton className='h-4 w-20 mx-auto' />
              </div>
              <Skeleton className='h-5 w-48 mx-auto' />
            </CardHeader>
            <CardContent>
              <div className='space-y-3 mb-8'>
                {Array.from({ length: 4 }).map((_, featureIndex) => (
                  <div key={featureIndex} className='flex items-center gap-2'>
                    <Skeleton className='h-4 w-4 rounded-full' />
                    <Skeleton className='h-4 flex-1' />
                  </div>
                ))}
              </div>
              <Skeleton className='h-10 w-full' />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Current Plan Section */}
      <div className='mt-16 max-w-2xl mx-auto'>
        <Skeleton className='h-8 w-48 mx-auto mb-6' />
        <Card>
          <CardHeader>
            <div className='flex justify-between items-center'>
              <div>
                <Skeleton className='h-6 w-32 mb-2' />
                <Skeleton className='h-4 w-24' />
              </div>
              <Skeleton className='h-6 w-16' />
            </div>
          </CardHeader>
          <CardContent>
            <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className='text-center'>
                  <Skeleton className='h-4 w-20 mx-auto mb-2' />
                  <Skeleton className='h-8 w-16 mx-auto mb-1' />
                  <Skeleton className='h-3 w-24 mx-auto' />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
