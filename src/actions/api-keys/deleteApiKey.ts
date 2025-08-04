'use server'

import { revalidatePath } from 'next/cache'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getCurrentUser } from '@/actions/auth/getUser'
import { securityLogger } from '@/lib/utils/securityLogger'
import type { ApiKey } from '@/payload-types'
import type { DeleteApiKeyResult } from './types'

export async function deleteApiKeyAction(keyId: string): Promise<DeleteApiKeyResult> {
  try {
    // Verificar autenticación
    const user = await getCurrentUser()
    if (!user) {
      return {
        success: false,
        error: 'Usuario no autenticado',
      }
    }

    // Solo usuarios normales y admins pueden eliminar API Keys
    if (user.role !== 'user' && user.role !== 'admin') {
      return {
        success: false,
        error: 'No tienes permisos para eliminar API Keys',
      }
    }

    // Validar keyId
    if (!keyId || typeof keyId !== 'string') {
      return {
        success: false,
        error: 'ID de API Key inválido',
      }
    }

    // Obtener payload instance
    const payload = await getPayload({ config })

    // Verificar que la key existe y pertenece al usuario
    const existingKey = await payload.findByID({
      collection: 'api-keys' as any,
      id: keyId,
      depth: 1,
    })

    if (!existingKey) {
      return {
        success: false,
        error: 'API Key no encontrada',
      }
    }

    const apiKey = existingKey as ApiKey

    // Verificar ownership (a menos que sea admin)
    if (user.role !== 'admin') {
      // Para usuarios normales, verificar que la key les pertenece
      const keyUserId = typeof apiKey.user === 'object' ? apiKey.user.id : apiKey.user

      if (keyUserId !== user.id) {
        // Log de seguridad para acceso no autorizado
        securityLogger.logUnauthorizedAccess(
          user.id,
          user.email,
          `API Key ${keyId}`,
          'User attempted to delete API Key that does not belong to them',
        )

        return {
          success: false,
          error: 'No tienes permisos para eliminar esta API Key',
        }
      }
    }

    // Eliminar la API Key
    await payload.delete({
      collection: 'api-keys' as any,
      id: keyId,
    })

    // Log de seguridad para eliminación exitosa
    securityLogger.logApiKeyDeleted(user.id, user.email, user.role, keyId, apiKey.name)

    console.log('[DELETE_API_KEY] API Key deleted successfully:', {
      keyId: keyId,
      keyName: apiKey.name,
      userId: user.id,
    })

    // Revalidar rutas relacionadas
    revalidatePath('/api-keys')

    return {
      success: true,
    }
  } catch (error) {
    console.error('[DELETE_API_KEY] Error deleting API key:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      keyId,
    })

    // Manejar errores específicos
    if (error instanceof Error) {
      // Error de recurso no encontrado
      if (error.message.includes('not found') || error.message.includes('404')) {
        return {
          success: false,
          error: 'API Key no encontrada',
        }
      }

      // Error de permisos
      if (error.message.includes('permission') || error.message.includes('unauthorized')) {
        return {
          success: false,
          error: 'No tienes permisos para eliminar esta API Key',
        }
      }
    }

    return {
      success: false,
      error: 'Error interno del servidor. Intenta nuevamente.',
    }
  }
}
