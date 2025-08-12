'use server'

import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/actions/auth/getUser'
import getPayload from 'payload'
import config from '@/payload.config'
import type { Project, Resource, User } from '@/src/payload-types'

export interface UpdateResourceResult {
  success: boolean
  data?: Resource
  error?: string
  code?: 'UNAUTHENTICATED' | 'FORBIDDEN' | 'NOT_FOUND' | 'NOT_IMPLEMENTED' | 'INVALID_INPUT'
}

/**
 * Valida autenticación, ownership de proyecto y pertenencia del recurso.
 * No realiza aún la actualización (se implementará en subtarea 2.2).
 */
export async function updateResourceAction(
  projectId: string,
  resourceId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updates: any,
): Promise<UpdateResourceResult> {
  try {
    // 1) Autenticación obligatoria
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: 'Usuario no autenticado', code: 'UNAUTHENTICATED' }
    }

    // 2) Cargar instancia de Payload
    const payload = await getPayload({ config })

    // 3) Verificar proyecto y ownership (owner o admin)
    const project = (await payload.findByID({
      collection: 'projects',
      id: projectId,
      depth: 0,
      user,
    })) as Project | null

    if (!project) {
      return { success: false, error: 'Proyecto no encontrado', code: 'NOT_FOUND' }
    }

    const createdByUserId =
      typeof project.createdBy === 'object' ? project.createdBy.id : project.createdBy
    const isOwner = createdByUserId === user.id
    const isAdmin = (user as User).role === 'admin'
    if (!isOwner && !isAdmin) {
      return { success: false, error: 'No tienes permisos sobre este proyecto', code: 'FORBIDDEN' }
    }

    // 4) Verificar recurso y pertenencia al proyecto
    const resource = (await payload.findByID({
      collection: 'resources',
      id: resourceId,
      depth: 0,
      user,
    })) as Resource | null

    if (!resource) {
      return { success: false, error: 'Recurso no encontrado', code: 'NOT_FOUND' }
    }

    const resourceProjectId =
      typeof resource.project === 'object' ? resource.project.id : resource.project
    if (String(resourceProjectId) !== String(projectId)) {
      return {
        success: false,
        error: 'El recurso no pertenece al proyecto especificado',
        code: 'FORBIDDEN',
      }
    }

    // 5) Preparar y aplicar actualización
    const updateData: Partial<Resource> = {}

    // Campos globales permitidos
    if (typeof updates?.nombre_cliente === 'string') {
      updateData.nombre_cliente = updates.nombre_cliente
    }
    if (typeof updates?.nombre_documento === 'string') {
      updateData.nombre_documento = updates.nombre_documento
    }
    if (typeof updates?.caso === 'string' || updates?.caso === null) {
      // Payload validará el valor permitido
      updateData.caso = updates.caso
    }
    if (typeof updates?.tipo === 'string' || updates?.tipo === null) {
      updateData.tipo = updates.tipo
    }

    // Campos dinámicos del caso activo
    const activeCase = (updateData.caso ?? resource.caso) as Resource['caso']
    if (activeCase && typeof activeCase === 'string') {
      const casePayload = updates?.[activeCase]
      if (casePayload && typeof casePayload === 'object') {
        ;(updateData as any)[activeCase] = casePayload
      }
    }

    // Si no hay cambios, devolver éxito sin modificar
    if (Object.keys(updateData).length === 0) {
      return { success: true, data: resource }
    }

    const updated = (await payload.update({
      collection: 'resources',
      id: resourceId,
      data: {
        ...updateData,
        // Auditoría de actualización
        // @ts-expect-error El campo se ha añadido en la colección
        lastUpdatedBy: user.id,
      },
      user,
    })) as Resource

    // Revalidar la ruta específica del recurso
    try {
      revalidatePath(`/projects/${projectId}/resource/${resourceId}`)
    } catch (revalidateError) {
      console.warn('[UPDATE_RESOURCE] Failed to revalidate path', revalidateError)
    }

    return { success: true, data: updated }
  } catch (error) {
    console.error('[UPDATE_RESOURCE] Error in validation stage:', error)
    return { success: false, error: 'Error interno del servidor', code: 'INVALID_INPUT' }
  }
}

export default updateResourceAction
