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
    console.log('[getUserAction] 🔍 Starting user fetch...')

    // Obtener cookies de autenticación
    const cookieStore = await cookies()
    const payloadToken = cookieStore.get('payload-token')

    console.log('[getUserAction] 🍪 Token check:', {
      hasToken: !!payloadToken,
      tokenLength: payloadToken?.value.length || 0,
    })

    // Si no hay token, el usuario no está autenticado
    if (!payloadToken) {
      console.log('[getUserAction] ❌ No token found')
      const authError = createErrorResult('AUTHENTICATION_ERROR', 'Usuario no autenticado')
      return toLegacyFormat(authError)
    }

    // ALTERNATIVA: Probar también con getPayload directo
    try {
      console.log('[getUserAction] 🔧 Trying direct payload access...')
      const { getPayload } = await import('payload')
      const payload = await getPayload({ config: (await import('@/payload.config')).default })

      // Verificar si el JWT está expirado ANTES de intentar usarlo
      try {
        const jwtParts = payloadToken.value.split('.')
        if (jwtParts.length === 3) {
          const jwtPayload = JSON.parse(Buffer.from(jwtParts[1], 'base64').toString())
          const isExpired = jwtPayload.exp ? Date.now() / 1000 > jwtPayload.exp : false

          console.log('[getUserAction] 🔑 JWT payload decoded:', {
            hasId: !!jwtPayload.id,
            hasEmail: !!jwtPayload.email,
            exp: jwtPayload.exp,
            isExpired,
          })

          // Si el token está expirado, retornar error inmediatamente
          if (isExpired) {
            console.log('[getUserAction] ⏰ JWT token is expired, triggering session cleanup')
            await revalidateAfterSessionExpired()
            const sessionError = createErrorResult(
              'SESSION_EXPIRED',
              SECURITY_MESSAGES.SESSION_EXPIRED,
            )
            return toLegacyFormat(sessionError)
          }

          if (jwtPayload.id) {
            // Si el token es válido, buscar el usuario
            const user = await payload.findByID({
              collection: 'users',
              id: jwtPayload.id,
              depth: 2,
            })
            console.log('[getUserAction] 👤 Direct user fetch result:', user)
            console.log('[getUserAction] 👤 Direct user fetch result:', {
              found: !!user,
              userEmail: user?.email,
              userRole: user?.role,
            })

            if (user) {
              console.log('[getUserAction] ✅ Got user via direct payload access!')
              const successResult = createSuccessResult(
                user as User,
                'Usuario obtenido correctamente (directo)',
              )
              return toLegacyFormat(successResult)
            }
          }
        }
      } catch (jwtError) {
        console.log(
          '[getUserAction] ⚠️ JWT decode failed:',
          jwtError instanceof Error ? jwtError.message : String(jwtError),
        )
      }
    } catch (directError) {
      console.log(
        '[getUserAction] ⚠️ Direct payload access failed:',
        directError instanceof Error ? directError.message : String(directError),
      )
    }

    console.log('[getUserAction] 📡 Falling back to API call to /api/users/me...')

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

    console.log('[getUserAction] 📊 API Response:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
    })

    const data: GetUserResponse = await response.json()

    console.log('[getUserAction] 📄 Raw response data:', data)
    console.log('[getUserAction] 📄 Response data analysis:', {
      hasUser: !!data.user,
      userEmail: data.user?.email,
      userRole: data.user?.role,
      hasErrors: !!data.errors,
      dataKeys: Object.keys(data),
    })

    // Para getUserAction, manejar específicamente 401/403 como sesión expirada
    if (response.status === 401 || response.status === 403) {
      // Revalidar rutas cuando detectamos sesión expirada
      await revalidateAfterSessionExpired()

      const sessionError = createErrorResult('SESSION_EXPIRED', SECURITY_MESSAGES.SESSION_EXPIRED)
      return toLegacyFormat(sessionError)
    }

    // Manejar otros errores usando el sistema centralizado
    const responseError = handlePayloadResponse(response, data)
    if (responseError) {
      return toLegacyFormat(responseError)
    }

    if (!data.user) {
      console.log(
        '[getUserAction] ❌ No user in response data - API returned 200 but no user object',
      )
      console.log('[getUserAction] 🔍 This could mean:', [
        '1. Token is valid but user was deleted',
        '2. PayloadCMS configuration issue',
        '3. Token belongs to different collection',
        '4. JWT payload is corrupted',
      ])
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

// Resultado extendido para manejo de estados de autenticación
export interface AuthenticationStatus {
  isAuthenticated: boolean
  user?: UserDisplayData
  isTokenExpired: boolean
  error?: string
}

/**
 * Verifica el estado de autenticación del usuario incluyendo detección de tokens expirados
 *
 * Esta función permite al layout distinguir entre:
 * - Usuario no autenticado (nunca logueado)
 * - Token expirado (necesita logout automático)
 * - Usuario autenticado correctamente
 */
export async function getAuthenticationStatus(): Promise<AuthenticationStatus> {
  try {
    console.log('[getAuthenticationStatus] 🔍 Starting authentication check...')

    // Obtener el resultado completo con información de errores
    const result = await getUserAction()

    console.log('[getAuthenticationStatus] 📊 getUserAction result:', {
      success: result.success,
      hasData: !!result.data,
      message: result.message,
      userEmail: result.data?.email,
      userRole: result.data?.role,
    })

    // Si es exitoso, usuario autenticado
    if (result.success && result.data) {
      const authResult = {
        isAuthenticated: true,
        user: {
          id: result.data.id,
          name: result.data.name || result.data.email,
          email: result.data.email,
        },
        isTokenExpired: false,
      }
      console.log('[getAuthenticationStatus] ✅ Authentication successful:', authResult)
      return authResult
    }

    // Verificar si es específicamente un token expirado
    if (
      result.message &&
      (result.message.includes('expirado') || result.message === SECURITY_MESSAGES.SESSION_EXPIRED)
    ) {
      console.log(
        '[getAuthenticationStatus] ⏰ Token expired detected, triggering logout:',
        result.message,
      )
      return {
        isAuthenticated: false,
        isTokenExpired: true,
        error: result.message,
      }
    }

    // Usuario no autenticado (caso normal)
    console.log('[getAuthenticationStatus] ❌ User not authenticated:', result.message)
    return {
      isAuthenticated: false,
      isTokenExpired: false,
      error: result.message,
    }
  } catch (error) {
    console.error('[getAuthenticationStatus] 💥 Error:', error)
    return {
      isAuthenticated: false,
      isTokenExpired: false,
      error: 'Error de conexión',
    }
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

// Función helper específica para verificar si el usuario actual es administrador
export async function isAdminUser(): Promise<boolean> {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return false
    }

    // Verificar si el usuario tiene rol de administrador
    return user.role === 'admin'
  } catch (error) {
    console.error('Error en isAdminUser:', error)
    return false
  }
}

/**
 * Función para requerir acceso de administrador en server components
 *
 * Esta función verifica que el usuario esté autenticado Y tenga rol de administrador.
 * Si no cumple alguna condición, redirige automáticamente a la página apropiada.
 *
 * @returns Promise<User> - El usuario autenticado con rol admin
 * @throws Redirige automáticamente si no tiene permisos (no lanza excepciones)
 *
 * @example
 * // En un server component de página administrativa:
 * export default async function ClientsPage() {
 *   const adminUser = await requireAdminAccess()
 *
 *   // Si llegamos aquí, el usuario es admin autenticado
 *   // Continuar con la lógica de la página...
 * }
 */
export async function requireAdminAccess(): Promise<User> {
  const { redirect } = await import('next/navigation')
  const { createAdminLoginUrl, createAdminAccessDeniedUrl } = await import('@/lib/auth')

  try {
    // Verificar autenticación del usuario
    const user = await getCurrentUser()

    if (!user) {
      console.log('requireAdminAccess: Usuario no autenticado, redirigiendo a login')
      redirect(createAdminLoginUrl())
    }

    // Verificar si el usuario tiene rol de administrador
    if (user!.role !== 'admin') {
      console.log(
        `requireAdminAccess: Usuario ${user!.email} no es admin (rol: ${user!.role}), redirigiendo a dashboard`,
      )
      redirect(createAdminAccessDeniedUrl())
    }

    console.log(`requireAdminAccess: Acceso admin concedido para usuario ${user!.email}`)
    return user!
  } catch (error) {
    console.error('Error en requireAdminAccess:', error)
    // En caso de error, redirigir a login por seguridad
    redirect(createAdminLoginUrl())
    // TypeScript no sabe que redirect nunca retorna, por lo que agregamos esta línea
    throw new Error('Redirect should have occurred')
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
