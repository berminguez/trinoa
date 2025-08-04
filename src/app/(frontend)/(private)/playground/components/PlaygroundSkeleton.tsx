// Skeleton component para el estado de carga del Playground
export default function PlaygroundSkeleton() {
  return (
    <div className='flex flex-col h-[calc(100vh-8rem)] max-w-4xl mx-auto'>
      {/* Header skeleton */}
      <div className='flex items-center justify-between mb-6'>
        <div className='flex items-center gap-3'>
          <div className='h-8 w-8 bg-gray-200 rounded-lg animate-pulse' />
          <div className='space-y-2'>
            <div className='h-6 w-32 bg-gray-200 rounded animate-pulse' />
            <div className='h-4 w-48 bg-gray-200 rounded animate-pulse' />
          </div>
        </div>
        <div className='h-8 w-24 bg-gray-200 rounded animate-pulse' />
      </div>

      {/* Chat area skeleton */}
      <div className='flex-1 bg-white rounded-lg border border-gray-200 flex flex-col'>
        {/* Messages area skeleton */}
        <div className='flex-1 p-4 space-y-4'>
          {/* User message skeleton */}
          <div className='flex justify-end'>
            <div className='max-w-[70%] space-y-2'>
              <div className='h-4 w-20 bg-gray-200 rounded animate-pulse ml-auto' />
              <div className='bg-blue-50 p-3 rounded-lg space-y-2'>
                <div className='h-4 w-full bg-gray-200 rounded animate-pulse' />
                <div className='h-4 w-3/4 bg-gray-200 rounded animate-pulse' />
              </div>
            </div>
          </div>

          {/* Assistant message skeleton */}
          <div className='flex justify-start'>
            <div className='max-w-[70%] space-y-2'>
              <div className='h-4 w-24 bg-gray-200 rounded animate-pulse' />
              <div className='bg-gray-50 p-3 rounded-lg space-y-2'>
                <div className='h-4 w-full bg-gray-200 rounded animate-pulse' />
                <div className='h-4 w-5/6 bg-gray-200 rounded animate-pulse' />
                <div className='h-4 w-4/5 bg-gray-200 rounded animate-pulse' />
              </div>
            </div>
          </div>

          {/* Another user message skeleton */}
          <div className='flex justify-end'>
            <div className='max-w-[70%] space-y-2'>
              <div className='h-4 w-20 bg-gray-200 rounded animate-pulse ml-auto' />
              <div className='bg-blue-50 p-3 rounded-lg space-y-2'>
                <div className='h-4 w-4/5 bg-gray-200 rounded animate-pulse' />
              </div>
            </div>
          </div>
        </div>

        {/* Input area skeleton */}
        <div className='border-t border-gray-200 p-4'>
          <div className='flex gap-3'>
            <div className='flex-1 h-10 bg-gray-200 rounded-lg animate-pulse' />
            <div className='h-10 w-10 bg-gray-200 rounded-lg animate-pulse' />
          </div>
        </div>
      </div>
    </div>
  )
}
