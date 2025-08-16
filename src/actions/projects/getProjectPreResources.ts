'use server'

import { getPayload } from 'payload'
import config from '@/payload.config'
import { getCurrentUser } from '../auth/getUser'
import type { PreResource } from '@/payload-types'

export interface GetProjectPreResourcesResult {
  success: boolean
  data?: PreResource[]
  error?: string
}

/**
 * Obtiene los pre-resources de un proyecto específico
 */
export async function getProjectPreResources(
  projectId: string,
): Promise<GetProjectPreResourcesResult> {
  try {
    if (!projectId) {
      return {
        success: false,
        error: 'Project ID es requerido',
      }
    }

    // Verificar autenticación
    const user = await getCurrentUser()
    if (!user) {
      return {
        success: false,
        error: 'Usuario no autenticado',
      }
    }

    const payload = await getPayload({ config })

    // Buscar pre-resources del proyecto
    const result = await payload.find({
      collection: 'pre-resources',
      where: {
        project: {
          equals: projectId,
        },
      },
      sort: '-createdAt', // Más recientes primero
      limit: 100, // Limite razonable
      depth: 1,
    })

    return {
      success: true,
      data: result.docs as PreResource[],
    }
  } catch (error) {
    console.error('❌ [GET_PROJECT_PRE_RESOURCES] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error interno del servidor',
    }
  }
}
