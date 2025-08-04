'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import {
  AuthResult,
  createSuccessResult,
  createErrorResult,
  handlePayloadResponse,
  handleNetworkError,
  validateAuthFields,
  toLegacyFormat,
  SECURITY_MESSAGES,
  AUTH_ROUTES,
  LoginResponse,
  LoginCredentials,
  revalidateAfterLogin,
} from '@/lib/auth'

import type { User } from '@/payload-types'

interface LoginResult {
  success: boolean
  message: string
  data?: User
}

export async function loginAction(formData: FormData): Promise<LoginResult> {
  try {
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    // Validación de campos usando el sistema centralizado
    const validationError = validateAuthFields(email, password)
    if (validationError) {
      return toLegacyFormat(validationError)
    }

    // Preparar credenciales usando tipo de PayloadCMS
    const credentials: LoginCredentials = {
      email,
      password,
    }

    // Llamada al endpoint de login de PayloadCMS
    const response = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/users/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(credentials),
    })

    const data: LoginResponse = await response.json()

    // Manejar errores de respuesta usando el sistema centralizado
    const responseError = handlePayloadResponse(response, data)

    if (responseError) {
      // Para login, siempre usar mensaje genérico de seguridad
      return toLegacyFormat(
        createErrorResult('AUTHENTICATION_ERROR', SECURITY_MESSAGES.INVALID_CREDENTIALS),
      )
    }

    // Establecer la cookie manualmente para asegurar persistencia
    const setCookieHeader = response.headers.get('set-cookie')

    if (setCookieHeader) {
      try {
        const tokenMatch = setCookieHeader.match(/payload-token=([^;]+)/)
        if (tokenMatch) {
          const tokenValue = tokenMatch[1]
          const cookieStore = await cookies()
          cookieStore.set('payload-token', tokenValue, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            expires: new Date(Date.now() + 7 * 60 * 60 * 1000), // 7 horas
          })
        }
      } catch (error) {
        console.error('Error setting authentication cookie:', error)
      }
    }

    // Login exitoso - revalidar rutas para cache busting
    await revalidateAfterLogin()

    const successResult = createSuccessResult(data.user, 'Login exitoso')
    return toLegacyFormat(successResult)
  } catch (error) {
    console.error('Error en loginAction:', error)
    const networkError = handleNetworkError(error)
    return toLegacyFormat(networkError)
  }
}

export async function loginWithRedirect(formData: FormData, redirectUrl?: string): Promise<never> {
  const result = await loginAction(formData)

  if (result.success) {
    // Redirigir a URL específica o dashboard por defecto
    const isValidRedirect = redirectUrl ? isValidRedirectUrl(redirectUrl) : false
    const targetUrl = redirectUrl && isValidRedirect ? redirectUrl : AUTH_ROUTES.DASHBOARD
    redirect(targetUrl)
  } else {
    // Si hay error, redirigir al login con mensaje de error
    const searchParams = new URLSearchParams()
    searchParams.set('error', result.message)
    if (redirectUrl) {
      searchParams.set('redirect', redirectUrl)
    }
    redirect(`${AUTH_ROUTES.LOGIN}?${searchParams.toString()}`)
  }
}

// Validación de URL de redirección para prevenir open redirect attacks
function isValidRedirectUrl(url: string): boolean {
  try {
    // Solo permitir URLs relativas que empiecen con /
    if (!url.startsWith('/')) {
      return false
    }

    // No permitir // que podría ser interpretado como protocolo
    if (url.startsWith('//')) {
      return false
    }

    // No permitir caracteres peligrosos
    if (url.includes('\n') || url.includes('\r') || url.includes('\t')) {
      return false
    }

    return true
  } catch {
    return false
  }
}
