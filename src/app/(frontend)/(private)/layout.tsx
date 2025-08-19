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
        console.log('[PrivateLayout] 🔄 Initializing auth check...')
        console.log('[PrivateLayout] 📊 Current authState:', authState)
        console.log('[PrivateLayout] 👤 Current user in store:', user)
        console.log('[PrivateLayout] 🔐 Current isAuthenticated:', isAuthenticated)

        // Verificar autenticación con PayloadCMS
        const authStatus = await getAuthenticationStatus()

        console.log('[PrivateLayout] 📡 AuthStatus response:', {
          isAuthenticated: authStatus.isAuthenticated,
          isTokenExpired: authStatus.isTokenExpired,
          userExists: !!authStatus.user,
          userEmail: authStatus.user?.email,
          error: authStatus.error,
        })

        if (!isMounted) {
          console.log('[PrivateLayout] ⚠️ Component unmounted, aborting auth check')
          return
        }

        if (authStatus.isAuthenticated && authStatus.user) {
          // Usuario autenticado correctamente
          const userData = {
            id: authStatus.user.id,
            name: authStatus.user.name,
            email: authStatus.user.email,
            role: undefined, // TODO: Obtener role del authStatus
          }

          console.log('[PrivateLayout] ✅ Setting authenticated user:', userData)
          setUser(userData)
          console.log('[PrivateLayout] ✅ User authenticated successfully:', authStatus.user.email)
          setAuthState('authenticated')
        } else if (authStatus.isTokenExpired) {
          // Token expirado
          console.log('[PrivateLayout] ⏰ Token expired detected - starting logout process')
          console.log('[PrivateLayout] 🔄 AuthStatus:', authStatus)
          await handleTokenExpired()
        } else {
          // No autenticado
          console.log('[PrivateLayout] ❌ No valid authentication, redirecting to login')
          console.log('[PrivateLayout] 📄 AuthStatus details:', authStatus)
          setAuthState('unauthenticated')
          router.push('/login?reason=auth_required')
        }
      } catch (error) {
        console.error('[PrivateLayout] 💥 Auth error:', error)
        if (isMounted) {
          setAuthState('error')
          setTimeout(() => {
            console.log('[PrivateLayout] 🔄 Redirecting to login due to auth error')
            router.push('/login?reason=auth_error')
          }, 2000)
        }
      }
    }

    // Solo ejecutar si estamos inicializando
    if (authState === 'initializing') {
      console.log('[PrivateLayout] 🚀 Starting auth initialization...')
      initializeAuth()
    } else {
      console.log('[PrivateLayout] ⏭️ Skipping auth init, current state:', authState)
    }

    return () => {
      isMounted = false
    }
  }, [authState, router, setUser, clearAuth]) // Dependencias mínimas necesarias

  // Estados de carga y error basados en authState
  console.log(
    '[PrivateLayout] 🎨 Rendering with state:',
    authState,
    'user:',
    !!user,
    'isAuthenticated:',
    isAuthenticated,
  )

  if (authState === 'initializing') {
    console.log('[PrivateLayout] 🔄 Rendering initializing skeleton')
    return <PrivateLayoutSkeleton />
  }

  if (authState === 'expired') {
    console.log('[PrivateLayout] ⏰ Rendering expired session screen')
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
    console.log('[PrivateLayout] 💥 Rendering error screen')
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
    console.log(
      '[PrivateLayout] ⚠️ Not authenticated or no user, showing skeleton. State:',
      authState,
      'User exists:',
      !!user,
    )
    return <PrivateLayoutSkeleton />
  }

  // Usuario autenticado, renderizar contenido con sidebar
  console.log('[PrivateLayout] ✅ Rendering authenticated layout for user:', user.email)
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
