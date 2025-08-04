import { Skeleton } from '@/components/ui/skeleton'

export default function DashboardSkeleton() {
  return (
    <div className='flex min-h-screen bg-gray-50'>
      {/* Sidebar skeleton */}
      <div className='hidden lg:flex lg:w-72 lg:flex-col'>
        <div className='flex h-16 shrink-0 items-center border-b border-gray-200 bg-white px-4'>
          <Skeleton className='h-8 w-32' />
        </div>
        <div className='flex flex-1 flex-col overflow-y-auto bg-white'>
          <nav className='flex flex-1 flex-col divide-y divide-gray-200 px-4 py-4'>
            <div className='space-y-2'>
              {/* Navigation items skeleton */}
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className='flex items-center space-x-3 py-2'>
                  <Skeleton className='h-5 w-5' />
                  <Skeleton className='h-4 w-24' />
                </div>
              ))}
            </div>

            {/* User section skeleton */}
            <div className='pt-4'>
              <div className='flex items-center space-x-3 py-2'>
                <Skeleton className='h-8 w-8 rounded-full' />
                <div className='space-y-1'>
                  <Skeleton className='h-4 w-20' />
                  <Skeleton className='h-3 w-28' />
                </div>
              </div>
            </div>
          </nav>
        </div>
      </div>

      {/* Main content skeleton */}
      <div className='flex flex-1 flex-col'>
        {/* Header skeleton */}
        <header className='flex h-16 shrink-0 items-center border-b border-gray-200 bg-white px-4 lg:px-6'>
          <div className='flex flex-1 items-center justify-between'>
            <Skeleton className='h-6 w-32' />
            <div className='flex items-center space-x-4'>
              <Skeleton className='h-8 w-8 rounded-full' />
              <Skeleton className='h-8 w-8 rounded-full' />
            </div>
          </div>
        </header>

        {/* Main content area skeleton */}
        <main className='flex-1 overflow-y-auto bg-gray-50 p-4 lg:p-6'>
          <div className='mx-auto max-w-7xl space-y-6'>
            {/* Page title skeleton */}
            <div className='space-y-2'>
              <Skeleton className='h-8 w-48' />
              <Skeleton className='h-4 w-72' />
            </div>

            {/* Cards grid skeleton */}
            <div className='grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4'>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className='bg-white p-6 rounded-lg border shadow-sm'>
                  <div className='space-y-3'>
                    <div className='flex items-center justify-between'>
                      <Skeleton className='h-4 w-20' />
                      <Skeleton className='h-4 w-4' />
                    </div>
                    <Skeleton className='h-8 w-16' />
                    <Skeleton className='h-3 w-24' />
                  </div>
                </div>
              ))}
            </div>

            {/* Chart skeleton */}
            <div className='bg-white p-6 rounded-lg border shadow-sm'>
              <div className='space-y-4'>
                <div className='flex items-center justify-between'>
                  <Skeleton className='h-6 w-32' />
                  <Skeleton className='h-8 w-24' />
                </div>
                <Skeleton className='h-64 w-full' />
              </div>
            </div>

            {/* Table skeleton */}
            <div className='bg-white rounded-lg border shadow-sm'>
              <div className='p-6 border-b'>
                <div className='flex items-center justify-between'>
                  <Skeleton className='h-6 w-28' />
                  <Skeleton className='h-8 w-32' />
                </div>
              </div>
              <div className='divide-y'>
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className='p-4'>
                    <div className='flex items-center space-x-4'>
                      <Skeleton className='h-4 w-4' />
                      <Skeleton className='h-4 w-24' />
                      <Skeleton className='h-4 w-32' />
                      <Skeleton className='h-4 w-20' />
                      <div className='flex-1' />
                      <Skeleton className='h-4 w-16' />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
