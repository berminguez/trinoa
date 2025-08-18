'use server'

import { getPayload } from 'payload'
import configPromise from '@/payload.config'
import { getCurrentUser } from '@/actions/auth/getUser'
import type { DashboardMetrics } from './getDashboardMetrics'

// ============================================================================
// CONSULTAS OPTIMIZADAS PARA EL DASHBOARD
// ============================================================================

/**
 * Obtiene todas las métricas del dashboard en una sola consulta optimizada
 * Reduce el número de queries a la base de datos para mejor performance
 */
export async function getOptimizedDashboardData(): Promise<{
  success: boolean
  data?: {
    metrics: DashboardMetrics
    recentActivity: any[]
    alerts: any[]
    systemHealth: any
  }
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

    const isAdmin = user.role === 'admin'

    // Ejecutar consultas en paralelo para mejor performance
    const [resourcesData, projectsData, usersData, alertsData] = await Promise.all([
      // Obtener todos los recursos con datos relevantes
      payload.find({
        collection: 'resources',
        where: (isAdmin
          ? {}
          : {
              project: {
                createdBy: { equals: user.id },
              },
            }) as any,
        limit: 100, // Limitar para performance
        sort: '-updatedAt',
        select: {
          id: true,
          title: true,
          status: true,
          confidence: true,
          project: true,
          updatedAt: true,
          createdAt: true,
        },
        depth: 1,
      }),

      // Obtener proyectos con contadores
      payload.find({
        collection: 'projects',
        where: isAdmin ? {} : { createdBy: { equals: user.id } },
        limit: 20,
        sort: '-updatedAt',
        select: {
          id: true,
          title: true,
          slug: true,
          createdBy: true,
          updatedAt: true,
          createdAt: true,
        },
        depth: 1,
      }),

      // Usuarios (solo para admin)
      isAdmin
        ? payload.find({
            collection: 'users',
            where: { role: { not_equals: 'api' } },
            limit: 50,
            sort: '-updatedAt',
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              updatedAt: true,
              createdAt: true,
            },
          })
        : null,

      // Obtener recursos que necesitan atención (optimizado)
      payload.find({
        collection: 'resources',
        where: {
          ...(isAdmin
            ? {}
            : ({
                project: {
                  createdBy: { equals: user.id },
                },
              } as any)),
          or: [
            { confidence: { equals: 'needs-review' } },
            { status: { equals: 'failed' } },
            {
              and: [
                { status: { equals: 'processing' } },
                { updatedAt: { less_than: new Date(Date.now() - 60 * 60 * 1000).toISOString() } },
              ],
            },
          ],
        },
        limit: 20,
        sort: '-updatedAt',
        select: {
          id: true,
          title: true,
          status: true,
          confidence: true,
          project: true,
          updatedAt: true,
        },
        depth: 1,
      }),
    ])

    // Procesar datos para métricas optimizadas
    const processedData = await processOptimizedData({
      resourcesData,
      projectsData,
      usersData,
      alertsData,
      isAdmin,
      payload,
    })

    return {
      success: true,
      data: processedData,
    }
  } catch (error) {
    console.error('Error en getOptimizedDashboardData:', error)
    return {
      success: false,
      error: 'Error obteniendo datos optimizados del dashboard',
    }
  }
}

/**
 * Procesa los datos obtenidos para generar métricas optimizadas
 */
async function processOptimizedData({
  resourcesData,
  projectsData,
  usersData,
  alertsData,
  isAdmin,
  payload,
}: {
  resourcesData: any
  projectsData: any
  usersData: any
  alertsData: any
  isAdmin: boolean
  payload: any
}) {
  // Calcular métricas de recursos
  const resourceMetrics = {
    total: resourcesData?.totalDocs || 0,
    trusted: resourcesData?.docs?.filter((r: any) => r.confidence === 'trusted').length || 0,
    verified: resourcesData?.docs?.filter((r: any) => r.confidence === 'verified').length || 0,
    needsReview:
      resourcesData?.docs?.filter((r: any) => r.confidence === 'needs-review').length || 0,
    processing: resourcesData?.docs?.filter((r: any) => r.status === 'processing').length || 0,
  }

  // Agregar contadores de recursos por proyecto de forma optimizada
  const projectsWithCounts =
    projectsData?.docs?.map((project: any) => {
      const resourcesInProject =
        resourcesData?.docs?.filter((r: any) => {
          const projectId = typeof r.project === 'object' ? r.project.id : r.project
          return projectId === project.id
        }) || []

      return {
        ...project,
        resourcesCount: resourcesInProject.length,
      }
    }) || []

  // Métricas de usuarios (solo admin)
  let userMetrics: any = undefined
  if (isAdmin && usersData) {
    // Calcular proyectos por usuario de forma optimizada
    const usersWithActivity = await Promise.all(
      usersData.docs.slice(0, 5).map(async (user: any) => {
        const userProjects =
          projectsData?.docs?.filter((p: any) => {
            const createdById = typeof p.createdBy === 'object' ? p.createdBy.id : p.createdBy
            return createdById === user.id
          }) || []

        return {
          id: user.id,
          name: user.name || user.email,
          email: user.email,
          lastActivity: user.updatedAt,
          projectsCount: userProjects.length,
        }
      }),
    )

    userMetrics = {
      total: usersData?.totalDocs || 0,
      active: usersData?.docs?.length || 0,
      recentActivity: usersWithActivity,
    }
  }

  // Métricas del sistema optimizadas
  const systemMetrics = {
    storageUsed: Math.min(68, Math.floor((resourceMetrics.total / 50) * 100)),
    storageTotal: '2.4 TB',
    processingSuccess: Math.max(85, 100 - Math.floor(resourceMetrics.processing * 2)),
    processingFailed: resourcesData?.docs?.filter((r: any) => r.status === 'failed').length || 0,
    activeUsers: userMetrics?.active || 0,
    totalProjects: projectsData?.totalDocs || 0,
    processingQueue: resourceMetrics.processing,
  }

  // Procesar alertas
  const alerts =
    alertsData?.docs
      ?.map((resource: any) => {
        const project = typeof resource.project === 'object' ? resource.project : null
        if (!project) return null

        let type = 'needs-review'
        let priority = 'medium'
        let message = 'Recurso necesita revisión manual'

        if (resource.status === 'failed') {
          type = 'processing-failed'
          priority = 'high'
          message = 'Error en el procesamiento del documento'
        } else if (resource.status === 'processing') {
          type = 'processing-stuck'
          priority = 'high'
          message = 'Procesamiento atascado por más de 1 hora'
        }

        return {
          id: resource.id,
          title: resource.title,
          project: {
            id: project.id,
            title: project.title,
          },
          type,
          message,
          priority,
          createdAt: resource.createdAt,
          updatedAt: resource.updatedAt,
        }
      })
      ?.filter(Boolean) || []

  // Generar actividad reciente de forma optimizada
  const recentActivity =
    resourcesData?.docs
      ?.slice(0, 10)
      ?.map((resource: any) => {
        const project = typeof resource.project === 'object' ? resource.project : null
        if (!project) return null

        const isNewResource =
          new Date(resource.createdAt).getTime() > Date.now() - 24 * 60 * 60 * 1000

        if (isNewResource) {
          return {
            id: `resource_created_${resource.id}`,
            type: 'resource_created',
            title: 'Nuevo recurso creado',
            description: `"${resource.title}" agregado al proyecto "${project.title}"`,
            timestamp: resource.createdAt,
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
          }
        }

        return null
      })
      ?.filter(Boolean) || []

  return {
    metrics: {
      resources: resourceMetrics,
      projects: {
        total: projectsData?.totalDocs || 0,
        recent: projectsWithCounts.slice(0, 5),
        mostActive: projectsWithCounts.slice(0, 3),
      },
      users: userMetrics,
      system: systemMetrics,
    },
    recentActivity,
    alerts,
    systemHealth: {
      status:
        alerts.filter((a: any) => a.priority === 'high').length > 0
          ? 'critical'
          : alerts.length > 5
            ? 'warning'
            : 'healthy',
      lastUpdate: new Date().toISOString(),
    },
  }
}

/**
 * Cache simple en memoria para reducir consultas frecuentes
 */
const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_DURATION = 30 * 1000 // 30 segundos

export async function getCachedDashboardData(userId: string) {
  const cacheKey = `dashboard_${userId}`
  const cached = cache.get(cacheKey)

  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return {
      success: true,
      data: cached.data,
      fromCache: true,
    }
  }

  const result = await getOptimizedDashboardData()

  if (result.success && result.data) {
    cache.set(cacheKey, {
      data: result.data,
      timestamp: Date.now(),
    })
  }

  return {
    ...result,
    fromCache: false,
  }
}
