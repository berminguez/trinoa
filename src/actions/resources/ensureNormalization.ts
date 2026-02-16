'use server'

import { getPayload } from 'payload'
import config from '@/payload.config'
import type { Resource } from '@/payload-types'
import { parseAndFormatDate } from '@/utils/dateParser'
import { normalizeNumericString } from '@/lib/utils/number-normalization'

interface Result {
  success: boolean
  updated?: boolean
  changes?: number
  error?: string
}

/**
 * Normaliza en BD (persistente) los campos de analyzeResult de un recurso:
 * - Fechas: usa parseAndFormatDate sobre value/valueString/content
 * - Numéricos: elimina símbolos y preserva decimales (coma/punto → punto)
 * Sólo limpia campos marcados como 'numeric' en field-translations.
 */
export async function ensureNormalization(resourceId: string): Promise<Result> {
  try {
    const payload = await getPayload({ config })

    const resource = (await payload.findByID({
      collection: 'resources',
      id: resourceId,
      depth: 0,
    })) as Resource

    const ar: any = (resource as any)?.analyzeResult
    const fieldsObj: Record<string, any> | undefined = ar?.fields
    if (!fieldsObj || typeof fieldsObj !== 'object') {
      return { success: true, updated: false, changes: 0 }
    }

    const keys = Object.keys(fieldsObj)
    if (!keys.length) return { success: true, updated: false, changes: 0 }

    // Cargar tipos desde field-translations
    const translations = await payload.find({
      collection: 'field-translations' as any,
      where: { key: { in: keys } },
      limit: 1000,
      depth: 0,
    } as any)
    const tdocs = Array.isArray((translations as any)?.docs) ? (translations as any).docs : []

    const dateKeys = new Set<string>(
      (tdocs as any[])
        .filter(
          (d: any) =>
            typeof d?.valueType === 'string' && d.valueType.trim().toLowerCase() === 'date',
        )
        .map((d: any) => String(d.key))
        .filter((s: string) => !!s),
    )

    const numericKeys = new Set<string>(
      (tdocs as any[])
        .filter(
          (d: any) =>
            typeof d?.valueType === 'string' && d.valueType.trim().toLowerCase() === 'numeric',
        )
        .map((d: any) => String(d.key))
        .filter((s: string) => !!s),
    )

    // No inferencia numérica: solo los definidos como 'numeric'.

    if (!dateKeys.size && !numericKeys.size) {
      return { success: true, updated: false, changes: 0 }
    }

    const f: Record<string, any> = fieldsObj || {}
    let changes = 0

    // Normalizar fechas
    for (const dk of dateKeys) {
      const field = f[dk]
      if (!field || typeof field !== 'object') continue
      const candidates = [
        typeof field.value === 'string' ? field.value : '',
        typeof field.valueString === 'string' ? field.valueString : '',
        typeof field.content === 'string' ? field.content : '',
      ].filter((s) => s && s.trim()) as string[]
      const original = candidates.length > 0 ? candidates[0] : ''
      if (!original) continue
      const formatted = parseAndFormatDate(original)
      if (formatted && formatted !== original) {
        const updatedField: Record<string, any> = { ...(field || {}) }
        updatedField.value = formatted
        updatedField.valueString = formatted
        updatedField.content = formatted
        f[dk] = updatedField
        changes++
      }
    }

    // Normalizar numéricos con preservación de decimales (coma/punto → punto)
    // Función de normalización numérica movida a src/lib/utils/number-normalization.ts

    for (const nk of numericKeys) {
      const field = f[nk]
      if (!field || typeof field !== 'object') continue
      const candidates = [
        typeof field.value === 'string' ? field.value : '',
        typeof field.valueString === 'string' ? field.valueString : '',
        typeof field.content === 'string' ? field.content : '',
      ].filter((s) => s && s.trim()) as string[]
      const original = candidates.length > 0 ? candidates[0] : ''
      if (!original) continue
      const cleaned = normalizeNumericString(original)
      if (cleaned !== original) {
        const updatedField: Record<string, any> = { ...(field || {}) }
        updatedField.value = cleaned
        updatedField.valueString = cleaned
        updatedField.content = cleaned
        f[nk] = updatedField
        changes++
      }
    }

    if (!changes) return { success: true, updated: false, changes: 0 }

    await payload.update({
      collection: 'resources',
      id: resourceId,
      data: { analyzeResult: { ...(ar || {}), fields: f } },
    })

    return { success: true, updated: true, changes }
  } catch (error) {
    console.error('[ENSURE_NORMALIZATION] failed:', error)
    return { success: false, error: 'Normalization failed' }
  }
}

export default ensureNormalization
