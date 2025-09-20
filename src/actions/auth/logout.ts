'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import {
  createSuccessResult,
  createErrorResult,
  handlePayloadResponse,
  handleNetworkError,
  toLegacyFormat,
  AUTH_ROUTES,
  PAYLOAD_COOKIES,
  LogoutResponse,
  revalidateAfterLogout,
} from '@/lib/auth'

interface LogoutResult {
  success: boolean
  message: string
}

export async function logoutAction(): Promise<LogoutResult> {
  try {
    // Obtener cookies para enviarlas en la request de logout
    const cookieStore = await cookies()
    const payloadToken = cookieStore.get('payload-token')

    // Llamada al endpoint de logout de PayloadCMS
    const response = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/users/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Incluir cookies de autenticación si existen
        ...(payloadToken && { Cookie: `payload-token=${payloadToken.value}` }),
      },
    })

    const data: LogoutResponse = await response.json()

    // Limpiar cookies locales independientemente de la respuesta del servidor
    // Esto asegura que el logout funcione incluso si hay problemas de red
    await clearAuthCookies()

    // Revalidar rutas para cache busting usando estrategia centralizada
    await revalidateAfterLogout()

    // Para logout, siempre consideramos exitoso si limpiamos localmente
    // Esto garantiza que el usuario siempre pueda cerrar sesión
    const responseError = handlePayloadResponse(response, data)
    if (responseError) {
      console.warn('Logout response not OK, but clearing local session anyway:', responseError)
    }

    const successResult = createSuccessResult(undefined, 'Sesión cerrada correctamente')
    return toLegacyFormat(successResult)
  } catch (error) {
    console.error('Error en logoutAction:', error)

    // Incluso si hay error, limpiamos las cookies locales
    await clearAuthCookies()
    await revalidateAfterLogout()

    // Para logout, siempre retornar éxito después de limpiar localmente
    const successResult = createSuccessResult(undefined, 'Sesión cerrada correctamente')
    return toLegacyFormat(successResult)
  }
}

export async function logoutWithRedirect(): Promise<void> {
  const result = await logoutAction()

  if (result.success) {
    // Redirigir al login después del logout exitoso
    redirect(AUTH_ROUTES.LOGIN)
  } else {
    // Si hay algún error inesperado, aún redirigir al login
    // pero con un mensaje de advertencia
    const searchParams = new URLSearchParams()
    searchParams.set('warning', 'La sesión ha sido cerrada localmente')
    redirect(`${AUTH_ROUTES.LOGIN}?${searchParams.toString()}`)
  }
}

// Función para limpiar todas las cookies de autenticación
async function clearAuthCookies(): Promise<void> {
  try {
    const cookieStore = await cookies()

    // Lista de cookies relacionadas con PayloadCMS que necesitamos limpiar
    const authCookieNames = PAYLOAD_COOKIES

    authCookieNames.forEach((cookieName) => {
      try {
        const cookie = cookieStore.get(cookieName)
        if (cookie) {
          // Eliminar cookie estableciendo fecha de expiración en el pasado
          cookieStore.set(cookieName, '', {
            expires: new Date(0),
            path: '/',
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
          })
        }
      } catch (error) {
        console.warn(`No se pudo limpiar cookie ${cookieName}:`, error)
      }
    })
  } catch (error) {
    console.warn('Error al limpiar cookies de autenticación:', error)
  }
}

// Función utilitaria para verificar si el usuario está logueado
export async function isUserLoggedIn(): Promise<boolean> {
  try {
    const cookieStore = await cookies()
    const payloadToken = cookieStore.get('payload-token')

    if (!payloadToken) {
      return false
    }

    // Verificar si el token es válido haciendo una request a /api/users/me
    const response = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/users/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `payload-token=${payloadToken.value}`,
      },
    })

    return response.ok
  } catch (error) {
    console.error('Error verificando estado de login:', error)
    return false
  }
}
