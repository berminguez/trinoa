'use client'

export default function PageSkeleton() {
  return (
    <div className='p-4 space-y-4 animate-pulse'>
      <div className='h-8 w-48 bg-muted rounded' />
      <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
        <div className='h-32 bg-muted rounded' />
        <div className='h-32 bg-muted rounded' />
        <div className='h-32 bg-muted rounded' />
      </div>
      <div className='h-64 bg-muted rounded' />
    </div>
  )
}
