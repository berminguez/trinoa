'use server'

import { getPayload } from 'payload'
import config from '@/payload.config'
import { requireAdminAccess } from '@/actions/auth/getUser'
import type { Project, User, Resource } from '@/payload-types'

interface GetProjectAsAdminResult {
  success: boolean
  data?: {
    project: Project
    client: User
    resources: Resource[]
    totalResources: number
  }
  message?: string
}

/**
 * Server action para obtener detalles completos de un proyecto como administrador
 *
 * Solo usuarios admin pueden ejecutar esta función
 * Obtiene proyecto, cliente propietario y recursos con validaciones de seguridad
 *
 * @param projectId - ID del proyecto
 * @param clientId - ID del cliente (opcional, para validación adicional)
 * @returns Promise<GetProjectAsAdminResult> - Datos completos del proyecto
 */
export async function getProjectAsAdmin(
  projectId: string,
  clientId?: string,
): Promise<GetProjectAsAdminResult> {
  try {
    // Validar que el usuario es admin
    const adminUser = await requireAdminAccess()
    console.log(`getProjectAsAdmin: Admin ${adminUser.email} obteniendo proyecto ${projectId}`, {
      clientId,
    })

    // Validar parámetros de entrada
    if (!projectId || typeof projectId !== 'string') {
      return {
        success: false,
        message: 'ID de proyecto inválido',
      }
    }

    // Obtener payload instance
    const payload = await getPayload({ config })

    // 1. Obtener proyecto con relaciones completas
    let project: Project
    let client: User

    try {
      console.log(`getProjectAsAdmin: Cargando proyecto ${projectId}`)

      project = await payload.findByID({
        collection: 'projects',
        id: projectId,
        depth: 2,
      })

      console.log(`getProjectAsAdmin: Proyecto encontrado: ${project.title}`)

      // Obtener información del cliente propietario
      const projectClientId =
        typeof project.createdBy === 'object' ? project.createdBy.id : project.createdBy

      client = await payload.findByID({
        collection: 'users',
        id: projectClientId,
        depth: 1,
      })

      console.log(`getProjectAsAdmin: Cliente propietario: ${client.email}`)

      // Si se proporciona clientId, validar que coincide
      if (clientId && clientId !== projectClientId) {
        console.log(
          `getProjectAsAdmin: Cliente no coincide. Esperado: ${clientId}, Real: ${projectClientId}`,
        )
        return {
          success: false,
          message: 'El proyecto no pertenece al cliente especificado',
        }
      }
    } catch (error) {
      console.error('getProjectAsAdmin: Error obteniendo proyecto o cliente:', error)
      return {
        success: false,
        message: 'Proyecto no encontrado',
      }
    }

    // 2. Obtener recursos del proyecto
    console.log(`getProjectAsAdmin: Cargando recursos del proyecto ${project.title}`)

    const resourcesQuery = await payload.find({
      collection: 'resources',
      where: {
        project: { equals: projectId },
      },
      limit: 100, // Límite más alto para administradores
      sort: '-createdAt',
      depth: 2,
    })

    const resources = resourcesQuery.docs as Resource[]
    const totalResources = resourcesQuery.totalDocs

    console.log(
      `getProjectAsAdmin: ${resources.length} recursos encontrados para proyecto ${project.title}`,
    )

    // 3. Logging de auditoría
    console.log(`getProjectAsAdmin: Acceso administrativo completado:`, {
      projectId: project.id,
      projectTitle: project.title,
      clientId: client.id,
      clientEmail: client.email,
      adminEmail: adminUser.email,
      resourceCount: totalResources,
      timestamp: new Date().toISOString(),
    })

    return {
      success: true,
      data: {
        project,
        client,
        resources,
        totalResources,
      },
      message: `Datos del proyecto "${project.title}" obtenidos exitosamente`,
    }
  } catch (error) {
    console.error('Error en getProjectAsAdmin:', error)

    // Manejar errores específicos
    if (error instanceof Error) {
      // Error de permisos
      if (error.message.includes('permission') || error.message.includes('access')) {
        return {
          success: false,
          message: 'No tienes permisos para acceder a este proyecto.',
        }
      }

      // Error de validación
      if (error.message.includes('validation')) {
        return {
          success: false,
          message: 'Error de validación en los datos del proyecto.',
        }
      }

      return {
        success: false,
        message: error.message,
      }
    }

    return {
      success: false,
      message: 'Error interno del servidor. Intenta nuevamente.',
    }
  }
}

/**
 * Server action para obtener estadísticas del proyecto para administradores
 *
 * @param projectId - ID del proyecto
 * @returns Promise con estadísticas del proyecto
 */
export async function getProjectStatsAsAdmin(projectId: string) {
  try {
    // Validar que el usuario es admin
    const adminUser = await requireAdminAccess()

    // Obtener payload instance
    const payload = await getPayload({ config })

    // Obtener proyecto básico
    const project = await payload.findByID({
      collection: 'projects',
      id: projectId,
      depth: 1,
    })

    // Obtener estadísticas de recursos
    const resourcesStats = await payload.find({
      collection: 'resources',
      where: {
        project: { equals: projectId },
      },
      limit: 0, // Solo queremos el count
    })

    // Calcular métricas
    const daysSinceCreation = Math.floor(
      (Date.now() - new Date(project.createdAt).getTime()) / (1000 * 60 * 60 * 24),
    )

    const daysSinceUpdate = project.updatedAt
      ? Math.floor((Date.now() - new Date(project.updatedAt).getTime()) / (1000 * 60 * 60 * 24))
      : daysSinceCreation

    console.log(`getProjectStatsAsAdmin: Estadísticas generadas para proyecto ${project.title}`)

    return {
      success: true,
      data: {
        projectId: project.id,
        title: project.title,
        totalResources: resourcesStats.totalDocs,
        daysSinceCreation,
        daysSinceUpdate,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        slug: project.slug,
        adminAccess: {
          accessedBy: adminUser.email,
          accessedAt: new Date().toISOString(),
        },
      },
    }
  } catch (error) {
    console.error('Error en getProjectStatsAsAdmin:', error)
    return {
      success: false,
      message: 'Error obteniendo estadísticas del proyecto',
    }
  }
}
