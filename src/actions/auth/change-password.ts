'use server'

import { getPayload } from 'payload'
import { cookies } from 'next/headers'
import config from '@/payload.config'

interface ChangePasswordResponse {
  success: boolean
  message: string
}

/**
 * Server Action para cambiar contraseña del usuario autenticado
 */
export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<ChangePasswordResponse> {
  try {
    if (!currentPassword || !newPassword) {
      return {
        success: false,
        message: 'Todos los campos son requeridos',
      }
    }

    if (newPassword.length < 8) {
      return {
        success: false,
        message: 'La nueva contraseña debe tener al menos 8 caracteres',
      }
    }

    if (currentPassword === newPassword) {
      return {
        success: false,
        message: 'La nueva contraseña debe ser diferente a la actual',
      }
    }

    const payload = await getPayload({ config })
    const cookieStore = await cookies()
    const token = cookieStore.get('payload-token')

    if (!token) {
      return {
        success: false,
        message: 'Debes iniciar sesión para cambiar tu contraseña',
      }
    }

    // Verificar el usuario actual
    const { user } = await payload.auth({ headers: { Authorization: `JWT ${token.value}` } })

    if (!user) {
      return {
        success: false,
        message: 'Usuario no encontrado',
      }
    }

    // Verificar la contraseña actual intentando hacer login
    try {
      await payload.login({
        collection: 'users',
        data: {
          email: user.email,
          password: currentPassword,
        },
      })
    } catch (error) {
      return {
        success: false,
        message: 'La contraseña actual es incorrecta',
      }
    }

    // Actualizar la contraseña
    await payload.update({
      collection: 'users',
      id: user.id,
      data: {
        password: newPassword,
      },
    })

    console.log('[CHANGE_PASSWORD] Contraseña actualizada exitosamente para usuario:', user.email)

    return {
      success: true,
      message: 'Tu contraseña ha sido actualizada exitosamente',
    }
  } catch (error) {
    console.error('[CHANGE_PASSWORD] Error:', error)
    return {
      success: false,
      message: 'Ocurrió un error al cambiar tu contraseña. Por favor, intenta nuevamente.',
    }
  }
}
