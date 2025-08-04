'use server'

import { getPayload } from 'payload'
import config from '@payload-config'
import { getCurrentUser } from '@/actions/auth/getUser'

export interface GetPlaygroundKeyResult {
  success: boolean
  hasPlaygroundKey: boolean
  error?: string
}

/**
 * Verifica si el usuario autenticado tiene una playground key asignada
 */
export async function getPlaygroundKeyStatus(): Promise<GetPlaygroundKeyResult> {
  try {
    // Verificar autenticación
    const user = await getCurrentUser()
    if (!user) {
      return {
        success: false,
        hasPlaygroundKey: false,
        error: 'Usuario no autenticado',
      }
    }

    // Obtener payload instance
    const payload = await getPayload({ config })

    // Buscar playground key del usuario
    const playgroundKeysResponse = await payload.find({
      collection: 'api-keys' as any,
      where: {
        and: [
          {
            user: {
              equals: user.id,
            },
          },
          {
            playgroundKey: {
              equals: true,
            },
          },
        ],
      },
      limit: 1,
    })

    const hasPlaygroundKey = playgroundKeysResponse.docs.length > 0

    console.log('[GET_PLAYGROUND_KEY_STATUS] Status check completed:', {
      userId: user.id,
      hasPlaygroundKey,
    })

    return {
      success: true,
      hasPlaygroundKey,
    }
  } catch (error) {
    console.error('[GET_PLAYGROUND_KEY_STATUS] Error checking playground key status:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })

    return {
      success: false,
      hasPlaygroundKey: false,
      error: 'Error interno del servidor. Intenta nuevamente.',
    }
  }
}
