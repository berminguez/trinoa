import { Suspense } from 'react'

import { LoginForm } from '@/components/login-form'
import { Logo } from '@/components/logo'

function LoginFormWrapper() {
  return <LoginForm />
}

function LoginFormSkeleton() {
  return (
    <div className='flex w-full max-w-sm flex-col gap-6'>
      <div className='flex flex-col gap-2'>
        <div className='h-4 w-16 bg-muted-foreground/20 rounded animate-pulse' />
        <div className='h-10 bg-muted-foreground/10 rounded animate-pulse' />
      </div>
      <div className='flex flex-col gap-2'>
        <div className='h-4 w-20 bg-muted-foreground/20 rounded animate-pulse' />
        <div className='h-10 bg-muted-foreground/10 rounded animate-pulse' />
      </div>
      <div className='h-10 bg-primary/20 rounded animate-pulse' />
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className='bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10'>
      <div className='flex w-full max-w-sm flex-col gap-6'>
        <a href='#' className='flex items-center gap-2 self-center font-medium'>
          <Logo />
        </a>
        <Suspense fallback={<LoginFormSkeleton />}>
          <LoginFormWrapper />
        </Suspense>
      </div>
    </div>
  )
}
