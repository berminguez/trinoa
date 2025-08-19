'use server'

import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/actions/auth/getUser'
import { getPayload } from 'payload'
import config from '@/payload.config'
import {
  calculateResourceConfidence,
  getConfidenceThreshold,
} from '@/lib/utils/calculateResourceConfidence'
import type { Resource, User } from '@/payload-types'

export interface UpdateResourceConfidenceResult {
  success: boolean
  data?: {
    id: string
    confidence: 'empty' | 'needs_revision' | 'trusted' | 'verified'
    threshold: number
  }
  error?: string
  code?: 'UNAUTHENTICATED' | 'FORBIDDEN' | 'NOT_FOUND' | 'INVALID_INPUT' | 'PROCESSING_ERROR'
}

/**
 * Actualiza automáticamente el campo confidence de un recurso
 * basándose en los valores de confianza de sus campos analizados
 */
export async function updateResourceConfidence(
  resourceId: string,
): Promise<UpdateResourceConfidenceResult> {
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
        code: 'INVALID_INPUT',
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
        error: 'No tienes permisos para actualizar este recurso',
        code: 'FORBIDDEN',
      }
    }

    // 6) Cargar lista de campos obligatorios desde field-translations
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
      console.warn('[UPDATE_RESOURCE_CONFIDENCE] No se pudieron cargar campos obligatorios', e)
    }

    // 7) Calcular nuevo estado de confidence considerando obligatoriedad
    const newConfidence = calculateResourceConfidence(resource, threshold, {
      requiredFieldNames,
    })

    // 8) Solo actualizar si el valor ha cambiado
    if (resource.confidence === newConfidence) {
      return {
        success: true,
        data: {
          id: resourceId,
          confidence: newConfidence,
          threshold,
        },
      }
    }

    // 9) Actualizar el recurso con el nuevo confidence
    const updated = (await payload.update({
      collection: 'resources',
      id: resourceId,
      data: {
        confidence: newConfidence,
        // Auditoría de actualización
        lastUpdatedBy: user.id,
      },
      user,
    })) as Resource

    // 10) Revalidar rutas que podrían mostrar este recurso
    try {
      const projectId = typeof project === 'object' ? project.id : project
      revalidatePath(`/projects/${projectId}`)
      revalidatePath(`/projects/${projectId}/resource/${resourceId}`)
    } catch (revalidateError) {
      console.warn('[UPDATE_RESOURCE_CONFIDENCE] Failed to revalidate paths', revalidateError)
    }

    console.log(
      `[UPDATE_RESOURCE_CONFIDENCE] Resource ${resourceId} confidence updated: ${resource.confidence} → ${newConfidence}`,
    )

    return {
      success: true,
      data: {
        id: updated.id,
        confidence: newConfidence,
        threshold,
      },
    }
  } catch (error) {
    console.error('[UPDATE_RESOURCE_CONFIDENCE] Error:', error)
    return {
      success: false,
      error: 'Error interno del servidor al actualizar confidence',
      code: 'PROCESSING_ERROR',
    }
  }
}

/**
 * Función helper para actualizar confidence de múltiples recursos
 * Útil para migraciones o actualizaciones masivas
 */
export async function updateMultipleResourcesConfidence(resourceIds: string[]): Promise<{
  success: boolean
  processed: number
  errors: string[]
  results: Array<{ id: string; confidence: string; success: boolean }>
}> {
  const results: Array<{ id: string; confidence: string; success: boolean }> = []
  const errors: string[] = []
  let processed = 0

  for (const resourceId of resourceIds) {
    try {
      const result = await updateResourceConfidence(resourceId)
      if (result.success && result.data) {
        results.push({
          id: resourceId,
          confidence: result.data.confidence,
          success: true,
        })
        processed++
      } else {
        results.push({
          id: resourceId,
          confidence: 'error',
          success: false,
        })
        errors.push(`${resourceId}: ${result.error}`)
      }
    } catch (error) {
      results.push({
        id: resourceId,
        confidence: 'error',
        success: false,
      })
      errors.push(`${resourceId}: Error inesperado`)
    }
  }

  return {
    success: errors.length === 0,
    processed,
    errors,
    results,
  }
}

export default updateResourceConfidence
