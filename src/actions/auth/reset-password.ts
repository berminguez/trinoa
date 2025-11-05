'use server'

import { getPayload } from 'payload'
import config from '@/payload.config'

interface ResetPasswordResponse {
  success: boolean
  message: string
}

/**
 * Server Action para resetear contraseña usando el token
 */
export async function resetPassword(
  token: string,
  newPassword: string,
): Promise<ResetPasswordResponse> {
  try {
    if (!token) {
      return {
        success: false,
        message: 'Token inválido o expirado',
      }
    }

    if (!newPassword || newPassword.length < 8) {
      return {
        success: false,
        message: 'La contraseña debe tener al menos 8 caracteres',
      }
    }

    const payload = await getPayload({ config })

    // Resetear la contraseña usando la API de PayloadCMS
    await payload.resetPassword({
      collection: 'users',
      data: {
        token,
        password: newPassword,
      },
    })

    console.log('[RESET_PASSWORD] Contraseña actualizada exitosamente')

    return {
      success: true,
      message: 'Tu contraseña ha sido actualizada exitosamente. Ya puedes iniciar sesión.',
    }
  } catch (error) {
    console.error('[RESET_PASSWORD] Error:', error)

    // Manejar error de token inválido/expirado
    const errorMessage =
      error instanceof Error && error.message.includes('token')
        ? 'El enlace de recuperación ha expirado o es inválido. Por favor, solicita uno nuevo.'
        : 'Ocurrió un error al actualizar tu contraseña. Por favor, intenta nuevamente.'

    return {
      success: false,
      message: errorMessage,
    }
  }
}
