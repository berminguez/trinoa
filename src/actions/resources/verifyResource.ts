'use server'

import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/actions/auth/getUser'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { canBeVerified, getConfidenceThreshold } from '@/lib/utils/calculateResourceConfidence'
import type { Resource, User } from '@/payload-types'

export interface VerifyResourceResult {
  success: boolean
  data?: {
    id: string
    confidence: 'verified'
  }
  error?: string
  code?: 'UNAUTHENTICATED' | 'NOT_FOUND' | 'FORBIDDEN' | 'VALIDATION_ERROR' | 'PROCESSING_ERROR'
}

/**
 * Marca un recurso como verificado manualmente por el usuario
 * Solo permitido si todos los campos obligatorios tienen confianza suficiente
 */
export async function verifyResourceAction(
  projectId: string,
  resourceId: string,
): Promise<VerifyResourceResult> {
  try {
    // 1) Autenticación obligatoria
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: 'Usuario no autenticado', code: 'UNAUTHENTICATED' }
    }

    // 2) Cargar instancia de Payload
    const payload = await getPayload({ config })

    // 3) Obtener threshold de configuración
    const threshold = await getConfidenceThreshold(payload)

    // 4) Verificar que el recurso existe y obtener datos completos
    const resource = (await payload.findByID({
      collection: 'resources',
      id: resourceId,
      depth: 1, // Incluir proyecto para verificar permisos
      user,
    })) as Resource | null

    if (!resource) {
      return { success: false, error: 'Recurso no encontrado', code: 'NOT_FOUND' }
    }

    // 5) Verificar permisos: owner del proyecto o admin
    const project = resource.project
    if (!project) {
      return {
        success: false,
        error: 'Recurso sin proyecto asociado',
        code: 'VALIDATION_ERROR',
      }
    }

    const projectObj = typeof project === 'object' ? project : null
    const createdByUserId = projectObj
      ? typeof projectObj.createdBy === 'object'
        ? projectObj.createdBy?.id
        : projectObj.createdBy
      : null

    const isOwner = createdByUserId === user.id
    const isAdmin = (user as User).role === 'admin'
    if (!isOwner && !isAdmin) {
      return {
        success: false,
        error: 'No tienes permisos para verificar este recurso',
        code: 'FORBIDDEN',
      }
    }

    // 6) Verificar que el proyecto coincide
    const actualProjectId = typeof project === 'object' ? project.id : project
    if (actualProjectId !== projectId) {
      return {
        success: false,
        error: 'El recurso no pertenece al proyecto especificado',
        code: 'VALIDATION_ERROR',
      }
    }

    // 7) Obtener campos obligatorios
    let requiredFieldNames: string[] = []
    try {
      const translations = await payload.find({
        collection: 'field-translations',
        limit: 1000,
        depth: 0,
        user,
      })
      const docs = Array.isArray(translations?.docs) ? translations.docs : []
      requiredFieldNames = docs
        .filter((d: any) => d?.isRequired)
        .map((d: any) => String(d.key))
        .filter(Boolean)
    } catch (e) {
      console.warn('[VERIFY_RESOURCE] No se pudieron cargar campos obligatorios', e)
    }

    // 8) Validar que el recurso puede ser verificado
    const canVerify = canBeVerified(resource, threshold, {
      requiredFieldNames,
    })

    if (!canVerify) {
      return {
        success: false,
        error:
          'El recurso no puede ser verificado. Asegúrate de que todos los campos obligatorios tengan suficiente confianza o sean corregidos manualmente.',
        code: 'VALIDATION_ERROR',
      }
    }

    // 9) Actualizar el recurso con confidence = 'verified'
    const updateData = {
      confidence: 'verified' as const,
      // Auditoría de verificación
      lastUpdatedBy: user.id,
      verifiedAt: new Date().toISOString(),
      verifiedBy: user.id,
    }

    console.log(`[VERIFY_RESOURCE] Updating resource ${resourceId} with data:`, updateData)

    const updated = (await payload.update({
      collection: 'resources',
      id: resourceId,
      data: updateData,
      user,
    })) as Resource

    console.log(`[VERIFY_RESOURCE] Updated resource result:`, {
      id: updated.id,
      confidence: updated.confidence,
      verifiedAt: (updated as any).verifiedAt,
      verifiedBy: (updated as any).verifiedBy,
    })

    // 10) Revalidar rutas que podrían mostrar este recurso
    try {
      revalidatePath(`/projects/${projectId}`)
      revalidatePath(`/projects/${projectId}/resource/${resourceId}`)
    } catch (revalidateError) {
      console.warn('[VERIFY_RESOURCE] Failed to revalidate paths', revalidateError)
    }

    console.log(`[VERIFY_RESOURCE] Resource ${resourceId} manually verified by user ${user.id}`)

    return {
      success: true,
      data: {
        id: updated.id,
        confidence: 'verified',
      },
    }
  } catch (error) {
    console.error('[VERIFY_RESOURCE] Error:', error)
    return {
      success: false,
      error: 'Error interno del servidor',
      code: 'PROCESSING_ERROR',
    }
  }
}

export default verifyResourceAction
