'use server'

import { getPayload } from 'payload'
import config from '@payload-config'
import { getCurrentUser } from '@/actions/auth/getUser'
import type { Media, PreResource } from '@/payload-types'
import { StorageManager } from '@/lib/storage'

interface ProcessPreResourceInput {
  preResourceId: string
}

interface ProcessPreResourceResult {
  success: boolean
  data?: { pages: number[] }
  error?: string
}

export async function processPreResource(
  input: ProcessPreResourceInput,
): Promise<ProcessPreResourceResult> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Usuario no autenticado' }

    const payload = await getPayload({ config })
    const pre = (await payload.findByID({
      collection: 'pre-resources',
      id: input.preResourceId,
    })) as PreResource
    if (!pre) return { success: false, error: 'Pre-resource no encontrado' }

    // Cambiar estado a processing
    await payload.update({
      collection: 'pre-resources',
      id: pre.id,
      data: { status: 'processing', lastUpdatedBy: user.id },
      overrideAccess: true,
    })

    // Obtener URL firmada de lectura del PDF
    const mediaId =
      typeof (pre as any).file === 'string' ? (pre as any).file : (pre as any).file?.id
    const media = (await payload.findByID({ collection: 'media', id: String(mediaId) })) as Media
    const key = (media as any)?.filename as string | undefined
    if (!key) {
      await payload.update({
        collection: 'pre-resources',
        id: pre.id,
        data: { status: 'error', error: 'Media sin filename' },
      })
      return { success: false, error: 'Media sin filename' }
    }
    const fileUrl = await StorageManager.getSplitterReadUrl(key, 1800)

    // Leer configuración global del Splitter
    const cfg: any = await payload.findGlobal({
      slug: 'configuracion' as any,
      depth: 0,
      overrideAccess: true,
    } as any)
    const splitter = cfg?.splitter || {}
    const endpointUrl: string | undefined = splitter?.url
    const method = 'POST'
    const bearer: string | undefined = splitter?.bearerToken || cfg?.automationEndpoint?.bearerToken
    if (!endpointUrl) {
      await payload.update({
        collection: 'pre-resources',
        id: pre.id,
        data: { status: 'error', error: 'Splitter URL no configurada' },
      })
      return { success: false, error: 'Splitter URL no configurada' }
    }

    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (bearer) headers['Authorization'] = `Bearer ${bearer}`

    // Llamada al Splitter
    const res = await fetch(endpointUrl, {
      method,
      headers,
      body: JSON.stringify({ url: fileUrl }),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      await payload.update({
        collection: 'pre-resources',
        id: pre.id,
        data: { status: 'error', error: `HTTP ${res.status}: ${text?.slice(0, 200)}` },
      })
      return { success: false, error: 'Splitter HTTP error' }
    }

    const json = (await res.json().catch(() => null)) as { pages?: unknown } | null
    const pages = Array.isArray(json?.pages)
      ? (json!.pages as unknown[]).map((n) => Number(n)).filter((n) => Number.isFinite(n) && n > 0)
      : null
    if (!pages || pages.length === 0) {
      await payload.update({
        collection: 'pre-resources',
        id: pre.id,
        data: { status: 'error', error: 'Respuesta del Splitter inválida o vacía' },
      })
      return { success: false, error: 'Respuesta del Splitter inválida' }
    }

    // Guardar respuesta en pre-resource
    await payload.update({
      collection: 'pre-resources',
      id: pre.id,
      data: {
        status: 'processing',
        splitterResponse: { pages: pages.map((p) => ({ page: p })) },
        lastUpdatedBy: user.id,
      },
      overrideAccess: true,
    })

    return { success: true, data: { pages } }
  } catch (error) {
    console.error('[SPLITTER] processPreResource error:', error)
    return { success: false, error: 'Error procesando pre-resource' }
  }
}
