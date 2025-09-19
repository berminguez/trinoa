'use server'

import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/actions/auth/getUser'
import { getPayload } from 'payload'
import config from '@/payload.config'
import type { Project, Resource, User } from '@/payload-types'

export interface CancelProcessingResourceResult {
  success: boolean
  error?: string
}

/**
 * Cancela el procesamiento de un recurso que está en estado "processing",
 * cambiando su status a "failed" y limpiando el executionId.
 */
export async function cancelProcessingResourceAction(
  projectId: string,
  resourceId: string,
): Promise<CancelProcessingResourceResult> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Usuario no autenticado' }

    const payload = await getPayload({ config })

    // Verificar proyecto y permisos
    const project = (await payload.findByID({
      collection: 'projects',
      id: projectId,
      depth: 0,
      user,
    })) as Project | null
    if (!project) return { success: false, error: 'Proyecto no encontrado' }
    const createdByUserId =
      typeof project.createdBy === 'object' ? project.createdBy.id : project.createdBy
    const isOwner = createdByUserId === user.id
    const isAdmin = (user as User).role === 'admin'
    if (!isOwner && !isAdmin) return { success: false, error: 'No tienes permisos' }

    // Obtener recurso
    const resource = (await payload.findByID({
      collection: 'resources',
      id: resourceId,
      depth: 0,
      user,
    })) as Resource | null
    if (!resource) return { success: false, error: 'Recurso no encontrado' }
    const resourceProjectId =
      typeof resource.project === 'object' ? resource.project.id : resource.project
    if (String(resourceProjectId) !== String(projectId)) {
      return { success: false, error: 'El recurso no pertenece al proyecto' }
    }

    // Verificar que el recurso esté en processing
    if (resource.status !== 'processing') {
      return { success: false, error: 'El recurso no está en procesamiento' }
    }

    // Actualizar estado a failed y limpiar executionId
    const updateData: Partial<Resource> = {
      status: 'failed' as Resource['status'],
      executionId: '', // Limpiar executionId
      lastUpdatedBy: (user as User).id,
      logs: [
        ...(((resource as any).logs as any[]) || []),
        {
          step: 'processing-cancelled',
          status: 'error',
          at: new Date().toISOString(),
          details: 'Procesamiento cancelado manualmente por el usuario',
          data: {
            byUserId: (user as User).id,
            previousExecutionId: (resource as any).executionId || null,
          },
        },
      ],
    }

    await payload.update({
      collection: 'resources',
      id: resourceId,
      data: updateData,
      user,
      depth: 0,
      overrideAccess: true,
    })

    try {
      revalidatePath(`/projects/${projectId}/resource/${resourceId}`)
    } catch {}

    return { success: true }
  } catch (error) {
    console.error('[CANCEL_PROCESSING] Error:', error)
    return { success: false, error: 'Error interno' }
  }
}

export default cancelProcessingResourceAction
