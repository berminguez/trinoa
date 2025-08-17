'use client'

import { IconAlertCircle } from '@tabler/icons-react'
import { useRouter } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'

import { getAuthenticationStatus } from '@/actions/auth/getUser'
import { logoutAction } from '@/actions/auth/logout'
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
  const [authState, setAuthState] = useState<
    'initializing' | 'authenticated' | 'unauthenticated' | 'error' | 'expired'
  >('initializing')

  const router = useRouter()
  const { user, isAuthenticated, setUser, clearAuth } = useAuthStore()

  // Función para manejar tokens expirados
  const handleTokenExpired = async () => {
    try {
      console.log('[PrivateLayout] Handling token expiration...')
      setAuthState('expired')

      // Limpiar estado local
      clearAuth()

      // Hacer logout en el servidor (limpiar cookies)
      await logoutAction()

      console.log('[PrivateLayout] Logout completed, redirecting to login')
      router.push('/login?reason=session_expired')
    } catch (error) {
      console.error('[PrivateLayout] Error during token expiry handling:', error)
      router.push('/login?reason=auth_error')
    }
  }

  // Verificación de autenticación unificada
  useEffect(() => {
    let isMounted = true

    const initializeAuth = async () => {
      try {
        console.log('[PrivateLayout] Initializing auth check...')

        // Verificar autenticación con PayloadCMS
        const authStatus = await getAuthenticationStatus()

        if (!isMounted) return

        if (authStatus.isAuthenticated && authStatus.user) {
          // Usuario autenticado correctamente
          setUser({
            id: authStatus.user.id,
            name: authStatus.user.name,
            email: authStatus.user.email,
            role: undefined,
          })
          console.log('[PrivateLayout] User authenticated:', authStatus.user.email)
          setAuthState('authenticated')
        } else if (authStatus.isTokenExpired) {
          // Token expirado
          console.log('[PrivateLayout] Token expired - handling logout')
          await handleTokenExpired()
        } else {
          // No autenticado
          console.log('[PrivateLayout] No valid authentication, redirecting to login')
          setAuthState('unauthenticated')
          router.push('/login?reason=auth_required')
        }
      } catch (error) {
        console.error('[PrivateLayout] Auth error:', error)
        if (isMounted) {
          setAuthState('error')
          setTimeout(() => {
            router.push('/login?reason=auth_error')
          }, 2000)
        }
      }
    }

    // Solo ejecutar si estamos inicializando
    if (authState === 'initializing') {
      initializeAuth()
    }

    return () => {
      isMounted = false
    }
  }, [authState, router, setUser, clearAuth]) // Dependencias mínimas necesarias

  // Estados de carga y error basados en authState
  if (authState === 'initializing') {
    return <PrivateLayoutSkeleton />
  }

  if (authState === 'expired') {
    return (
      <div className='flex min-h-screen items-center justify-center bg-gray-50'>
        <div className='text-center'>
          <div className='inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]' />
          <h2 className='text-lg font-semibold text-gray-900 mb-2 mt-4'>Sesión Expirada</h2>
          <p className='text-gray-600 mb-4 max-w-md'>
            Tu sesión ha expirado. Cerrando sesión automáticamente...
          </p>
        </div>
      </div>
    )
  }

  if (authState === 'error') {
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

  if (authState !== 'authenticated' || !user) {
    return <PrivateLayoutSkeleton />
  }

  // Usuario autenticado, renderizar contenido con sidebar
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className='flex min-w-0 flex-1 flex-col overflow-hidden'>
          <SiteHeader />
          <div className='min-w-0 flex-1 overflow-hidden'>{children}</div>
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
