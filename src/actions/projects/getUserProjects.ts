'use server'

import { getPayload } from 'payload'
import config from '@payload-config'
import { getCurrentUser } from '@/actions/auth/getUser'
import type { Project } from '@/payload-types'

interface GetUserProjectsResult {
  success: boolean
  data?: Project[]
  error?: string
}

export async function getUserProjectsAction(): Promise<GetUserProjectsResult> {
  try {
    // Verificar autenticación
    const user = await getCurrentUser()
    if (!user) {
      return {
        success: false,
        error: 'Usuario no autenticado',
      }
    }

    // Solo usuarios normales y admins pueden acceder a proyectos
    if (user.role !== 'user' && user.role !== 'admin') {
      return {
        success: false,
        error: 'No tienes permisos para acceder a proyectos',
      }
    }

    // Obtener payload instance
    const payload = await getPayload({ config })

    // Obtener proyectos del usuario actual
    const projectsResponse = await payload.find({
      collection: 'projects' as any,
      where: {
        createdBy: { equals: user.id },
      },
      limit: 100, // Límite razonable
      sort: 'title', // Ordenar alfabéticamente
      depth: 0, // Solo campos básicos
    })

    const projects = projectsResponse.docs as Project[]

    return {
      success: true,
      data: projects,
    }
  } catch (error) {
    console.error('[GET_USER_PROJECTS] Error retrieving user projects:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })

    return {
      success: false,
      error: 'Error interno del servidor. Intenta nuevamente.',
    }
  }
}
