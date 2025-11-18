'use server'

import { getCurrentUser } from '@/actions/auth/getUser'
import { getPayload } from 'payload'
import config from '@payload-config'
import type { Resource } from '@/payload-types'

export interface GetProjectResourcesResult {
  success: boolean
  data?: Resource[]
  error?: string
}

/**
 * Obtiene los recursos actualizados de un proyecto específico
 */
export async function getProjectResources(projectId: string): Promise<GetProjectResourcesResult> {
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

    // Verificar acceso al proyecto
    let project
    try {
      project = await payload.findByID({
        collection: 'projects',
        id: projectId,
        depth: 1,
      })

      // Verificar ownership (usuario es dueño o admin)
      const createdByUserId =
        typeof project.createdBy === 'object' ? project.createdBy.id : project.createdBy
      const isOwner = createdByUserId === user.id
      const isAdmin = user.role === 'admin'

      if (!isOwner && !isAdmin) {
        return {
          success: false,
          error: 'Acceso denegado al proyecto',
        }
      }
    } catch (error) {
      return {
        success: false,
        error: 'Proyecto no encontrado',
      }
    }

    // Buscar resources del proyecto
    const result = await payload.find({
      collection: 'resources',
      where: {
        project: {
          equals: projectId,
        },
      },
      sort: '-createdAt', // Más recientes primero
      limit: 50000, // Límite muy alto - la tabla tiene paginación frontend
      depth: 2,
    })

    console.log(
      `✅ [GET_PROJECT_RESOURCES] Found ${result.docs.length} resources for project ${projectId}`,
    )

    return {
      success: true,
      data: result.docs as Resource[],
    }
  } catch (error) {
    console.error('❌ [GET_PROJECT_RESOURCES] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error interno del servidor',
    }
  }
}
