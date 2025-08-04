'use client'

import { IconAlertCircle } from '@tabler/icons-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { getUserDisplayData } from '@/actions/auth/getUser'
import { useAuthStore, useAuth, useAuthActions } from '@/stores/auth-store'

import DashboardSkeleton from './DashboardSkeleton'

interface ProtectedDashboardLayoutProps {
  children: React.ReactNode
}

export default function ProtectedDashboardLayout({ children }: ProtectedDashboardLayoutProps) {
  const [isInitializing, setIsInitializing] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const router = useRouter()
  const { isAuthenticated, user, isLoading, isSessionExpired } = useAuth()
  const { setUser, setLoading, clearAuth, updateLastActivity } = useAuthActions()

  // Verificar autenticación y sincronizar datos del usuario
  useEffect(() => {
    async function initializeAuth() {
      try {
        setIsInitializing(true)
        setHasError(false)
        setLoading(true)

        // Si la sesión ha expirado, limpiar y redirigir
        if (isSessionExpired) {
          console.log('[ProtectedLayout] Session expired, redirecting to login')
          clearAuth()
          toast.error('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.')
          router.push('/login?reason=session_expired')
          return
        }

        // Verificar si ya tenemos un usuario en el store
        if (user && isAuthenticated) {
          console.log('[ProtectedLayout] User already authenticated:', user.email)
          updateLastActivity()
          setIsInitializing(false)
          setLoading(false)
          return
        }

        // Intentar obtener datos del usuario desde PayloadCMS
        console.log('[ProtectedLayout] Fetching user data from PayloadCMS')
        const userData = await getUserDisplayData()

        if (userData) {
          // Sincronizar datos con el store
          const authUser = {
            id: userData.id,
            name: userData.name,
            email: userData.email,
            role: undefined, // getUserDisplayData no incluye role
          }

          setUser(authUser)
          updateLastActivity()

          console.log('[ProtectedLayout] User authenticated successfully:', userData.email)
        } else {
          // Usuario no autenticado, redirigir al login
          console.log('[ProtectedLayout] User not authenticated, redirecting to login')
          clearAuth()
          router.push('/login?reason=auth_required&redirect=/dashboard')
          return
        }
      } catch (error) {
        console.error('[ProtectedLayout] Error during auth initialization:', error)
        setHasError(true)
        setErrorMessage('Error al verificar la autenticación. Por favor, intenta nuevamente.')

        // En caso de error, redirigir al login después de un tiempo
        setTimeout(() => {
          clearAuth()
          router.push('/login?reason=auth_error')
        }, 3000)
      } finally {
        setIsInitializing(false)
        setLoading(false)
      }
    }

    initializeAuth()
  }, [
    clearAuth,
    isAuthenticated,
    isSessionExpired,
    router,
    setLoading,
    setUser,
    updateLastActivity,
    user,
  ]) // Dependencias necesarias

  // Verificar periódicamente la validez de la sesión
  useEffect(() => {
    if (!isAuthenticated || isInitializing) return

    const interval = setInterval(() => {
      const store = useAuthStore.getState()
      const isExpired = store.checkSessionExpiry()

      if (isExpired) {
        console.log('[ProtectedLayout] Session expired during use')
        clearAuth()
        toast.warning('Tu sesión ha expirado')
        router.push('/login?reason=session_expired')
      }
    }, 60000) // Verificar cada minuto

    return () => clearInterval(interval)
  }, [isAuthenticated, isInitializing, clearAuth, router])

  // Actualizar actividad en interacciones del usuario
  useEffect(() => {
    if (!isAuthenticated) return

    const handleUserInteraction = () => {
      updateLastActivity()
    }

    // Eventos que indican actividad del usuario
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart']

    events.forEach((event) => {
      document.addEventListener(event, handleUserInteraction, { passive: true })
    })

    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, handleUserInteraction)
      })
    }
  }, [isAuthenticated, updateLastActivity])

  // Estados de carga y error
  if (isInitializing || isLoading) {
    return <DashboardSkeleton />
  }

  if (hasError) {
    return (
      <div className='flex min-h-screen items-center justify-center bg-gray-50'>
        <div className='text-center'>
          <div className='flex justify-center mb-4'>
            <IconAlertCircle className='h-12 w-12 text-red-500' />
          </div>
          <h2 className='text-lg font-semibold text-gray-900 mb-2'>Error de Autenticación</h2>
          <p className='text-gray-600 mb-4 max-w-md'>{errorMessage}</p>
          <p className='text-sm text-gray-500'>Serás redirigido al login en unos momentos...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return <DashboardSkeleton />
  }

  // Usuario autenticado, renderizar contenido
  return <>{children}</>
}
