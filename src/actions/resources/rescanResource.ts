'use server'

import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/actions/auth/getUser'
import { getPayload } from 'payload'
import config from '@/payload.config'
import type { Media, Project, Resource, User } from '@/payload-types'
import { StorageManager } from '@/lib/storage'

export interface RescanResourceResult {
  success: boolean
  error?: string
}

/**
 * Relanza el webhook de análisis para un recurso existente con los valores
 * actuales de caso/tipo y una URL firmada del archivo en S3.
 */
export async function rescanResourceAction(
  projectId: string,
  resourceId: string,
  params: { caso?: string | null; tipo?: string | null } = {},
): Promise<RescanResourceResult> {
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
      depth: 1,
      user,
    })) as Resource | null
    if (!resource) return { success: false, error: 'Recurso no encontrado' }
    const resourceProjectId =
      typeof resource.project === 'object' ? resource.project.id : resource.project
    if (String(resourceProjectId) !== String(projectId)) {
      return { success: false, error: 'El recurso no pertenece al proyecto' }
    }

    // Cargar media para firmar URL
    const media =
      typeof resource.file === 'string'
        ? ((await payload.findByID({ collection: 'media', id: resource.file })) as Media | null)
        : (resource.file as Media | null)
    if (!media) return { success: false, error: 'Archivo del recurso no disponible' }

    let fileUrl: string | undefined
    const s3Key = (media as any)?.filename as string | undefined
    if (s3Key) {
      try {
        fileUrl = await StorageManager.getSignedUrl(s3Key, 3600)
      } catch (e) {
        console.warn('[RESCAN] No se pudo firmar URL S3, se usará url pública si existe', e)
      }
    }
    if (!fileUrl) {
      const rawUrl = (media as any)?.url as string | undefined
      if (rawUrl) fileUrl = String(rawUrl)
    }
    if (!fileUrl) return { success: false, error: 'No se pudo obtener URL del archivo' }

    // Actualizar estado a processing y opcionalmente caso/tipo
    const updateData: Partial<Resource> = {
      status: 'processing' as Resource['status'],
      startedAt: (resource as any).startedAt || new Date().toISOString(),
      lastUpdatedBy: (user as User).id,
      logs: [
        ...(((resource as any).logs as any[]) || []),
        {
          step: 'rescan-request',
          status: 'started',
          at: new Date().toISOString(),
          details: 'Rescan solicitado por usuario',
          data: { byUserId: (user as User).id },
        },
      ],
    }
    if (typeof params.caso === 'string' || params.caso === null)
      updateData.caso = params.caso as any
    if (typeof params.tipo === 'string' || params.tipo === null)
      updateData.tipo = params.tipo as any

    const updated = (await payload.update({
      collection: 'resources',
      id: resourceId,
      data: updateData,
      user,
      depth: 0,
      overrideAccess: true,
    })) as Resource

    // Leer configuración global para webhook
    const configuracion: any = await payload.findGlobal({
      slug: 'configuracion' as any,
      depth: 0,
      overrideAccess: true,
    } as any)
    const automation = configuracion?.automationEndpoint
    if (!automation || !automation.enabled || !automation.url) {
      console.log('[RESCAN] Webhook deshabilitado o sin URL; solo se actualizó el estado')
      try {
        revalidatePath(`/projects/${projectId}/resource/${resourceId}`)
      } catch {}
      return { success: true }
    }

    const method = String(automation.httpMethod || 'POST').toUpperCase()
    const url = String(automation.url)
    const headers: Record<string, string> = {
      'User-Agent': 'Trinoa-Automation/1.0',
      Accept: 'application/json',
    }
    if (automation?.bearerToken) headers['Authorization'] = String(automation.bearerToken)
    if (Array.isArray(automation.extraHeaders)) {
      for (const h of automation.extraHeaders) {
        if (h?.key && typeof h.key === 'string') headers[h.key] = String(h.value ?? '')
      }
    }

    let fetchUrl = url
    const init: RequestInit = { method }
    if (method === 'GET') {
      const u = new URL(url)
      u.searchParams.set('event', 'resource.rescan')
      u.searchParams.set('resourceId', String(updated.id))
      u.searchParams.set('namespace', String((updated as any).namespace || ''))
      u.searchParams.set('type', String((updated as any).type || ''))
      u.searchParams.set('fileUrl', String(fileUrl))
      if (params?.caso) u.searchParams.set('caso', String(params.caso))
      if (params?.tipo) u.searchParams.set('tipo', String(params.tipo))
      fetchUrl = u.toString()
    } else {
      headers['Content-Type'] = 'application/json'
      const minimalFile = {
        filename: (media as any)?.filename,
        filesize: (media as any)?.filesize,
        mimeType: (media as any)?.mimeType ?? (media as any)?.mime_type,
      }
      init.body = JSON.stringify({
        event: 'resource.rescan',
        resourceId: String(updated.id),
        namespace: String((updated as any).namespace || ''),
        type: String((updated as any).type || ''),
        fileUrl,
        file: minimalFile,
        caso: params?.caso ?? (updated as any)?.caso,
        tipo: params?.tipo ?? (updated as any)?.tipo,
      })
    }
    init.headers = headers

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 10000)
    ;(init as any).signal = controller.signal
    const res = await fetch(fetchUrl, init)
    clearTimeout(timer)

    const ok = res.ok
    const status = res.status

    // Leer respuesta y extraer executionId si existe
    let responseText = ''
    let executionId: string | null = null
    let executionUrl: string | null = null

    try {
      responseText = await res.text()
      console.log('[RESCAN] Webhook response text:', responseText)

      // Intentar extraer executionId de la respuesta de n8n
      if (ok && responseText) {
        try {
          const responseJson = JSON.parse(responseText)

          executionId =
            responseJson?.executionId ||
            responseJson?.data?.executionId ||
            responseJson?.execution?.id ||
            null

          executionUrl =
            responseJson?.executionUrl ||
            responseJson?.data?.executionUrl ||
            responseJson?.execution?.url ||
            null

          if (executionId) {
            console.log(`[RESCAN] Extracted executionId from n8n response: ${executionId}`)
          }
        } catch (parseError) {
          console.warn('[RESCAN] Could not parse webhook response as JSON:', parseError)
        }
      }
    } catch (responseError) {
      console.warn('[RESCAN] Error reading response:', responseError)
    }

    // Añadir log según resultado y actualizar executionId si existe
    try {
      const current = (await payload.findByID({
        collection: 'resources',
        id: String(updated.id),
      })) as Resource
      const currentLogs = Array.isArray((current as any).logs) ? (current as any).logs : []
      const newLog = {
        step: 'rescan-webhook',
        status: ok ? ('success' as const) : ('error' as const),
        at: new Date().toISOString(),
        details: ok
          ? `Webhook re-scan enviado correctamente (status ${status})${executionId ? ` - ExecutionId: ${executionId}` : ''}`
          : `Webhook re-scan falló (status ${status})`,
        data: {
          status,
          responsePreview: responseText?.slice(0, 300),
          executionId: executionId || null,
          executionUrl: executionUrl || null,
        },
      }

      // Preparar datos de actualización
      const updateData: any = {
        logs: [...currentLogs, newLog],
      }

      // Si tenemos executionId, añadirlo al recurso
      if (executionId) {
        updateData.executionId = executionId
        console.log(`[RESCAN] Adding executionId ${executionId} to resource ${updated.id}`)
      }

      await payload.update({
        collection: 'resources',
        id: String(updated.id),
        data: updateData,
        overrideAccess: true,
      })
    } catch {}

    try {
      revalidatePath(`/projects/${projectId}/resource/${resourceId}`)
    } catch {}

    return { success: true }
  } catch (error) {
    console.error('[RESCAN] Error:', error)
    return { success: false, error: 'Error interno' }
  }
}

export default rescanResourceAction
