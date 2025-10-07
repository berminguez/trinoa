'use server'

import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/actions/auth/getUser'
import { getPayload } from 'payload'
import config from '@/payload.config'
import type { Project, Resource, User } from '@/payload-types'
import { parseAndFormatDate } from '@/utils/dateParser'

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
  options?: { skipRevalidate?: boolean },
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

    // Título editable inline
    if (typeof updates?.title === 'string' && updates.title.trim().length > 0) {
      updateData.title = updates.title.trim()
    }

    // Campos globales permitidos
    if (typeof updates?.nombre_cliente === 'string') {
      updateData.nombre_cliente = updates.nombre_cliente
    }
    if (typeof updates?.caso === 'string' || updates?.caso === null) {
      // Payload validará el valor permitido
      updateData.caso = updates.caso
    }
    if (typeof updates?.tipo === 'string' || updates?.tipo === null) {
      updateData.tipo = updates.tipo
    }

    // analyzeResult (permitir edición directa de JSON) + normalización de fechas según field-translations
    if (typeof updates?.analyzeResult !== 'undefined') {
      try {
        console.log(
          '[UPDATE_RESOURCE] analyzeResult keys:',
          updates?.analyzeResult?.fields
            ? Object.keys(updates.analyzeResult.fields || {}).length
            : 0,
        )
      } catch {}
      let normalizedAnalyze = updates.analyzeResult
      try {
        const fieldsObj = updates?.analyzeResult?.fields
        if (fieldsObj && typeof fieldsObj === 'object') {
          const keys = Object.keys(fieldsObj)
          if (keys.length > 0) {
            const translations = await payload.find({
              collection: 'field-translations' as any,
              where: { key: { in: keys } },
              limit: 1000,
              depth: 0,
              user,
            } as any)
            const docs = Array.isArray((translations as any)?.docs)
              ? (translations as any).docs
              : []
            const dateKeysArray: string[] = (docs as any[])
              .filter(
                (d: any) =>
                  typeof d?.valueType === 'string' && d.valueType.trim().toLowerCase() === 'date',
              )
              .map((d: any) => String(d.key))
              .filter((s: string) => !!s)
            const dateKeys = new Set<string>(dateKeysArray)
            const numericKeysArray: string[] = (docs as any[])
              .filter(
                (d: any) =>
                  typeof d?.valueType === 'string' &&
                  d.valueType.trim().toLowerCase() === 'numeric',
              )
              .map((d: any) => String(d.key))
              .filter((s: string) => !!s)
            const numericKeys = new Set<string>(numericKeysArray)
            if (dateKeys.size > 0 || numericKeys.size > 0) {
              // Log de depuración
              if (dateKeys.size > 0)
                console.log('[UPDATE_RESOURCE] date valueType keys:', Array.from(dateKeys))
              if (numericKeys.size > 0)
                console.log('[UPDATE_RESOURCE] numeric valueType keys:', Array.from(numericKeys))
              const f: Record<string, any> = (fieldsObj as Record<string, any>) || {}
              let changed = false
              const normalizeNumericString = (orig: string): string => {
                let s = (orig || '').replace(/[\s€$]/g, '')
                let sign = ''
                if (s.startsWith('-')) {
                  sign = '-'
                  s = s.slice(1)
                }
                const hasComma = s.includes(',')
                const hasDot = s.includes('.')
                if (hasComma && hasDot) {
                  const decPos = Math.max(s.lastIndexOf(','), s.lastIndexOf('.'))
                  const intPart = s
                    .slice(0, decPos)
                    .replace(/[\.,]/g, '')
                    .replace(/[^0-9]/g, '')
                  const fracPart = s
                    .slice(decPos + 1)
                    .replace(/[\.,]/g, '')
                    .replace(/[^0-9]/g, '')
                  return sign + intPart + (fracPart ? '.' + fracPart : '')
                } else if (hasComma) {
                  const parts = s.split(',')
                  const intPart = parts[0].replace(/\./g, '').replace(/[^0-9]/g, '')
                  const fracPart = parts
                    .slice(1)
                    .join('')
                    .replace(/[^0-9]/g, '')
                  return sign + intPart + (fracPart ? '.' + fracPart : '')
                } else if (hasDot) {
                  const parts = s.split('.')
                  const intPart = [parts[0], ...parts.slice(1, -1)].join('').replace(/[^0-9]/g, '')
                  const fracPart = parts.slice(-1)[0].replace(/[^0-9]/g, '')
                  return sign + intPart + (fracPart ? '.' + fracPart : '')
                } else {
                  const digits = s.replace(/[^0-9]/g, '')
                  return sign + digits
                }
              }
              // Fechas
              for (const dk of dateKeys) {
                const field = f[dk]
                if (field && typeof field === 'object') {
                  const candidates = [
                    typeof field.value === 'string' ? field.value : '',
                    typeof field.valueString === 'string' ? field.valueString : '',
                    typeof field.content === 'string' ? field.content : '',
                  ].filter((s) => s && s.trim()) as string[]
                  const original = candidates.length > 0 ? candidates[0] : ''
                  if (original) {
                    const formatted = parseAndFormatDate(original)
                    console.log('[UPDATE_RESOURCE] Normalizing field', dk, { original, formatted })
                    if (formatted && formatted !== original) {
                      const updatedField: Record<string, any> = { ...(field || {}) }
                      updatedField.value = formatted
                      updatedField.valueString = formatted
                      updatedField.content = formatted
                      f[dk] = updatedField
                      changed = true
                    }
                  }
                }
              }
              // Numéricos: limpiar todo lo que no sea dígito
              for (const nk of numericKeys) {
                const field = f[nk]
                if (field && typeof field === 'object') {
                  const candidates = [
                    typeof field.value === 'string' ? field.value : '',
                    typeof field.valueString === 'string' ? field.valueString : '',
                    typeof field.content === 'string' ? field.content : '',
                  ].filter((s) => s && s.trim()) as string[]
                  const original = candidates.length > 0 ? candidates[0] : ''
                  if (original) {
                    const cleaned = normalizeNumericString(original)
                    if (cleaned !== original) {
                      const updatedField: Record<string, any> = { ...(field || {}) }
                      updatedField.value = cleaned
                      updatedField.valueString = cleaned
                      updatedField.content = cleaned
                      f[nk] = updatedField
                      changed = true
                    }
                  }
                }
              }
              if (changed) {
                normalizedAnalyze = { ...(updates.analyzeResult || {}), fields: f }
              }
            }
          }
        }
      } catch (e) {
        console.warn('[UPDATE_RESOURCE] Date normalization step failed:', e)
      }
      ;(updateData as any).analyzeResult = normalizedAnalyze
    }

    // Campo de documento erróneo
    if (typeof updates?.documentoErroneo === 'boolean') {
      updateData.documentoErroneo = updates.documentoErroneo
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
        lastUpdatedBy: user.id,
      },
      user,
    })) as Resource

    // Revalidar la ruta específica del recurso (se puede omitir)
    if (!options?.skipRevalidate) {
      try {
        revalidatePath(`/projects/${projectId}/resource/${resourceId}`)
      } catch (revalidateError) {
        console.warn('[UPDATE_RESOURCE] Failed to revalidate path', revalidateError)
      }
    }

    return { success: true, data: updated }
  } catch (error) {
    console.error('[UPDATE_RESOURCE] Error in validation stage:', error)
    return { success: false, error: 'Error interno del servidor', code: 'INVALID_INPUT' }
  }
}

export default updateResourceAction
