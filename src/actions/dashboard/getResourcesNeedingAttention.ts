'use server'

import { getPayload } from 'payload'
import configPromise from '@/payload.config'
import { getCurrentUser } from '@/actions/auth/getUser'
import type { Resource } from '@/payload-types'

// ============================================================================
// TIPOS PARA RECURSOS QUE NECESITAN ATENCIÓN
// ============================================================================

export interface ResourceAlert {
  id: string
  title: string
  project: {
    id: string
    title: string
  }
  type: 'needs-review' | 'processing-failed' | 'low-confidence' | 'processing-stuck'
  message: string
  priority: 'high' | 'medium' | 'low'
  createdAt: string
  updatedAt: string
}

// ============================================================================
// SERVER ACTIONS
// ============================================================================

/**
 * Obtiene recursos que necesitan atención del usuario/administrador
 */
export async function getResourcesNeedingAttention(): Promise<{
  success: boolean
  data?: ResourceAlert[]
  error?: string
}> {
  try {
    const payload = await getPayload({ config: configPromise })
    const user = await getCurrentUser()

    if (!user) {
      return {
        success: false,
        error: 'Usuario no autenticado',
      }
    }

    // Construir filtros según el rol del usuario
    const baseWhere: any =
      user.role === 'admin'
        ? {} // Admins ven todos los recursos
        : {
            // Usuarios ven solo recursos de sus proyectos
            project: {
              createdBy: { equals: user.id },
            },
          }

    // Obtener recursos que necesitan revisión
    const needsReviewResources = await payload.find({
      collection: 'resources',
      where: {
        ...baseWhere,
        confidence: { equals: 'needs-review' },
      },
      limit: 10,
      sort: '-updatedAt',
      depth: 2, // Para obtener datos del proyecto
    })

    // Obtener recursos con procesamiento fallido
    const failedResources = await payload.find({
      collection: 'resources',
      where: {
        ...baseWhere,
        status: { equals: 'failed' },
      },
      limit: 5,
      sort: '-updatedAt',
      depth: 2,
    })

    // Obtener recursos con procesamiento atascado (más de 1 hora en "processing")
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const stuckResources = await payload.find({
      collection: 'resources',
      where: {
        ...baseWhere,
        status: { equals: 'processing' },
        updatedAt: { less_than: oneHourAgo },
      },
      limit: 5,
      sort: 'updatedAt', // Los más antiguos primero
      depth: 2,
    })

    // Transformar a alertas
    const alerts: ResourceAlert[] = []

    // Alertas de recursos que necesitan revisión
    needsReviewResources.docs.forEach((resource) => {
      const project = typeof resource.project === 'object' ? resource.project : null
      if (project) {
        alerts.push({
          id: resource.id,
          title: resource.title,
          project: {
            id: project.id,
            title: project.title,
          },
          type: 'needs-review',
          message: 'Recurso necesita revisión manual',
          priority: 'medium',
          createdAt: resource.createdAt,
          updatedAt: resource.updatedAt,
        })
      }
    })

    // Alertas de procesamiento fallido
    failedResources.docs.forEach((resource) => {
      const project = typeof resource.project === 'object' ? resource.project : null
      if (project) {
        alerts.push({
          id: resource.id,
          title: resource.title,
          project: {
            id: project.id,
            title: project.title,
          },
          type: 'processing-failed',
          message: 'Error en el procesamiento del documento',
          priority: 'high',
          createdAt: resource.createdAt,
          updatedAt: resource.updatedAt,
        })
      }
    })

    // Alertas de procesamiento atascado
    stuckResources.docs.forEach((resource) => {
      const project = typeof resource.project === 'object' ? resource.project : null
      if (project) {
        alerts.push({
          id: resource.id,
          title: resource.title,
          project: {
            id: project.id,
            title: project.title,
          },
          type: 'processing-stuck',
          message: 'Procesamiento atascado por más de 1 hora',
          priority: 'high',
          createdAt: resource.createdAt,
          updatedAt: resource.updatedAt,
        })
      }
    })

    // Ordenar por prioridad y fecha
    alerts.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
      if (priorityDiff !== 0) return priorityDiff

      // Si tienen la misma prioridad, ordenar por fecha (más recientes primero)
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    })

    return {
      success: true,
      data: alerts.slice(0, 10), // Limitar a 10 alertas más importantes
    }
  } catch (error) {
    console.error('Error en getResourcesNeedingAttention:', error)
    return {
      success: false,
      error: 'Error obteniendo recursos que necesitan atención',
    }
  }
}

/**
 * Obtiene estadísticas de alertas para el dashboard
 */
export async function getAlertsStats(): Promise<{
  success: boolean
  data?: {
    total: number
    high: number
    medium: number
    low: number
    types: {
      needsReview: number
      processingFailed: number
      processingStuck: number
    }
  }
  error?: string
}> {
  try {
    const result = await getResourcesNeedingAttention()

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || 'Error obteniendo alertas',
      }
    }

    const alerts = result.data
    const stats = {
      total: alerts.length,
      high: alerts.filter((a) => a.priority === 'high').length,
      medium: alerts.filter((a) => a.priority === 'medium').length,
      low: alerts.filter((a) => a.priority === 'low').length,
      types: {
        needsReview: alerts.filter((a) => a.type === 'needs-review').length,
        processingFailed: alerts.filter((a) => a.type === 'processing-failed').length,
        processingStuck: alerts.filter((a) => a.type === 'processing-stuck').length,
      },
    }

    return {
      success: true,
      data: stats,
    }
  } catch (error) {
    console.error('Error en getAlertsStats:', error)
    return {
      success: false,
      error: 'Error obteniendo estadísticas de alertas',
    }
  }
}
