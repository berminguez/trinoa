'use server'

import { getPayload } from 'payload'
import config from '@payload-config'
import { getCurrentUser } from '@/actions/auth/getUser'
import type { ApiKey } from '@/payload-types'
import type { GetApiKeysResult } from './types'

export async function getApiKeysAction(): Promise<GetApiKeysResult> {
  try {
    // Verificar autenticación
    const user = await getCurrentUser()
    if (!user) {
      return {
        success: false,
        error: 'Usuario no autenticado',
      }
    }

    // Solo usuarios normales y admins pueden acceder a API Keys
    if (user.role !== 'user' && user.role !== 'admin') {
      return {
        success: false,
        error: 'No tienes permisos para acceder a API Keys',
      }
    }

    // Obtener payload instance
    const payload = await getPayload({ config })

    // Construir condiciones de filtrado según el rol del usuario
    const whereConditions: any = {
      user: {
        equals: user.id,
      },
    }

    // Los usuarios normales no deben ver playground keys
    // Los administradores pueden ver todas las keys (incluyendo playground keys)
    if (user.role === 'user') {
      // SOLO aplicar filtros para usuarios normales
      // Los administradores NO entran aquí, por lo que ven TODAS las keys
      whereConditions.and = [
        {
          user: {
            equals: user.id,
          },
        },
        {
          or: [
            {
              playgroundKey: {
                not_equals: true,
              },
            },
            {
              playgroundKey: {
                exists: false,
              },
            },
          ],
        },
      ]
    }

    // Obtener API Keys del usuario actual
    const apiKeysResponse = await payload.find({
      collection: 'api-keys' as any,
      where: whereConditions,
      depth: 2, // Para obtener relaciones pobladas
      sort: '-createdAt', // Más recientes primero
      limit: 50, // Límite razonable
    })

    const apiKeys = apiKeysResponse.docs as ApiKey[]

    console.log('[GET_API_KEYS] Keys retrieved successfully:', {
      userId: user.id,
      userRole: user.role,
      keysCount: apiKeys.length,
      playgroundKeysFiltered: user.role === 'user' ? 'Yes' : 'No (admin sees all)',
    })

    return {
      success: true,
      data: apiKeys,
    }
  } catch (error) {
    console.error('[GET_API_KEYS] Error retrieving API keys:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })

    return {
      success: false,
      error: 'Error interno del servidor. Intenta nuevamente.',
    }
  }
}
