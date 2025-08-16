'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { isAdminUser } from '@/actions/auth/getUser'

interface UseAdminAccessResult {
  isAdmin: boolean | null // null = loading, true = admin, false = not admin
  isLoading: boolean
}

/**
 * Hook para verificar permisos de administrador en componentes cliente
 *
 * Este hook debe ser usado en componentes que se ejecutan en el cliente
 * y necesitan verificar si el usuario actual tiene permisos de administrador.
 *
 * IMPORTANTE: Para server components, usar directamente requireAdminAccess() o AdminAccessGuard
 *
 * @returns {UseAdminAccessResult} Estado de verificación de permisos admin
 *
 * @example
 * function ClientAdminComponent() {
 *   const { isAdmin, isLoading } = useAdminAccess()
 *
 *   if (isLoading) return <div>Verificando permisos...</div>
 *   if (!isAdmin) return <div>Acceso denegado</div>
 *
 *   return <div>Contenido administrativo</div>
 * }
 */
export function useAdminAccess(): UseAdminAccessResult {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    let isMounted = true

    async function checkAdminAccess() {
      try {
        const hasAdminAccess = await isAdminUser()

        if (isMounted) {
          setIsAdmin(hasAdminAccess)

          // Si no es admin, redirigir (opcional - puede manejarse en el componente)
          if (!hasAdminAccess) {
            console.log('useAdminAccess: Usuario no es admin, redirigiendo...')
            router.push('/dashboard?error=access_denied&message=admin_required')
          }
        }
      } catch (error) {
        console.error('Error verificando acceso admin:', error)
        if (isMounted) {
          setIsAdmin(false)
          router.push('/login?reason=admin_auth_error')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    checkAdminAccess()

    return () => {
      isMounted = false
    }
  }, [router])

  return {
    isAdmin,
    isLoading,
  }
}
