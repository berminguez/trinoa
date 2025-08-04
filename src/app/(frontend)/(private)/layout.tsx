'use client'

import { IconAlertCircle } from '@tabler/icons-react'
import { useRouter } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'

import { getUserDisplayData } from '@/actions/auth/getUser'
import { AppSidebar } from '@/components/app-sidebar'
import { SiteHeader } from '@/components/site-header'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { Toaster } from '@/components/ui/sonner'
import { useAuthStore } from '@/stores/auth-store'

interface PrivateLayoutProps {
  children: React.ReactNode
}

// Skeleton compartido para páginas privadas
function PrivateLayoutSkeleton() {
  return (
    <div className='flex min-h-screen items-center justify-center bg-gray-50'>
      <div className='text-center'>
        <div className='inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]' />
        <p className='mt-4 text-sm text-gray-600'>Cargando...</p>
      </div>
    </div>
  )
}

// Layout protegido con autenticación SIMPLIFICADO
function ProtectedContent({ children }: { children: React.ReactNode }) {
  const [isInitializing, setIsInitializing] = useState(true)
  const [hasError, setHasError] = useState(false)

  const router = useRouter()
  const { user, isAuthenticated, setUser } = useAuthStore()

  // SOLO UNA verificación al montar, SIN loops
  useEffect(() => {
    async function initializeAuth() {
      try {
        console.log('[PrivateLayout] Initializing auth check...')

        // Si ya tenemos usuario autenticado, listo
        if (user && isAuthenticated) {
          console.log('[PrivateLayout] User already authenticated:', user.email)
          setIsInitializing(false)
          return
        }

        // Solo si NO tenemos usuario, verificar con PayloadCMS
        console.log('[PrivateLayout] No user in store, checking with PayloadCMS...')
        const userData = await getUserDisplayData()

        if (userData) {
          setUser({
            id: userData.id,
            name: userData.name,
            email: userData.email,
            role: undefined,
          })
          console.log('[PrivateLayout] User authenticated:', userData.email)
        } else {
          console.log('[PrivateLayout] No user found, redirecting to login')
          router.push('/login?reason=auth_required')
          return
        }
      } catch (error) {
        console.error('[PrivateLayout] Auth error:', error)
        setHasError(true)
        setTimeout(() => {
          router.push('/login?reason=auth_error')
        }, 2000)
      } finally {
        setIsInitializing(false)
      }
    }

    // Solo ejecutar si necesitamos inicializar
    if (isInitializing) {
      initializeAuth()
    }
  }, [isAuthenticated, isInitializing, router, setUser, user]) // Dependencias necesarias

  // Estados de carga y error
  if (isInitializing) {
    return <PrivateLayoutSkeleton />
  }

  if (hasError) {
    return (
      <div className='flex min-h-screen items-center justify-center bg-gray-50'>
        <div className='text-center'>
          <div className='flex justify-center mb-4'>
            <IconAlertCircle className='h-12 w-12 text-red-500' />
          </div>
          <h2 className='text-lg font-semibold text-gray-900 mb-2'>Error de Autenticación</h2>
          <p className='text-gray-600 mb-4 max-w-md'>
            Hubo un problema al verificar tu sesión. Serás redirigido al login.
          </p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return <PrivateLayoutSkeleton />
  }

  // Usuario autenticado, renderizar contenido con sidebar
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className='flex flex-1 flex-col'>
          <SiteHeader />
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default function PrivateLayout({ children }: PrivateLayoutProps) {
  return (
    <>
      <Suspense fallback={<PrivateLayoutSkeleton />}>
        <ProtectedContent>{children}</ProtectedContent>
      </Suspense>

      {/* Toast notifications */}
      <Toaster />
    </>
  )
}
