'use server'

import { getPayload } from 'payload'
import config from '@/payload.config'
import { getCurrentUser } from '@/actions/auth/getUser'

interface ChangePasswordResponse {
  success: boolean
  message: string
}

/**
 * Server Action para cambiar contraseña del usuario autenticado
 *
 * Flujo recomendado por PayloadCMS:
 * 1. Obtener usuario autenticado desde la sesión
 * 2. Verificar contraseña antigua haciendo login
 * 3. Si es correcta, actualizar a la nueva contraseña
 */
export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<ChangePasswordResponse> {
  try {
    // Validaciones básicas
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

    // Paso 1: Obtener usuario autenticado usando la función del proyecto
    const user = await getCurrentUser()

    if (!user) {
      return {
        success: false,
        message: 'Debes iniciar sesión para cambiar tu contraseña',
      }
    }

    const payload = await getPayload({ config })

    // Paso 2: Verificar que la contraseña actual es correcta
    // Intentamos hacer login con el email y la contraseña actual
    try {
      await payload.login({
        collection: 'users',
        data: {
          email: user.email,
          password: currentPassword,
        },
      })
    } catch (error) {
      console.log('[CHANGE_PASSWORD] Contraseña actual incorrecta para usuario:', user.email)
      return {
        success: false,
        message: 'La contraseña actual es incorrecta',
      }
    }

    // Paso 3: Si la contraseña actual es correcta, actualizar a la nueva
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
