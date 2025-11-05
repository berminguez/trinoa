import { Suspense } from 'react'
import { ResetPasswordForm } from './components/ResetPasswordForm'
import { Logo } from '@/components/logo'

function ResetPasswordFormSkeleton() {
  return (
    <div className='flex w-full max-w-md flex-col gap-6'>
      <div className='h-8 w-48 bg-muted-foreground/20 rounded animate-pulse mx-auto' />
      <div className='flex flex-col gap-4'>
        <div className='h-4 w-24 bg-muted-foreground/20 rounded animate-pulse' />
        <div className='h-10 bg-muted-foreground/10 rounded animate-pulse' />
      </div>
      <div className='flex flex-col gap-4'>
        <div className='h-4 w-32 bg-muted-foreground/20 rounded animate-pulse' />
        <div className='h-10 bg-muted-foreground/10 rounded animate-pulse' />
      </div>
      <div className='h-10 bg-primary/20 rounded animate-pulse' />
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className='bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10'>
      <div className='flex w-full max-w-md flex-col gap-6'>
        <a href='/' className='flex items-center gap-2 self-center font-medium'>
          <Logo />
        </a>
        <Suspense fallback={<ResetPasswordFormSkeleton />}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  )
}
