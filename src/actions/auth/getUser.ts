'use server'

import { cookies } from 'next/headers'

import {
  createSuccessResult,
  createErrorResult,
  handlePayloadResponse,
  handleNetworkError,
  toLegacyFormat,
  SECURITY_MESSAGES,
  GetUserResponse,
  UserDisplayData,
  UserRole,
  revalidateAfterSessionExpired,
} from '@/lib/auth'

import type { User } from '@/payload-types'

interface GetUserResult {
  success: boolean
  data?: User
  message?: string
}

export async function getUserAction(): Promise<GetUserResult> {
  try {
    // Obtener cookies de autenticación
    const cookieStore = await cookies()
    const payloadToken = cookieStore.get('payload-token')

    // Si no hay token, el usuario no está autenticado
    if (!payloadToken) {
      const authError = createErrorResult('AUTHENTICATION_ERROR', 'Usuario no autenticado')
      return toLegacyFormat(authError)
    }

    // Llamada al endpoint /api/users/me de PayloadCMS
    const response = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/users/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `payload-token=${payloadToken.value}`,
      },
      credentials: 'include',
      cache: 'no-store',
    })

    const data: GetUserResponse = await response.json()

    console.log('data user me', data)

    // Manejar errores de respuesta usando el sistema centralizado
    const responseError = handlePayloadResponse(response, data)
    if (responseError) {
      // Para getUserAction, mantener mensajes específicos de sesión
      if (response.status === 401 || response.status === 403) {
        // Revalidar rutas cuando detectamos sesión expirada
        await revalidateAfterSessionExpired()

        const sessionError = createErrorResult('SESSION_EXPIRED', SECURITY_MESSAGES.SESSION_EXPIRED)
        return toLegacyFormat(sessionError)
      }
      return toLegacyFormat(responseError)
    }

    if (!data.user) {
      const dataError = createErrorResult(
        'SERVER_ERROR',
        'No se pudieron obtener los datos del usuario',
      )
      return toLegacyFormat(dataError)
    }

    // Retornar datos del usuario
    const successResult = createSuccessResult(data.user, 'Usuario obtenido correctamente')
    return toLegacyFormat(successResult)
  } catch (error) {
    console.error('Error en getUserAction:', error)
    const networkError = handleNetworkError(error)
    return toLegacyFormat(networkError)
  }
}

// Función utilitaria para obtener solo los datos esenciales del usuario
export async function getCurrentUser(): Promise<User | null> {
  try {
    const result = await getUserAction()

    if (result.success && result.data) {
      return result.data
    }

    return null
  } catch (error) {
    console.error('Error en getCurrentUser:', error)
    return null
  }
}

// Función para obtener datos específicos del usuario (nombre, email)
export async function getUserDisplayData(): Promise<UserDisplayData | null> {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return null
    }

    // Extraer datos esenciales para mostrar en UI
    return {
      id: user.id,
      name: user.name || user.email, // Fallback al email si no hay nombre
      email: user.email,
    }
  } catch (error) {
    console.error('Error en getUserDisplayData:', error)
    return null
  }
}

// Función para verificar si el usuario actual tiene un rol específico
export async function hasUserRole(roleSlug: UserRole): Promise<boolean> {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return false
    }

    // El usuario tiene un rol único (no array) según PayloadCMS
    return user.role === roleSlug
  } catch (error) {
    console.error('Error en hasUserRole:', error)
    return false
  }
}

// Función para verificar si el usuario está autenticado (similar a isUserLoggedIn pero optimizada)
export async function isAuthenticated(): Promise<boolean> {
  try {
    const result = await getUserAction()
    return result.success && !!result.data
  } catch (error) {
    console.error('Error en isAuthenticated:', error)
    return false
  }
}
