import type { CollectionConfig } from 'payload'
import { StorageManager } from '@/lib/storage'
import { analyzeInvoicePagesWithOpenAI } from '@/lib/pdf/openai-splitter'
import { splitPdfAndUpload } from '@/lib/pdf/pdf-splitter'

/**
 * Procesa el pipeline del splitter en background (fire and forget)
 * Contiene toda la lógica de análisis con OpenAI sin bloquear la respuesta inicial
 */
async function processSplitterPipeline(doc: any, req: any): Promise<void> {
  try {
    const pre: any = doc
    console.log('[PRE-RESOURCES] Starting splitter pipeline for:', String(pre.id))

    // 1) Obtener media y URL firmada
    const mediaId = typeof pre.file === 'string' ? pre.file : pre.file?.id
    if (!mediaId) {
      throw new Error('Media ID no encontrado en pre-resource')
    }

    const media = await req.payload.findByID({ collection: 'media', id: String(mediaId) })
    const s3Key = (media as any)?.filename as string | undefined
    if (!s3Key) {
      throw new Error('Media sin filename para generar URL firmada')
    }
    const fileUrl = await StorageManager.getSignedUrl(s3Key, 1800) // 30 min

    // 2) Analizar PDF con OpenAI GPT-4V (nuevo sistema)
    console.log('[PRE-RESOURCES] Starting OpenAI analysis...')
    const openaiResult = await analyzeInvoicePagesWithOpenAI(fileUrl)

    if (!openaiResult.success) {
      throw new Error(`OpenAI analysis failed: ${openaiResult.error}`)
    }

    const pages = openaiResult.pages!
    if (!pages || pages.length === 0) {
      throw new Error('OpenAI no detectó páginas de facturas válidas')
    }

    /* 
    // BACKUP: Sistema anterior con webhook externo (mantener para rollback)
    
    // 2) Leer configuración del Splitter
    const cfg: any = await req.payload.findGlobal({
      slug: 'configuracion' as any,
      depth: 0,
      overrideAccess: true,
    } as any)
    const splitter = cfg?.splitter || {}
    const endpointUrl: string | undefined = splitter?.url
    const bearer: string | undefined =
      splitter?.bearerToken || cfg?.automationEndpoint?.bearerToken

    if (!endpointUrl) {
      throw new Error('Splitter URL no configurada en Globals')
    }

    // 3) Llamar al Splitter con { url }
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (bearer) headers['Authorization'] = bearer

    console.log('[PRE-RESOURCES] Calling Splitter...', {
      endpointUrl,
      headers: Object.keys(headers),
      preResourceId: String(pre.id),
      fileUrlPreview: String(fileUrl).slice(0, 80),
    })

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 30000) // 30s timeout
    const res = await fetch(endpointUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ url: fileUrl }),
      signal: controller.signal,
    })
    clearTimeout(timer)

    const text = await res.text().catch(() => '')
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${text?.slice(0, 200)}`)
    }

    const json = JSON.parse(text) as { pages?: unknown } | null
    const pages = Array.isArray(json?.pages)
      ? (json!.pages as unknown[])
          .map((n) => Number(n))
          .filter((n) => Number.isFinite(n) && n > 0)
      : null

    if (!pages || pages.length === 0) {
      throw new Error('Respuesta del Splitter inválida o vacía')
    }
    */

    console.log('[PRE-RESOURCES] OpenAI analysis success:', {
      pages,
      usage: openaiResult.usage,
    })

    // 4) Actualizar pre-resource con logs y pages
    const currentLogs = Array.isArray(pre.logs) ? pre.logs : []
    const newLog = {
      step: 'openai-analysis',
      status: 'success' as const,
      at: new Date().toISOString(),
      details: `Análisis con OpenAI completado - ${pages.length} páginas detectadas`,
      data: {
        model: 'gpt-4o',
        pages,
        usage: openaiResult.usage,
        method: 'vision-analysis',
      },
    }

    const updateData: any = {
      status: 'processing',
      splitterResponse: { pages: pages.map((p) => ({ page: p })) },
      lastUpdatedBy: req.user?.id,
      logs: [...currentLogs, newLog],
    }

    await req.payload.update({
      collection: 'pre-resources',
      id: String(pre.id),
      data: updateData,
      overrideAccess: true,
    })

    // 5) Actualizar status a "splitting" antes de dividir PDF
    await req.payload.update({
      collection: 'pre-resources',
      id: String(pre.id),
      data: {
        status: 'splitting',
        lastUpdatedBy: req.user?.id,
        logs: [
          ...updateData.logs,
          {
            step: 'pdf-splitting-start',
            status: 'started' as const,
            at: new Date().toISOString(),
            details: 'Iniciando división del PDF en segmentos',
            data: { pagesDetected: pages.length },
          },
        ],
      },
      overrideAccess: true,
    })

    // 6) Dividir PDF en segmentos basándose en las páginas detectadas
    console.log('[PRE-RESOURCES] Iniciando división de PDF en segmentos...')

    try {
      // Obtener el filename original del media para generar nombres de segmentos
      const originalFilename = (media as any)?.filename || 'documento.pdf'

      // Dividir PDF y subir segmentos a S3
      const segmentMediaRecords = await splitPdfAndUpload(fileUrl, pages, originalFilename)

      console.log(
        '[PRE-RESOURCES] PDF dividido exitosamente en',
        segmentMediaRecords.length,
        'segmentos',
      )

      // 7) Crear resources derivados para cada segmento
      const derivedResourceIds: string[] = []

      for (let i = 0; i < segmentMediaRecords.length; i++) {
        const segmentMedia = segmentMediaRecords[i]
        const segmentTitle = `${(pre as any)?.title || 'Documento'} - Segmento ${i + 1}`

        // Crear el resource que apunta al media ya creado
        const projectId = typeof pre.project === 'object' ? pre.project.id : pre.project
        const namespace = `project-${projectId}-documents`

        const derivedResource = await req.payload.create({
          collection: 'resources',
          data: {
            title: segmentTitle,
            project: pre.project,
            user: pre.user,
            file: segmentMedia.id,
            status: 'pending',
            namespace: namespace,
            lastUpdatedBy: req.user?.id,
          },
          overrideAccess: true,
        })

        derivedResourceIds.push(String(derivedResource.id))

        console.log('[PRE-RESOURCES] Resource derivado creado:', {
          resourceId: derivedResource.id,
          mediaId: segmentMedia.id,
          filename: segmentMedia.filename,
          title: segmentTitle,
          namespace: namespace,
          projectId: projectId,
        })
      }

      // 8) Obtener logs actuales (incluyendo el log de splitting-start) y agregar log final
      const currentPreResource = await req.payload.findByID({
        collection: 'pre-resources',
        id: String(pre.id),
        overrideAccess: true,
      })
      const currentLogs = Array.isArray((currentPreResource as any).logs)
        ? (currentPreResource as any).logs
        : []

      const finalLogs = [
        ...currentLogs,
        {
          step: 'pdf-splitting',
          status: 'success' as const,
          at: new Date().toISOString(),
          details: `PDF dividido en ${segmentMediaRecords.length} segmentos y resources creados`,
          data: {
            segmentsCreated: segmentMediaRecords.length,
            segmentMediaIds: segmentMediaRecords.map((m) => m.id),
            derivedResourceIds,
          },
        },
      ]

      await req.payload.update({
        collection: 'pre-resources',
        id: String(pre.id),
        data: {
          status: 'done',
          derivedResourceIds: derivedResourceIds.map((id) => ({ resourceId: id })),
          lastUpdatedBy: req.user?.id,
          logs: finalLogs,
        },
        overrideAccess: true,
      })

      console.log('[PRE-RESOURCES] Pipeline completado exitosamente:', {
        preResourceId: String(pre.id),
        derivedResourcesCount: derivedResourceIds.length,
        derivedResourceIds,
      })
    } catch (splittingError) {
      console.error('[PRE-RESOURCES] Error durante la división de PDF:', splittingError)

      // Actualizar con error de splitting pero mantener el análisis exitoso
      // Obtener logs actuales para incluir todos los pasos previos
      const currentPreResourceForError = await req.payload.findByID({
        collection: 'pre-resources',
        id: String(pre.id),
        overrideAccess: true,
      })
      const currentLogsForError = Array.isArray((currentPreResourceForError as any).logs)
        ? (currentPreResourceForError as any).logs
        : []

      const errorLogs = [
        ...currentLogsForError,
        {
          step: 'pdf-splitting',
          status: 'error' as const,
          at: new Date().toISOString(),
          details: 'Error al dividir PDF o crear resources derivados',
          data: { error: String(splittingError) },
        },
      ]

      await req.payload.update({
        collection: 'pre-resources',
        id: String(pre.id),
        data: {
          status: 'error',
          error: `Error en división de PDF: ${String(splittingError)}`,
          logs: errorLogs,
          lastUpdatedBy: req.user?.id,
        },
        overrideAccess: true,
      })
    }
  } catch (error) {
    // No interrumpir el flujo por errores del análisis; solo loggear (igual que Resources.ts)
    console.error('[PRE-RESOURCES] Exception while analyzing with OpenAI:', error)
    try {
      const current = await req.payload.findByID({
        collection: 'pre-resources',
        id: String(doc.id),
      })
      const currentLogs = Array.isArray((current as any).logs) ? (current as any).logs : []
      const errLog = {
        step: 'openai-analysis',
        status: 'error' as const,
        at: new Date().toISOString(),
        details: 'Excepción al analizar con OpenAI',
        data: { error: String(error) },
      }
      await req.payload.update({
        collection: 'pre-resources',
        id: String(doc.id),
        data: {
          status: 'error',
          error: String(error),
          logs: [...currentLogs, errLog],
        },
        overrideAccess: true,
      })
    } catch (updateError) {
      console.error('[PRE-RESOURCES] Error updating after OpenAI exception:', updateError)
    }
  }
}

export const PreResources: CollectionConfig = {
  slug: 'pre-resources',
  access: {
    read: ({ req: { user } }) => {
      // Solo visible desde el admin (admins)
      return Boolean(user && user.role === 'admin')
    },
    create: ({ req: { user } }) => {
      // Permitir creación desde server actions (requiere usuario autenticado)
      return Boolean(user)
    },
    update: ({ req: { user } }) => Boolean(user && user.role === 'admin'),
    delete: ({ req: { user } }) => Boolean(user && user.role === 'admin'),
  },
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['project', 'user', 'status', 'createdAt'],
    listSearchableFields: ['status'],
    description: 'Registros temporales de documentos multi‑factura para división (solo admin).',
  },
  fields: [
    {
      name: 'project',
      type: 'relationship',
      relationTo: 'projects' as any,
      required: true,
      hasMany: false,
      index: true,
      admin: { description: 'Proyecto destino para los resources derivados', position: 'sidebar' },
    },
    {
      name: 'logs',
      type: 'array',
      admin: {
        description: 'Logs del proceso Splitter para diagnóstico',
        readOnly: true,
      },
      labels: { singular: 'Log', plural: 'Logs' },
      fields: [
        { name: 'step', type: 'text', required: true },
        {
          name: 'status',
          type: 'select',
          required: true,
          options: [
            { label: 'Iniciado', value: 'started' },
            { label: 'En progreso', value: 'progress' },
            { label: 'Completado', value: 'success' },
            { label: 'Fallido', value: 'error' },
          ],
        },
        {
          name: 'at',
          type: 'date',
          required: true,
          admin: { date: { pickerAppearance: 'dayAndTime' } },
        },
        { name: 'details', type: 'textarea' },
        { name: 'data', type: 'json' },
      ],
    },
    {
      name: 'retry',
      type: 'ui',
      admin: {
        position: 'sidebar',
        components: {
          Field: {
            path: '@/payload-admin/RetryPreResourceButton#RetryPreResourceButton',
          } as any,
        },
        condition: (data) => data?.status === 'error',
      },
    },
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users' as any,
      required: true,
      admin: { description: 'Usuario que inició el proceso', position: 'sidebar' },
    },
    {
      name: 'file',
      type: 'relationship',
      relationTo: 'media',
      required: true,
      admin: { description: 'Archivo PDF original subido', position: 'sidebar' },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      options: [
        { label: 'Pendiente', value: 'pending' },
        { label: 'Procesando', value: 'processing' },
        { label: 'Dividiendo PDF', value: 'splitting' },
        { label: 'Error', value: 'error' },
        { label: 'Listo', value: 'done' },
      ],
      admin: { description: 'Estado de procesamiento del pre‑resource', position: 'sidebar' },
    },
    {
      name: 'splitterResponse',
      label: 'Splitter Response',
      type: 'group',
      admin: { description: 'Respuesta del Splitter utilizada para dividir el PDF' },
      fields: [
        {
          name: 'pages',
          type: 'array',
          labels: { singular: 'Página', plural: 'Páginas' },
          admin: { description: 'Índices 1‑based de primeras páginas de cada factura' },
          fields: [
            {
              name: 'page',
              type: 'number',
              required: true,
            },
          ],
        },
      ],
    },
    {
      name: 'error',
      type: 'textarea',
      admin: { description: 'Mensaje de error (si falla endpoint o validación de pages)' },
    },
    {
      name: 'derivedResourceIds',
      type: 'array',
      labels: { singular: 'Resource ID', plural: 'Resource IDs' },
      admin: { description: 'IDs de resources creados a partir de este pre‑resource' },
      fields: [{ name: 'resourceId', type: 'text', required: true }],
    },
    {
      name: 'lastUpdatedBy',
      label: 'Última actualización por',
      type: 'relationship',
      relationTo: 'users' as any,
      admin: { position: 'sidebar', description: 'Gestionado automáticamente por el sistema' },
    },
  ],
  hooks: {
    afterChange: [
      ({ doc, operation, req }) => {
        // Hook de splitter: ejecutar pipeline en background (fire and forget)
        if (operation === 'create') {
          // Ejecutar el pipeline en background sin bloquear la respuesta
          Promise.resolve().then(async () => {
            await processSplitterPipeline(doc, req)
          })
        }
      },
    ],
  },
}
