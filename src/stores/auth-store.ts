import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@/payload-types'

// ============================================================================
// TIPOS DEL STORE DE AUTENTICACIÓN
// ============================================================================

export interface AuthUser {
  id: string
  name: string
  email: string
  role?: 'admin' | 'user' | 'api' | null
}

export interface AuthState {
  // Estado del usuario
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean

  // Gestión de sesiones
  sessionExpiry: number | null
  lastActivity: number
  isSessionExpired: boolean

  // Estados de UI
  isLoggingOut: boolean
  loginAttempts: number

  // Acciones
  setUser: (user: AuthUser | null) => void
  setLoading: (loading: boolean) => void
  setSessionExpiry: (expiry: number | null) => void
  updateLastActivity: () => void
  checkSessionExpiry: () => boolean
  setLoggingOut: (loggingOut: boolean) => void
  incrementLoginAttempts: () => void
  resetLoginAttempts: () => void
  clearAuth: () => void

  // Utilities
  getUserDisplayName: () => string
  hasRole: (role: 'admin' | 'user' | 'api') => boolean
}

// ============================================================================
// CONFIGURACIÓN DEL STORE
// ============================================================================

// Duración de sesión en milisegundos (1 hora)
const SESSION_DURATION = 60 * 60 * 1000

// Tiempo de inactividad antes de considerar sesión expirada (1 hora)
const INACTIVITY_THRESHOLD = 60 * 60 * 1000

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Estado inicial
      user: null,
      isAuthenticated: false,
      isLoading: false,
      sessionExpiry: null,
      lastActivity: Date.now(),
      isSessionExpired: false,
      isLoggingOut: false,
      loginAttempts: 0,

      // Establecer usuario y marcarlo como autenticado
      setUser: (user) => {
        set({
          user,
          isAuthenticated: !!user,
          isLoading: false,
          lastActivity: Date.now(),
          isSessionExpired: false,
          sessionExpiry: user ? Date.now() + SESSION_DURATION : null,
        })
      },

      // Establecer estado de carga
      setLoading: (loading) => set({ isLoading: loading }),

      // Establecer expiración de sesión
      setSessionExpiry: (expiry) => set({ sessionExpiry: expiry }),

      // Actualizar última actividad
      updateLastActivity: () => {
        const now = Date.now()
        set({
          lastActivity: now,
          // Extender sesión si está cerca de expirar
          sessionExpiry: get().sessionExpiry ? now + SESSION_DURATION : null,
        })
      },

      // Verificar si la sesión ha expirado
      checkSessionExpiry: () => {
        const { sessionExpiry, lastActivity } = get()
        const now = Date.now()

        if (!sessionExpiry) return false

        // Verificar expiración por tiempo de sesión o inactividad
        const isExpiredByTime = now > sessionExpiry
        const isExpiredByInactivity = now - lastActivity > INACTIVITY_THRESHOLD

        const isExpired = isExpiredByTime || isExpiredByInactivity

        if (isExpired) {
          set({ isSessionExpired: true })
        }

        return isExpired
      },

      // Estado de logout
      setLoggingOut: (loggingOut) => set({ isLoggingOut: loggingOut }),

      // Incrementar intentos de login
      incrementLoginAttempts: () => {
        const { loginAttempts } = get()
        set({ loginAttempts: loginAttempts + 1 })
      },

      // Resetear intentos de login
      resetLoginAttempts: () => set({ loginAttempts: 0 }),

      // Limpiar todo el estado de autenticación
      clearAuth: () => {
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          sessionExpiry: null,
          lastActivity: Date.now(),
          isSessionExpired: false,
          isLoggingOut: false,
          loginAttempts: 0,
        })
      },

      // Obtener nombre para mostrar
      getUserDisplayName: () => {
        const { user } = get()
        if (!user) return 'Usuario'
        return user.name || user.email || 'Usuario'
      },

      // Verificar si el usuario tiene un rol específico
      hasRole: (role) => {
        const { user } = get()
        return user?.role === role
      },
    }),
    {
      name: 'auth-storage',
      // Solo persistir ciertos campos por seguridad
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        sessionExpiry: state.sessionExpiry,
        lastActivity: state.lastActivity,
        loginAttempts: state.loginAttempts,
      }),
    },
  ),
)

// ============================================================================
// HOOKS Y UTILIDADES
// ============================================================================

/**
 * Hook para verificar autenticación (SIMPLIFICADO)
 */
export const useAuth = () => {
  const store = useAuthStore()

  // NO verificar expiración automáticamente para evitar loops
  // Solo retornar el estado actual del store
  return {
    ...store,
    isAuthenticated: store.isAuthenticated,
  }
}

/**
 * Hook solo para datos del usuario (SIMPLIFICADO)
 */
export const useUser = () => {
  const user = useAuthStore((state) => state.user)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const isLoading = useAuthStore((state) => state.isLoading)

  return {
    user,
    isAuthenticated: isAuthenticated, // Sin verificación automática de expiración
    isLoading,
  }
}

/**
 * Hook para acciones de autenticación
 */
export const useAuthActions = () => {
  const setUser = useAuthStore((state) => state.setUser)
  const setLoading = useAuthStore((state) => state.setLoading)
  const clearAuth = useAuthStore((state) => state.clearAuth)
  const updateLastActivity = useAuthStore((state) => state.updateLastActivity)
  const setLoggingOut = useAuthStore((state) => state.setLoggingOut)
  const incrementLoginAttempts = useAuthStore((state) => state.incrementLoginAttempts)
  const resetLoginAttempts = useAuthStore((state) => state.resetLoginAttempts)

  return {
    setUser,
    setLoading,
    clearAuth,
    updateLastActivity,
    setLoggingOut,
    incrementLoginAttempts,
    resetLoginAttempts,
  }
}

/**
 * Convertir User de PayloadCMS a AuthUser
 */
export function toAuthUser(user: User): AuthUser {
  return {
    id: user.id,
    name: user.name || user.email,
    email: user.email,
    role: user.role,
  }
}

// ============================================================================
// LISTENERS PARA ACTIVIDAD DEL USUARIO (SIMPLIFICADO)
// ============================================================================

// Solo ejecutar en el cliente y DE FORMA MÁS SIMPLE
if (typeof window !== 'undefined') {
  // Solo agregar listener de actividad básico sin redirecciones automáticas
  let activityTimeout: NodeJS.Timeout | null = null

  const handleUserActivity = () => {
    if (activityTimeout) {
      clearTimeout(activityTimeout)
    }

    activityTimeout = setTimeout(() => {
      const store = useAuthStore.getState()
      if (store.isAuthenticated) {
        store.updateLastActivity()
      }
    }, 5000) // Actualizar máximo cada 5 segundos (reducido la frecuencia)
  }

  // Solo escuchar clicks y keypresses básicos
  document.addEventListener('click', handleUserActivity, { passive: true })
  document.addEventListener('keypress', handleUserActivity, { passive: true })

  // ELIMINAMOS LA VERIFICACIÓN AUTOMÁTICA QUE CAUSABA LOOPS
  // Ya no verificamos automáticamente cada 30 segundos
}

export default useAuthStore
