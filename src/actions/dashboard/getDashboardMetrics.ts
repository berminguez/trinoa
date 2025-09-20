'use server'

import { getPayload } from 'payload'
import configPromise from '@/payload.config'
import { getCurrentUser } from '@/actions/auth/getUser'
import type { User, Resource, Project } from '@/payload-types'

// ============================================================================
// TIPOS PARA MÉTRICAS DEL DASHBOARD
// ============================================================================

export interface ResourceMetrics {
  total: number
  trusted: number
  verified: number
  needsReview: number
  processing: number
}

export interface ProjectMetrics {
  total: number
  recent: Project[]
  mostActive: Project[]
}

export interface UserMetrics {
  total: number
  active: number
  recentActivity: {
    id: string
    name: string
    email: string
    empresa: {
      name: string
      cif: string
    }
    unidad: string
    lastActivity: string
    projectsCount: number
  }[]
}

export interface SystemMetrics {
  storageUsed: number // porcentaje
  storageTotal: string
  processingSuccess: number // porcentaje
  processingFailed: number
  activeUsers: number
  totalProjects: number
  processingQueue: number
}

export interface DashboardMetrics {
  resources: ResourceMetrics
  projects: ProjectMetrics
  users?: UserMetrics // Solo para administradores
  system?: SystemMetrics // Solo para administradores
}

// ============================================================================
// SERVER ACTIONS
// ============================================================================

/**
 * Obtiene métricas del dashboard según el rol del usuario
 * Administradores: métricas globales
 * Usuarios: métricas personales
 */
export async function getDashboardMetrics(): Promise<{
  success: boolean
  data?: DashboardMetrics
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

    // Obtener métricas según el rol
    if (user.role === 'admin') {
      return await getAdminDashboardMetrics(payload)
    } else {
      return await getUserDashboardMetrics(payload, user.id)
    }
  } catch (error) {
    console.error('Error en getDashboardMetrics:', error)
    return {
      success: false,
      error: 'Error interno del servidor',
    }
  }
}

/**
 * Obtiene métricas globales para administradores
 */
async function getAdminDashboardMetrics(payload: any): Promise<{
  success: boolean
  data?: DashboardMetrics
  error?: string
}> {
  try {
    // Obtener métricas de recursos globales
    const [
      totalResources,
      trustedResources,
      verifiedResources,
      needsReviewResources,
      processingResources,
    ] = await Promise.all([
      payload.count({ collection: 'resources' }),
      payload.count({
        collection: 'resources',
        where: { confidence: { equals: 'trusted' } },
      }),
      payload.count({
        collection: 'resources',
        where: { confidence: { equals: 'verified' } },
      }),
      payload.count({
        collection: 'resources',
        where: { confidence: { equals: 'needs_revision' } },
      }),
      payload.count({
        collection: 'resources',
        where: { status: { equals: 'processing' } },
      }),
    ])

    // Obtener proyectos recientes
    const recentProjects = await payload.find({
      collection: 'projects',
      limit: 5,
      sort: '-updatedAt',
      depth: 1,
    })

    // Obtener métricas de usuarios
    const totalUsers = await payload.count({ collection: 'users' })

    // Obtener usuarios activos (con actividad reciente)
    const recentUsers = await payload.find({
      collection: 'users',
      limit: 10,
      sort: '-updatedAt',
      where: {
        role: { not_equals: 'api' }, // Excluir usuarios API
      },
    })

    // Calcular proyectos por usuario para actividad
    const usersWithActivity = await Promise.all(
      recentUsers.docs.slice(0, 5).map(async (user: any) => {
        const projectCount = await payload.count({
          collection: 'projects',
          where: { createdBy: { equals: user.id } },
        })

        return {
          id: user.id,
          name: user.name || user.email,
          email: user.email,
          empresa: user.empresa,
          unidad: user.filial,
          lastActivity: user.updatedAt,
          projectsCount: projectCount.totalDocs,
        }
      }),
    )

    // Métricas del sistema (simuladas por ahora)
    const systemMetrics: SystemMetrics = {
      storageUsed: Math.min(68, Math.floor(((totalResources?.totalDocs || 0) / 50) * 100)), // Simulado basado en recursos
      storageTotal: '2.4 TB',
      processingSuccess: Math.max(85, 100 - Math.floor((processingResources?.totalDocs || 0) * 2)), // Simulado
      processingFailed: Math.floor((totalResources?.totalDocs || 0) * 0.02), // 2% de fallos simulado
      activeUsers: recentUsers?.docs?.filter((u: any) => u.role === 'user').length || 0,
      totalProjects: recentProjects?.totalDocs || 0,
      processingQueue: processingResources?.totalDocs || 0,
    }

    return {
      success: true,
      data: {
        resources: {
          total: totalResources?.totalDocs || 0,
          trusted: trustedResources?.totalDocs || 0,
          verified: verifiedResources?.totalDocs || 0,
          needsReview: needsReviewResources?.totalDocs || 0,
          processing: processingResources?.totalDocs || 0,
        },
        projects: {
          total: recentProjects?.totalDocs || 0,
          recent: recentProjects?.docs || [],
          mostActive: recentProjects?.docs || [], // TODO: Implementar lógica de "más activos"
        },
        users: {
          total: totalUsers?.totalDocs || 0,
          active: recentUsers?.docs?.length || 0,
          recentActivity: usersWithActivity || [],
        },
        system: systemMetrics,
      },
    }
  } catch (error) {
    console.error('Error en getAdminDashboardMetrics:', error)
    return {
      success: false,
      error: 'ADMIN_METRICS_ERROR',
    }
  }
}

/**
 * Obtiene métricas personales para usuarios normales
 */
async function getUserDashboardMetrics(
  payload: any,
  userId: string,
): Promise<{
  success: boolean
  data?: DashboardMetrics
  error?: string
}> {
  try {
    // Obtener proyectos del usuario
    const userProjects = await payload.find({
      collection: 'projects',
      where: { createdBy: { equals: userId } },
      limit: 10,
      sort: '-updatedAt',
    })

    const projectIds = userProjects.docs.map((p: any) => p.id)

    // Obtener métricas de recursos del usuario
    const [
      totalResources,
      trustedResources,
      verifiedResources,
      needsReviewResources,
      processingResources,
    ] = await Promise.all([
      payload.count({
        collection: 'resources',
        where: { project: { in: projectIds } },
      }),
      payload.count({
        collection: 'resources',
        where: {
          project: { in: projectIds },
          confidence: { equals: 'trusted' },
        },
      }),
      payload.count({
        collection: 'resources',
        where: {
          project: { in: projectIds },
          confidence: { equals: 'verified' },
        },
      }),
      payload.count({
        collection: 'resources',
        where: {
          project: { in: projectIds },
          confidence: { equals: 'needs-review' },
        },
      }),
      payload.count({
        collection: 'resources',
        where: {
          project: { in: projectIds },
          status: { equals: 'processing' },
        },
      }),
    ])

    return {
      success: true,
      data: {
        resources: {
          total: totalResources?.totalDocs || 0,
          trusted: trustedResources?.totalDocs || 0,
          verified: verifiedResources?.totalDocs || 0,
          needsReview: needsReviewResources?.totalDocs || 0,
          processing: processingResources?.totalDocs || 0,
        },
        projects: {
          total: userProjects?.totalDocs || 0,
          recent: userProjects?.docs || [],
          mostActive: userProjects?.docs?.slice(0, 3) || [], // Los más recientes como "más activos"
        },
        // users no incluido para usuarios normales
      },
    }
  } catch (error) {
    console.error('Error en getUserDashboardMetrics:', error)
    return {
      success: false,
      error: 'USER_METRICS_ERROR',
    }
  }
}

/**
 * Obtiene proyectos recientes del usuario con contadores de recursos
 */
export async function getRecentProjects(limit: number = 5): Promise<{
  success: boolean
  data?: (Project & { resourcesCount: number })[]
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

    const whereClause =
      user.role === 'admin'
        ? undefined // Admins ven todos los proyectos
        : { createdBy: { equals: user.id } } // Usuarios ven solo los suyos

    const result = await payload.find({
      collection: 'projects',
      where: whereClause,
      limit,
      sort: '-updatedAt',
      depth: 1,
    })

    // Obtener contadores de recursos para cada proyecto
    const projectsWithCounts = await Promise.all(
      result.docs.map(async (project) => {
        try {
          const resourceCount = await payload.count({
            collection: 'resources',
            where: { project: { equals: project.id } },
          })

          return {
            ...project,
            resourcesCount: resourceCount?.totalDocs || 0,
          }
        } catch (error) {
          console.error(`Error contando recursos para proyecto ${project.id}:`, error)
          return {
            ...project,
            resourcesCount: 0,
          }
        }
      }),
    )

    return {
      success: true,
      data: projectsWithCounts,
    }
  } catch (error) {
    console.error('Error en getRecentProjects:', error)
    return {
      success: false,
      error: 'RECENT_PROJECTS_ERROR',
    }
  }
}
