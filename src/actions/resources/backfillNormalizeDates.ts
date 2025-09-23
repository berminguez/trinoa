'use server'

import { getPayload } from 'payload'
import config from '@/payload.config'
import { parseAndFormatDate } from '@/utils/dateParser'
import type { Resource } from '@/payload-types'

export interface BackfillResult {
  success: boolean
  totalScanned: number
  totalUpdated: number
  pages: number
  error?: string
}

export async function backfillNormalizeDatesAction(params?: {
  projectId?: string
  batchSize?: number
  maxPages?: number
  dryRun?: boolean
}): Promise<BackfillResult> {
  const batchSize = Math.max(1, Math.min(params?.batchSize ?? 50, 200))
  const maxPages = Math.max(1, params?.maxPages ?? 1000)
  const dryRun = !!params?.dryRun

  const payload = await getPayload({ config })

  let page = 1
  let totalScanned = 0
  let totalUpdated = 0

  try {
    for (; page <= maxPages; page++) {
      const where: any = {}
      if (params?.projectId) where.project = { equals: params.projectId }

      const result = (await payload.find({
        collection: 'resources',
        where,
        limit: batchSize,
        page,
        depth: 0,
      })) as { docs: Resource[]; totalDocs: number; totalPages: number }

      const docs = result?.docs || []
      if (!docs.length) break

      for (const doc of docs) {
        totalScanned++
        const ar: any = (doc as any).analyzeResult
        const fieldsObj: Record<string, any> | undefined = ar?.fields
        if (!fieldsObj || typeof fieldsObj !== 'object') continue

        const keys = Object.keys(fieldsObj)
        if (!keys.length) continue

        const translations = await payload.find({
          collection: 'field-translations' as any,
          where: { key: { in: keys } },
          limit: 1000,
          depth: 0,
        } as any)

        const tdocs = Array.isArray((translations as any)?.docs) ? (translations as any).docs : []
        const dateKeysArray: string[] = (tdocs as any[])
          .filter(
            (d: any) =>
              typeof d?.valueType === 'string' && d.valueType.trim().toLowerCase() === 'date',
          )
          .map((d: any) => String(d.key))
          .filter((s: string) => !!s)
        const dateKeys = new Set<string>(dateKeysArray)
        if (!dateKeys.size) continue

        const f: Record<string, any> = fieldsObj || {}
        let changed = false
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
            changed = true
          }
        }

        if (changed) {
          if (!dryRun) {
            await payload.update({
              collection: 'resources',
              id: String((doc as any).id),
              data: { analyzeResult: { ...(ar || {}), fields: f } },
            })
          }
          totalUpdated++
        }
      }

      if (page >= (result as any)?.totalPages) break
    }

    return { success: true, totalScanned, totalUpdated, pages: page - 1 }
  } catch (error) {
    console.error('[BACKFILL] normalize dates failed:', error)
    return {
      success: false,
      totalScanned,
      totalUpdated,
      pages: page - 1,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export default backfillNormalizeDatesAction
