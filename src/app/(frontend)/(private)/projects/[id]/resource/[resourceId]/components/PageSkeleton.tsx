'use client'

export default function PageSkeleton() {
  return (
    <div className='flex h-[calc(100vh-120px)] w-full flex-col'>
      {/* Header sticky */}
      <div className='sticky top-0 z-10 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60'>
        <div className='flex items-center justify-between px-4 py-3'>
          <div className='h-6 w-48 animate-pulse rounded bg-muted' />
          <div className='flex items-center gap-2'>
            <div className='h-9 w-24 animate-pulse rounded bg-muted' />
            <div className='h-9 w-28 animate-pulse rounded bg-muted' />
          </div>
        </div>
      </div>

      {/* Split panes */}
      <div className='flex flex-1 gap-4 p-4'>
        <div className='h-full w-1/2 animate-pulse rounded-md bg-muted' />
        <div className='h-full w-1/2 animate-pulse rounded-md bg-muted' />
      </div>
    </div>
  )
}
