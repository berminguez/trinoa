'use client'

import { useEffect, useState } from 'react'
import type { User } from '@/payload-types'

/**
 * Hook para obtener información del usuario actual en el cliente
 *
 * Útil para mostrar/ocultar elementos de UI basado en el rol del usuario
 */
export function useUserRole() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    async function fetchUser() {
      try {
        const response = await fetch('/api/users/me', {
          credentials: 'include',
        })

        if (response.ok) {
          const userData = await response.json()
          setUser(userData.user)
          setIsAdmin(userData.user?.role === 'admin')
        } else {
          setUser(null)
          setIsAdmin(false)
        }
      } catch (error) {
        console.error('Error fetching user:', error)
        setUser(null)
        setIsAdmin(false)
      } finally {
        setIsLoading(false)
      }
    }

    fetchUser()
  }, [])

  return {
    user,
    isAdmin,
    isLoading,
    isAuthenticated: !!user,
  }
}
