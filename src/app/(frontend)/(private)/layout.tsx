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
  const [isInitializing, setIsInitializing] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [isHandlingExpiredToken, setIsHandlingExpiredToken] = useState(false)

  const router = useRouter()
  const { user, isAuthenticated, setUser } = useAuthStore()

  // SOLO UNA verificación al montar con manejo de tokens expirados
  useEffect(() => {
    async function initializeAuth() {
      try {
        console.log('[PrivateLayout] Initializing auth check...')

        // Si ya tenemos usuario autenticado, verificar si el token sigue válido
        if (user && isAuthenticated) {
          console.log('[PrivateLayout] User in store, verifying token validity:', user.email)

          // Verificar si el token sigue siendo válido
          const authStatus = await getAuthenticationStatus()

          if (authStatus.isAuthenticated) {
            console.log('[PrivateLayout] Token still valid for user:', user.email)
            setIsInitializing(false)
            return
          }

          if (authStatus.isTokenExpired) {
            console.log('[PrivateLayout] Token expired for user:', user.email, '- forcing logout')
            // Token expirado: limpiar sesión local y forzar logout
            await handleTokenExpired()
            return
          }

          // Otro tipo de error: tratar como no autenticado
          console.log('[PrivateLayout] Auth verification failed:', authStatus.error)
        }

        // Solo si NO tenemos usuario o la verificación falló, verificar con PayloadCMS
        console.log('[PrivateLayout] Checking authentication status with PayloadCMS...')
        const authStatus = await getAuthenticationStatus()

        if (authStatus.isAuthenticated && authStatus.user) {
          setUser({
            id: authStatus.user.id,
            name: authStatus.user.name,
            email: authStatus.user.email,
            role: undefined,
          })
          console.log('[PrivateLayout] User authenticated:', authStatus.user.email)
        } else if (authStatus.isTokenExpired) {
          console.log('[PrivateLayout] Token expired during check - forcing logout')
          await handleTokenExpired()
          return
        } else {
          console.log('[PrivateLayout] No valid authentication, redirecting to login')
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

    // Función para manejar tokens expirados
    async function handleTokenExpired() {
      try {
        console.log('[PrivateLayout] Handling token expiration...')
        setIsHandlingExpiredToken(true)

        // Limpiar estado local
        const { clearAuth } = useAuthStore.getState()
        clearAuth()

        // Hacer logout en el servidor (limpiar cookies)
        await logoutAction()

        console.log('[PrivateLayout] Logout completed, redirecting to login')
        router.push('/login?reason=session_expired')
      } catch (error) {
        console.error('[PrivateLayout] Error during token expiry handling:', error)
        // En caso de error, aún así redirigir al login
        router.push('/login?reason=auth_error')
      } finally {
        setIsHandlingExpiredToken(false)
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

  if (isHandlingExpiredToken) {
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
