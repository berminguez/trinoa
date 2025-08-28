'use server'

import { getPayload } from 'payload'
import config from '@/payload.config'
import type { Resource } from '@/payload-types'
import { requireAdminAccess } from '@/actions/auth/getUser'

export interface PendingResourcesResponse {
  success: boolean
  data?: {
    resources: Resource[]
    total: number
    currentIndex?: number
    prevId?: string | null
    nextId?: string | null
  }
  error?: string
}

/**
 * Obtiene todos los recursos que requieren revisión administrativa
 *
 * Criterios:
 * - Status: completed o failed
 * - Confidence: empty o needs_revision
 * - Ordenados de más antiguo a más reciente (createdAt ASC)
 */
export async function getPendingResources(): Promise<PendingResourcesResponse> {
  try {
    // Validar acceso de administrador
    await requireAdminAccess()

    const payload = await getPayload({ config })

    // Buscar recursos pendientes con los criterios especificados
    const pendingResources = await payload.find({
      collection: 'resources',
      where: {
        and: [
          {
            status: {
              in: ['completed', 'failed'],
            },
          },
          {
            confidence: {
              in: ['empty', 'needs_revision'],
            },
          },
        ],
      },
      limit: 200, // Límite razonable para tareas pendientes
      sort: 'createdAt', // De más antiguo a más reciente
      depth: 2, // Incluir relaciones completas (proyecto, cliente, etc.)
    })

    console.log(
      `getPendingResources: ${pendingResources.docs.length} tareas pendientes encontradas`,
    )

    return {
      success: true,
      data: {
        resources: pendingResources.docs as Resource[],
        total: pendingResources.totalDocs,
      },
    }
  } catch (error) {
    console.error('getPendingResources: Error obteniendo recursos pendientes:', error)
    return {
      success: false,
      error: 'Error al obtener las tareas pendientes',
    }
  }
}

/**
 * Obtiene información de navegación para un recurso específico en la lista de pendientes
 */
export async function getPendingResourceNavigation(
  currentResourceId: string,
): Promise<PendingResourcesResponse> {
  try {
    // Validar acceso de administrador
    await requireAdminAccess()

    const payload = await getPayload({ config })

    // Obtener todos los IDs de recursos pendientes ordenados
    const pendingResourceIds = await payload.find({
      collection: 'resources',
      where: {
        and: [
          {
            status: {
              in: ['completed', 'failed'],
            },
          },
          {
            confidence: {
              in: ['empty', 'needs_revision'],
            },
          },
        ],
      },
      limit: 200,
      sort: 'createdAt', // De más antiguo a más reciente
      depth: 0, // Solo necesitamos los IDs
    })

    const ids = pendingResourceIds.docs.map((doc) => String(doc.id))
    const currentIndex = ids.indexOf(currentResourceId)

    // Calcular navegación
    const prevId = currentIndex > 0 ? ids[currentIndex - 1] : null
    const nextId = currentIndex >= 0 && currentIndex < ids.length - 1 ? ids[currentIndex + 1] : null

    console.log(
      `getPendingResourceNavigation: Recurso ${currentResourceId} está en posición ${currentIndex + 1} de ${ids.length}`,
    )

    return {
      success: true,
      data: {
        resources: pendingResourceIds.docs as Resource[],
        total: pendingResourceIds.totalDocs,
        currentIndex: currentIndex >= 0 ? currentIndex : undefined,
        prevId,
        nextId,
      },
    }
  } catch (error) {
    console.error('getPendingResourceNavigation: Error obteniendo navegación:', error)
    return {
      success: false,
      error: 'Error al obtener la navegación',
    }
  }
}
