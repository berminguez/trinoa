'use server'

import { getPayload } from 'payload'
import configPromise from '@/payload.config'
import { getCurrentUser } from '@/actions/auth/getUser'
import type { Resource } from '@/payload-types'

// ============================================================================
// TIPOS PARA ACTIVIDAD EN TIEMPO REAL
// ============================================================================

export interface ActivityItem {
  id: string
  type:
    | 'resource_created'
    | 'resource_processed'
    | 'resource_updated'
    | 'project_created'
    | 'user_joined'
  timestamp: string
  user?: {
    id: string
    name: string
    email: string
  }
  project?: {
    id: string
    title: string
  }
  resource?: {
    id: string
    title: string
  }
  priority: 'high' | 'medium' | 'low'
  status: 'success' | 'warning' | 'error' | 'info'
}

// ============================================================================
// SERVER ACTIONS
// ============================================================================

/**
 * Obtiene actividad reciente del sistema
 * @param limit Límite de actividades a retornar
 * @param userId ID de usuario específico (si se proporciona, filtra por ese usuario)
 */
export async function getRealtimeActivity(
  limit: number = 10,
  userId?: string,
): Promise<{
  success: boolean
  data?: ActivityItem[]
  error?: string
}> {
  try {
    const payload = await getPayload({ config: configPromise })
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return {
        success: false,
        error: 'Usuario no autenticado',
      }
    }

    // Construir filtros según el parámetro userId
    // Si se pasa userId = vista de usuario específico
    // Si no se pasa userId = vista de administrador (ver todo)
    const isAdminView = !userId
    const targetUserId = userId || currentUser.id
    const activities: ActivityItem[] = []

    // Obtener recursos recientes (creados o actualizados)
    const recentResources = await payload.find({
      collection: 'resources',
      where: isAdminView
        ? {} // Vista admin: ver todos los recursos
        : {
            'project.createdBy': { equals: targetUserId }, // Vista usuario: solo recursos de proyectos del usuario específico
          },
      limit: limit * 2, // Obtener más para filtrar después
      sort: '-updatedAt',
      depth: 2,
    })

    // Procesar recursos para generar actividades
    recentResources.docs.forEach((resource) => {
      const project = typeof resource.project === 'object' ? resource.project : null
      const createdBy = project && typeof project.createdBy === 'object' ? project.createdBy : null

      if (!project) return

      const isNewResource =
        new Date(resource.createdAt).getTime() > Date.now() - 24 * 60 * 60 * 1000
      const isRecentlyUpdated =
        new Date(resource.updatedAt).getTime() > Date.now() - 2 * 60 * 60 * 1000

      if (isNewResource) {
        activities.push({
          id: `resource_created_${resource.id}`,
          type: 'resource_created',
          timestamp: resource.createdAt,
          user: createdBy
            ? {
                id: createdBy.id,
                name: createdBy.name || createdBy.email,
                email: createdBy.email,
              }
            : undefined,
          project: {
            id: project.id,
            title: project.title,
          },
          resource: {
            id: resource.id,
            title: resource.title,
          },
          priority: 'low',
          status: 'info',
        })
      }

      // Verificar si fue procesado recientemente
      if (resource.status === 'completed' && isRecentlyUpdated) {
        const status =
          resource.confidence === 'trusted'
            ? 'success'
            : resource.confidence === 'needs_revision'
              ? 'warning'
              : 'info'

        activities.push({
          id: `resource_processed_${resource.id}`,
          type: 'resource_processed',
          timestamp: resource.updatedAt,
          user: createdBy
            ? {
                id: createdBy.id,
                name: createdBy.name || createdBy.email,
                email: createdBy.email,
              }
            : undefined,
          project: {
            id: project.id,
            title: project.title,
          },
          resource: {
            id: resource.id,
            title: resource.title,
          },
          priority: resource.confidence === 'trusted' ? 'low' : 'medium',
          status,
        })
      }

      // Verificar si falló el procesamiento
      if (resource.status === 'failed' && isRecentlyUpdated) {
        activities.push({
          id: `resource_failed_${resource.id}`,
          type: 'resource_updated',
          timestamp: resource.updatedAt,
          user: createdBy
            ? {
                id: createdBy.id,
                name: createdBy.name || createdBy.email,
                email: createdBy.email,
              }
            : undefined,
          project: {
            id: project.id,
            title: project.title,
          },
          resource: {
            id: resource.id,
            title: resource.title,
          },
          priority: 'high',
          status: 'error',
        })
      }
    })

    // Obtener proyectos recientes (solo en vista admin)
    if (isAdminView) {
      const recentProjects = await payload.find({
        collection: 'projects',
        limit: 5,
        sort: '-createdAt',
        depth: 1,
        where: {
          createdAt: {
            greater_than: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          },
        },
      })

      recentProjects.docs.forEach((project) => {
        const createdBy = typeof project.createdBy === 'object' ? project.createdBy : null

        activities.push({
          id: `project_created_${project.id}`,
          type: 'project_created',
          timestamp: project.createdAt,
          user: createdBy
            ? {
                id: createdBy.id,
                name: createdBy.name || createdBy.email,
                email: createdBy.email,
              }
            : undefined,
          project: {
            id: project.id,
            title: project.title,
          },
          priority: 'low',
          status: 'info',
        })
      })
    }

    // Ordenar por timestamp (más recientes primero) y limitar
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    return {
      success: true,
      data: activities.slice(0, limit),
    }
  } catch (error) {
    console.error('Error en getRealtimeActivity:', error)
    return {
      success: false,
      error: 'REALTIME_ACTIVITY_ERROR',
    }
  }
}

/**
 * Obtiene estadísticas de actividad para el dashboard
 * @param userId ID de usuario específico (si se proporciona, filtra por ese usuario)
 */
export async function getActivityStats(userId?: string): Promise<{
  success: boolean
  data?: {
    totalToday: number
    resourcesProcessed: number
    projectsCreated: number
    errorsToday: number
    avgProcessingTime: number // en minutos
  }
  error?: string
}> {
  try {
    const payload = await getPayload({ config: configPromise })
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return {
        success: false,
        error: 'Usuario no autenticado',
      }
    }

    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    // Construir filtros según el parámetro userId
    const isAdminView = !userId
    const targetUserId = userId || currentUser.id

    // Obtener recursos creados hoy
    const resourcesCreatedToday = await payload.count({
      collection: 'resources',
      where: isAdminView
        ? {
            createdAt: {
              greater_than: todayStart.toISOString(),
            },
          }
        : {
            'project.createdBy': { equals: targetUserId },
            createdAt: {
              greater_than: todayStart.toISOString(),
            },
          },
    })

    // Obtener recursos procesados hoy (status completed o failed)
    const resourcesProcessedToday = await payload.count({
      collection: 'resources',
      where: isAdminView
        ? {
            updatedAt: {
              greater_than: todayStart.toISOString(),
            },
            status: {
              in: ['completed', 'failed'],
            },
          }
        : {
            'project.createdBy': { equals: targetUserId },
            updatedAt: {
              greater_than: todayStart.toISOString(),
            },
            status: {
              in: ['completed', 'failed'],
            },
          },
    })

    // Obtener errores de hoy
    const errorsToday = await payload.count({
      collection: 'resources',
      where: isAdminView
        ? {
            updatedAt: {
              greater_than: todayStart.toISOString(),
            },
            status: {
              equals: 'failed',
            },
          }
        : {
            'project.createdBy': { equals: targetUserId },
            updatedAt: {
              greater_than: todayStart.toISOString(),
            },
            status: {
              equals: 'failed',
            },
          },
    })

    // Proyectos creados hoy (solo en vista admin)
    let projectsCreatedToday = 0
    if (isAdminView) {
      const projectsResult = await payload.count({
        collection: 'projects',
        where: {
          createdAt: {
            greater_than: todayStart.toISOString(),
          },
        },
      })
      projectsCreatedToday = projectsResult.totalDocs
    }

    // Calcular tiempo promedio de procesamiento (simulado por ahora)
    const avgProcessingTime = Math.floor(Math.random() * 30) + 5 // 5-35 minutos simulado

    return {
      success: true,
      data: {
        totalToday: resourcesCreatedToday.totalDocs + projectsCreatedToday,
        resourcesProcessed: resourcesProcessedToday.totalDocs,
        projectsCreated: projectsCreatedToday,
        errorsToday: errorsToday.totalDocs,
        avgProcessingTime,
      },
    }
  } catch (error) {
    console.error('Error en getActivityStats:', error)
    return {
      success: false,
      error: 'ACTIVITY_STATS_ERROR',
    }
  }
}
