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
  type:
    | 'needs-review'
    | 'processing-failed'
    | 'low-confidence'
    | 'processing-stuck'
    | 'document-error'
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
        error: 'UNAUTHORIZED',
      }
    }

    // Obtener IDs de proyectos del usuario (o de su empresa si queremos ser más permisivos, pero para evitar mostrar proyectos ajenos vamos a filtrar por creador o empresa)
    // ESTRATEGIA:
    // 1. Obtener todos los proyectos creados por el usuario.
    // 2. Obtener todos los proyectos creados por administradores (para permitir ver recursos subidos por admins).
    // 3. Filtrar los recursos que estén en ESOS proyectos Y pertenezcan a la empresa del usuario.

    let projectFilter: any = {}

    if (!user.role || user.role !== 'admin') {
      // ESTRICTO: Solo mostrar alertas de proyectos que el usuario ha creado.
      // Esto alinea las alertas con la visibilidad de "Mis Proyectos".
      // Si un admin crea un proyecto "para el usuario", debe asignarle la propiedad (createdBy) para que lo vea.
      const projects = await payload.find({
        collection: 'projects',
        where: { createdBy: { equals: user.id } },
        limit: 1000, // Limite razonable
        depth: 0,
      })

      const projectIds = projects.docs.map((p) => p.id)

      // Si no tiene proyectos, forzamos que no encuentre nada para evitar mostrar todo
      if (projectIds.length === 0) {
        console.log(`[Dashboard] User ${user.email} has no projects. Alerts will be empty.`)
        return { success: true, data: [] }
      }

      projectFilter = {
        project: { in: projectIds },
      }
    }

    // Construir filtros según el rol del usuario
    let baseWhere: any = {}

    if (user.role === 'admin') {
      baseWhere = {} // Admins globales ven todos los recursos
    } else if (user.empresa) {
      // Si el usuario tiene empresa, ver recursos de esa empresa
      // PERO restringidos a proyectos válidos (del usuario o de admins) para evitar "fugas" de proyectos ajenos
      const empresaId = typeof user.empresa === 'object' ? user.empresa.id : user.empresa
      console.log(`[Dashboard] Filtering alerts by company: ${empresaId} for user ${user.email}`)

      baseWhere = {
        and: [
          { empresa: { equals: empresaId } },
          // Aplicar filtro de proyectos si hemos encontrado proyectos válidos
          ...(projectFilter.project ? [projectFilter] : []),
        ],
      }
    } else {
      // Si no tiene empresa (freelancer), ver recursos de sus proyectos
      console.log(
        `[Dashboard] Filtering alerts by project creator: ${user.id} for user ${user.email}`,
      )
      baseWhere = {
        project: {
          createdBy: { equals: user.id },
        },
      }
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

    // Obtener recursos marcados como erróneos manualmente
    const erroneousResources = await payload.find({
      collection: 'resources',
      where: {
        ...baseWhere,
        documentoErroneo: { equals: true },
      },
      limit: 5,
      sort: '-updatedAt',
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
          priority: 'medium',
          createdAt: resource.createdAt,
          updatedAt: resource.updatedAt,
        })
      }
    })

    // Alertas de documentos erróneos
    erroneousResources.docs.forEach((resource) => {
      const project = typeof resource.project === 'object' ? resource.project : null
      if (project) {
        alerts.push({
          id: resource.id,
          title: resource.title,
          project: {
            id: project.id,
            title: project.title,
          },
          type: 'document-error',
          priority: 'high',
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
      error: 'RESOURCES_ATTENTION_ERROR',
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
      documentError: number
    }
  }
  error?: string
}> {
  try {
    const result = await getResourcesNeedingAttention()

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || 'ALERTS_ERROR',
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
        documentError: alerts.filter((a) => a.type === 'document-error').length,
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
      error: 'ALERTS_STATS_ERROR',
    }
  }
}
