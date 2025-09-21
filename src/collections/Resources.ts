import { createAuthErrorResponse } from '../lib/auth'
import { PineconeManager } from '../lib/pinecone'
import { StorageManager } from '../lib/storage'

import type { Media } from '../types'
import { mapAnalyzeResultToResource } from '../lib/analyze-mappers'
import {
  calculateResourceConfidence,
  getConfidenceThreshold,
} from '../lib/utils/calculateResourceConfidence'
import type { CollectionConfig } from 'payload'

// Función auxiliar para generar códigos únicos sin race conditions
async function generateUniqueCode(empresaId: string, payload: any): Promise<string> {
  // Obtener información de la empresa
  const empresa = await payload.findByID({
    collection: 'companies',
    id: empresaId,
    depth: 0,
  })

  if (!empresa || !empresa.code) {
    throw new Error('No se pudo obtener el código de la empresa')
  }

  const empresaCode = empresa.code.toUpperCase()

  // NUEVA LÓGICA: Buscar TODOS los códigos existentes para esta empresa
  const existingCodes = await payload.find({
    collection: 'resources',
    where: {
      empresa: {
        equals: empresaId,
      },
      codigo: {
        like: `${empresaCode}-`,
      },
    },
    select: {
      codigo: true,
    },
    limit: 0, // Sin límite para obtener todos los códigos
    sort: 'codigo',
    depth: 0,
  })

  // Extraer números de secuencia y convertir a decimal
  const usedNumbers = existingCodes.docs
    .map((doc: any) => doc.codigo?.split('-')[1])
    .filter(Boolean)
    .map((seq: string) => parseInt(seq, 36))
    .filter((num: number) => !isNaN(num))
    .sort((a: number, b: number) => a - b)

  // Encontrar el primer número disponible (manejo de huecos)
  let nextNumber = 1
  for (const num of usedNumbers) {
    if (num === nextNumber) {
      nextNumber++
    } else {
      // Encontramos un hueco o llegamos al final
      break
    }
  }

  // Convertir de vuelta a base 36 y generar código
  const nextSequence = nextNumber.toString(36).toUpperCase().padStart(4, '0')
  const newCode = `${empresaCode}-${nextSequence}`

  console.log(
    `[RESOURCES] Código generado automáticamente: ${newCode} (número: ${nextNumber}, empresa: ${empresaCode})`,
  )
  return newCode
}

// Función para generar múltiples códigos únicos en lote (sin race conditions)
export async function generateMultipleCodes(
  empresaId: string,
  count: number,
  payload: any,
): Promise<string[]> {
  if (count <= 0) return []

  // Obtener información de la empresa
  const empresa = await payload.findByID({
    collection: 'companies',
    id: empresaId,
    depth: 0,
  })

  if (!empresa || !empresa.code) {
    throw new Error('No se pudo obtener el código de la empresa')
  }

  const empresaCode = empresa.code.toUpperCase()

  // Buscar TODOS los códigos existentes para esta empresa
  const existingCodes = await payload.find({
    collection: 'resources',
    where: {
      empresa: {
        equals: empresaId,
      },
      codigo: {
        like: `${empresaCode}-`,
      },
    },
    select: {
      codigo: true,
    },
    limit: 0, // Sin límite para obtener todos los códigos
    sort: 'codigo',
    depth: 0,
  })

  // Extraer números de secuencia y convertir a decimal
  const usedNumbers = existingCodes.docs
    .map((doc: any) => doc.codigo?.split('-')[1])
    .filter(Boolean)
    .map((seq: string) => parseInt(seq, 36))
    .filter((num: number) => !isNaN(num))
    .sort((a: number, b: number) => a - b)

  // Generar secuencia de códigos consecutivos
  const newCodes: string[] = []
  let nextNumber = 1

  // Encontrar el primer número disponible
  for (const num of usedNumbers) {
    if (num === nextNumber) {
      nextNumber++
    } else {
      break
    }
  }

  // Generar los códigos solicitados de forma consecutiva
  for (let i = 0; i < count; i++) {
    // Verificar que el número no esté en uso (por si acaso)
    while (usedNumbers.includes(nextNumber)) {
      nextNumber++
    }

    const nextSequence = nextNumber.toString(36).toUpperCase().padStart(4, '0')
    const newCode = `${empresaCode}-${nextSequence}`
    newCodes.push(newCode)

    // Añadir este número a la lista de usados para evitar duplicados en el lote
    usedNumbers.push(nextNumber)
    usedNumbers.sort((a: number, b: number) => a - b)

    nextNumber++
  }

  console.log(
    `[RESOURCES] Generados ${count} códigos automáticamente para empresa ${empresaCode}:`,
    newCodes,
  )

  return newCodes
}

export const Resources: CollectionConfig = {
  slug: 'resources',
  access: {
    read: () => true,
    create: () => true,
    update: () => true,
    delete: () => true,
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: [
      'title',
      'project',
      'empresa',
      'codigo',
      'namespace',
      'type',
      'status',
      'confidence',
      'executionId',
      'progress',
      'updatedAt',
    ],
    listSearchableFields: ['title', 'namespace', 'description'],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      admin: {
        description: 'Título descriptivo del recurso',
      },
    },
    {
      name: 'project',
      type: 'relationship',
      relationTo: 'projects' as any, // Temporalmente evitar error de tipado hasta regenerar tipos
      required: true,
      hasMany: false,
      index: true,
      admin: {
        description: 'Proyecto al que pertenece este recurso (para organización temática)',
        position: 'sidebar',
      },
      validate: (value: any) => {
        if (!value) {
          return 'El recurso debe estar asociado a un proyecto'
        }
        return true
      },
    },
    {
      name: 'empresa',
      type: 'relationship',
      relationTo: 'companies',
      required: true,
      admin: {
        description: 'Empresa a la que pertenece este recurso',
        position: 'sidebar',
      },
      validate: (value: any) => {
        if (!value) {
          return 'El recurso debe estar asociado a una empresa'
        }
        return true
      },
    },
    {
      name: 'codigo',
      type: 'text',
      required: false, // Se genera automáticamente
      unique: true, // Garantizar unicidad global
      admin: {
        description:
          'Código único autogenerado con formato COD-XXXX (donde COD es el código de empresa)',
        position: 'sidebar',
      },
      validate: (value: string | null | undefined) => {
        if (!value) {
          return true // El campo puede estar vacío al momento de validación (se genera automáticamente)
        }

        // Validar formato COD-XXXX donde COD son 3 letras y XXXX son 4 caracteres alfanuméricos
        if (!/^[A-Z]{3}-[0-9A-Z]{4}$/.test(value)) {
          return 'El código debe tener el formato COD-XXXX (3 letras mayúsculas, guión, 4 caracteres alfanuméricos)'
        }

        return true
      },
    },
    {
      name: 'namespace',
      type: 'text',
      required: true,
      admin: {
        description: 'Namespace para organizar contenidos (ej: curso-matematicas, empresa-acme)',
      },
      validate: (value: string | null | undefined) => {
        if (!value || typeof value !== 'string' || value.trim().length === 0) {
          return 'Namespace es requerido'
        }
        // Validar formato alfanumérico con guiones
        if (!/^[a-zA-Z0-9-_]+$/.test(value)) {
          return 'Namespace debe contener solo letras, números, guiones y guiones bajos'
        }
        return true
      },
    },

    // Auditoría básica: último usuario que actualizó el recurso
    {
      name: 'lastUpdatedBy',
      label: 'Última actualización por',
      type: 'relationship',
      relationTo: 'users' as any,
      required: false,
      admin: {
        position: 'sidebar',
        description: 'Campo gestionado automáticamente por el sistema al guardar',
      },
    },

    // ID de ejecución de n8n para mapeo y gestión de errores
    {
      name: 'executionId',
      label: 'N8n Execution ID',
      type: 'text',
      required: false,
      admin: {
        position: 'sidebar',
        description: 'ID de ejecución de n8n asociado a este resource',
        readOnly: true,
      },
    },

    // ---- Campos globales (siempre visibles)
    { name: 'nombre_cliente', label: 'Nombre del cliente', type: 'text', required: false },

    // Selector de caso (el value coincide con el name del group)
    {
      name: 'caso',
      label: 'Tipo de caso',
      type: 'select',
      required: false,
      options: [
        { label: 'Factura de suministros', value: 'factura_suministros' }, // electricidad, agua, gas, etc.
        { label: 'Compras de combustible / Taxi', value: 'desplazamientos' },
        { label: 'Compras de materias primas', value: 'materias_primas' },
        { label: 'Viajes realizados (tipo 2)', value: 'viajes_tipo_2' },
        { label: 'Variado de emails', value: 'variado_emails' },
        { label: 'Consumos de combustible (tipo 1)', value: 'consumos_combustible_tipo_1' },
        { label: 'Residuos', value: 'residuos' },
        { label: 'Viajes realizados (tipo 1)', value: 'viajes_tipo_1' },
        { label: 'Otros', value: 'otros' },
      ],
      admin: {
        description: 'Selecciona el tipo de caso para mostrar los campos correspondientes',
      },
    },

    // ---- Selector de tipo
    {
      name: 'tipo',
      label: 'Tipo',
      type: 'select',
      required: false,
      options: [
        { label: 'Electricidad', value: 'electricidad' },
        { label: 'Agua', value: 'agua' },
        { label: 'Gas', value: 'gas' },
        { label: 'Combustible', value: 'combustible' },
        { label: 'Gasolinera', value: 'gasolinera' },
        { label: 'Taxi / VTC', value: 'taxi_vtc' },
        { label: 'Factura (prebuilt)', value: 'prebuilt-invoice' },
        { label: 'Recibo (prebuilt)', value: 'prebuilt-receipt' },
        { label: 'Otros', value: 'otros' },
      ],
      validate: (value: unknown, ctx: { siblingData?: Record<string, unknown> }) => {
        if (!value) return true
        const caso = ctx?.siblingData?.caso as string | undefined
        const allowedByCaso: Record<string, string[]> = {
          factura_suministros: ['electricidad', 'agua', 'gas', 'combustible'],
          desplazamientos: ['gasolinera', 'taxi_vtc'],
          otros: ['otros'],
        }
        const defaultAllowed = ['prebuilt-invoice', 'prebuilt-receipt']
        const allowed = caso && allowedByCaso[caso] ? allowedByCaso[caso] : defaultAllowed
        return allowed.includes(String(value))
          ? true
          : `Tipo "${String(value)}" no es válido para el caso seleccionado`
      },
    },

    {
      name: 'filters',
      type: 'json',
      admin: {
        description: 'Filtros JSON para configuración de Pinecone (opcional)',
      },
    },
    {
      name: 'user_metadata',
      type: 'json',
      admin: {
        description: 'Metadatos JSON del usuario para identificación en webhooks (opcional)',
      },
    },
    {
      name: 'extractedText',
      type: 'textarea',
      admin: {
        description: 'Texto extraído del documento (auto-generado)',
        readOnly: true,
        condition: (data) => data.status !== 'pending',
      },
    },
    {
      name: 'description',
      type: 'textarea',
      admin: {
        description: 'Descripción general del documento generada por IA (auto-generado)',
        readOnly: true,
        condition: (data) => data.status === 'completed',
      },
    },
    {
      name: 'documentPages',
      type: 'array',
      admin: {
        description: 'Páginas del documento con contenido extraído (auto-generado)',
        readOnly: true,
        condition: (data) => data.status !== 'pending' && data.type === 'document',
      },
      fields: [
        {
          name: 'pageNumber',
          type: 'number',
          required: true,
          admin: {
            description: 'Número de página',
          },
        },
        {
          name: 'extractedText',
          type: 'textarea',
          required: true,
          admin: {
            description: 'Texto extraído de esta página',
          },
        },
        {
          name: 'summary',
          type: 'textarea',
          admin: {
            description: 'Resumen del contenido de la página generado por IA',
          },
        },
      ],
    },
    {
      name: 'chunks',
      type: 'array',
      admin: {
        description: 'Segmentos de texto del documento para generar embeddings (auto-generado)',
        readOnly: true,
        condition: (data) => data.status !== 'pending',
      },
      fields: [
        {
          name: 'chunkIndex',
          type: 'number',
          required: true,
          admin: {
            description: 'Índice del segmento de texto',
          },
        },
        {
          name: 'pageNumber',
          type: 'number',
          admin: {
            description: 'Número de página de origen (para PDFs)',
          },
        },
        {
          name: 'content',
          type: 'textarea',
          required: true,
          admin: {
            description: 'Contenido de texto del segmento',
          },
        },
        {
          name: 'summary',
          type: 'textarea',
          admin: {
            description: 'Resumen del contenido generado por IA',
          },
        },
      ],
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      defaultValue: 'document',
      options: [
        { label: 'Documento PDF', value: 'document' },
        { label: 'Imagen', value: 'image' },
      ],
      admin: {
        description: 'Tipo de recurso a procesar',
      },
    },
    {
      name: 'file',
      type: 'relationship',
      relationTo: 'media',
      required: true,
      admin: {
        description: 'Archivo multimedia subido',
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',

      options: [
        { label: 'Pendiente', value: 'pending' },
        { label: 'Subiendo', value: 'uploading' },
        { label: 'Procesando', value: 'processing' },
        { label: 'Completado', value: 'completed' },
        { label: 'Fallido', value: 'failed' },
        { label: 'Requiere revisión', value: 'needs_review' },
      ],
      admin: {
        description: 'Estado actual del procesamiento',
        position: 'sidebar',
      },
    },
    {
      name: 'progress',
      type: 'number',
      min: 0,
      max: 100,
      defaultValue: 0,
      admin: {
        description: 'Progreso del procesamiento (0-100%)',
        readOnly: true,
      },
    },
    {
      name: 'logs',
      type: 'array',
      admin: {
        description: 'Logs detallados del proceso de ingesta',
        readOnly: true,
      },
      fields: [
        {
          name: 'step',
          type: 'text',
          required: true,
          admin: {
            description: 'Nombre del paso (ej: transcribe, scenes, embedding)',
          },
        },
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
          admin: {
            date: {
              pickerAppearance: 'dayAndTime',
            },
          },
        },
        {
          name: 'details',
          type: 'textarea',
          admin: {
            description: 'Detalles adicionales del paso',
          },
        },
        {
          name: 'data',
          type: 'json',
          admin: {
            description: 'Datos específicos del paso (JSON)',
          },
        },
      ],
    },
    // Resultado de análisis de Azure (almacenado como JSON)
    {
      name: 'analyzeResult',
      type: 'json',
      admin: {
        description: 'Resultado de Azure Document Intelligence recibido via webhook',
        readOnly: true,
      },
    },
    // Campo de confianza calculado automáticamente
    {
      name: 'confidence',
      type: 'select',
      defaultValue: 'empty',
      admin: {
        description:
          'Estado de confianza del documento basado en la calidad de los campos analizados',
        position: 'sidebar',
      },
      options: [
        {
          label: 'Vacío o no aplica',
          value: 'empty',
        },
        {
          label: 'Necesita revisión',
          value: 'needs_revision',
        },
        {
          label: 'Confiable',
          value: 'trusted',
        },
        {
          label: 'Verificado',
          value: 'verified',
        },
      ],
    },
    // Campo manual para marcar documento como erróneo
    {
      name: 'documentoErroneo',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description:
          'Marcar manualmente si el documento es erróneo. Este estado prevalece sobre otros estados de confianza.',
        position: 'sidebar',
      },
    },
    // Editor visual de fields de analyzeResult
    {
      name: 'analyzeFieldsEditor',
      type: 'ui',
      admin: {
        components: {
          Field: '@/payload-admin/AnalyzeFieldsEditor#AnalyzeFieldsEditor',
        },
        position: 'sidebar',
        condition: (data) => Boolean((data as any).analyzeResult?.fields),
      },
    },
    // Eliminado: botón de mapeo manual (se edita directamente desde analyzeResult)
    // Campos de metadatos del procesamiento
    {
      name: 'processingMetadata',
      type: 'group',
      admin: {
        description: 'Metadatos del procesamiento',
        condition: (data) => data.status !== 'pending',
      },
      fields: [
        {
          name: 'pages',
          type: 'number',
          admin: {
            description: 'Número de páginas del documento',
            readOnly: true,
          },
        },
        {
          name: 'textChunks',
          type: 'number',
          admin: {
            description: 'Número de segmentos de texto generados',
            readOnly: true,
          },
        },
        {
          name: 'vectorsGenerated',
          type: 'number',
          admin: {
            description: 'Número de vectores creados en Pinecone',
            readOnly: true,
          },
        },
        {
          name: 'jobIds',
          type: 'array',
          admin: {
            description: 'IDs de jobs en el sistema de cola',
            readOnly: true,
          },
          fields: [
            {
              name: 'jobId',
              type: 'text',
            },
            {
              name: 'type',
              type: 'select',
              options: [
                { label: 'Document Processing', value: 'document-processing' },
                { label: 'Embedding Generation', value: 'embedding-generation' },
              ],
            },
          ],
        },
      ],
    },
    // Configuración de webhooks específica del recurso
    {
      name: 'webhookUrl',
      type: 'text',
      admin: {
        description: 'URL de webhook para notificaciones específicas de este recurso',
      },
    },
    {
      name: 'webhookSecret',
      type: 'text',
      admin: {
        description: 'Secret para validar webhooks',
      },
    },

    // Información de usuario/origen
    {
      name: 'uploadedBy',
      type: 'text',
      admin: {
        description: 'Identificador del usuario o sistema que subió el recurso',
      },
    },
    {
      name: 'source',
      type: 'text',
      admin: {
        description: 'Origen o contexto del recurso',
      },
    },
    // Timestamps automáticos
    {
      name: 'startedAt',
      type: 'date',
      admin: {
        description: 'Momento en que comenzó el procesamiento',
        readOnly: true,
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    {
      name: 'completedAt',
      type: 'date',
      admin: {
        description: 'Momento en que completó el procesamiento',
        readOnly: true,
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    {
      name: 'verifiedAt',
      type: 'date',
      admin: {
        description: 'Momento en que fue verificado manualmente',
        readOnly: true,
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    {
      name: 'verifiedBy',
      label: 'Verificado por',
      type: 'relationship',
      relationTo: 'users' as any,
      required: false,
      admin: {
        description: 'Usuario que verificó manualmente el documento',
        readOnly: true,
      },
    },
  ],
  endpoints: [
    {
      path: '/:id/logs',
      method: 'get',
      handler: async (req) => {
        try {
          // Verificar autenticación - en Payload el usuario ya está en req.user si está autenticado
          if (!req.user) {
            const authError = createAuthErrorResponse('Authentication required')
            return Response.json(authError, { status: 401 })
          }

          const resourceId = (req.routeParams as { id: string })?.id
          if (!resourceId) {
            return Response.json({ error: 'Resource ID is required' }, { status: 400 })
          }

          // Buscar el recurso
          const resource = await req.payload.findByID({
            collection: 'resources',
            id: resourceId,
          })

          if (!resource) {
            return Response.json({ error: 'Resource not found' }, { status: 404 })
          }

          // Procesar logs
          const logs =
            resource.logs?.map((log) => ({
              step: log.step,
              status: log.status,
              at: log.at,
              details: log.details || undefined,
              data: log.data || undefined,
            })) || []

          // Información de filtros desde query params
          const url = new URL(req.url!)
          const stepFilter = url.searchParams.get('step')
          const statusFilter = url.searchParams.get('status')
          const limit = url.searchParams.get('limit')
            ? parseInt(url.searchParams.get('limit')!)
            : undefined

          let filteredLogs = [...logs]

          // Aplicar filtros
          if (stepFilter) {
            filteredLogs = filteredLogs.filter((log) =>
              log.step.toLowerCase().includes(stepFilter.toLowerCase()),
            )
          }

          if (statusFilter) {
            filteredLogs = filteredLogs.filter(
              (log) => log.status.toLowerCase() === statusFilter.toLowerCase(),
            )
          }

          if (limit && limit > 0) {
            filteredLogs = filteredLogs.slice(-limit)
          }

          // Determinar actividad más reciente
          const latestActivity = logs.length > 0 ? logs[logs.length - 1].at : null

          const response = {
            resourceId: resource.id,
            totalLogs: filteredLogs.length,
            logs: filteredLogs,
            latestActivity,
            currentStatus: resource.status,
            progress: resource.progress || 0,
            startedAt: resource.startedAt || null,
            completedAt: resource.completedAt || null,
          }

          return Response.json({
            success: true,
            data: response,
            message: 'Resource logs retrieved successfully',
          })
        } catch (error) {
          console.error('Error retrieving resource logs:', error)

          if (error instanceof Error && error.message.includes('Authentication')) {
            const authError = createAuthErrorResponse(error.message)
            return Response.json(authError, { status: 401 })
          }

          return Response.json(
            {
              success: false,
              error: 'Internal server error while retrieving resource logs',
            },
            { status: 500 },
          )
        }
      },
    },
    {
      path: '/:id/test-mapping',
      method: 'post',
      handler: async (req) => {
        try {
          const resourceId = (req.routeParams as { id: string })?.id
          if (!resourceId)
            return Response.json(
              { success: false, error: 'Resource ID is required' },
              { status: 400 },
            )

          const resource = await req.payload.findByID({
            collection: 'resources',
            id: resourceId,
            depth: 0,
            overrideAccess: true,
          })
          if (!resource)
            return Response.json({ success: false, error: 'Resource not found' }, { status: 404 })

          // Leer body para saber si hay que aplicar cambios
          let body: any = {}
          try {
            body = await (req as any).json()
          } catch {}

          const analyzeResult = (resource as any).analyzeResult
          if (!analyzeResult)
            return Response.json(
              { success: false, error: 'No analyzeResult stored on resource' },
              { status: 400 },
            )

          const mapped = mapAnalyzeResultToResource(analyzeResult, {
            caso: (resource as any).caso,
            tipo: (resource as any).tipo,
          })

          console.log(
            '[RESOURCES_TEST_MAPPING] Resource:',
            resourceId,
            'Caso/Tipo:',
            (resource as any).caso,
            (resource as any).tipo,
          )
          console.log('[RESOURCES_TEST_MAPPING] Mapped keys:', Object.keys(mapped || {}))

          // Si apply=true, persistir en el recurso
          if (body?.apply === true) {
            const updateData: any = {
              ...mapped,
              logs: [
                ...(((resource as any).logs as any[]) || []),
                {
                  step: 'analyze-mapping-test-apply',
                  status: 'success' as const,
                  at: new Date().toISOString(),
                  details: 'Mapped fields applied from test-mapping endpoint',
                  data: { applied: Object.keys(mapped || {}) },
                },
              ],
            }

            const updated = await req.payload.update({
              collection: 'resources',
              id: resourceId,
              data: updateData,
              overrideAccess: true,
            })

            return Response.json({
              success: true,
              data: { id: (updated as any).id, applied: Object.keys(mapped || {}) },
              message: 'Mapped fields persisted on resource',
            })
          }

          return Response.json({ success: true, data: { mapped } })
        } catch (error) {
          console.error('[RESOURCES_TEST_MAPPING] Error:', error)
          return Response.json({ success: false, error: 'Internal error' }, { status: 500 })
        }
      },
    },
    {
      path: '/:id/webhook',
      method: 'post',
      handler: async (req) => {
        try {
          const resourceId = (req.routeParams as { id: string })?.id
          if (!resourceId) {
            return Response.json(
              { success: false, error: 'Resource ID is required' },
              { status: 400 },
            )
          }

          // Leer body JSON de n8n
          let body: any = {}
          try {
            body = await (req as any).json()
          } catch {
            return Response.json({ success: false, error: 'Invalid JSON body' }, { status: 400 })
          }

          console.log('[RESOURCES_WEBHOOK] Body meta:', {
            modelId: body?.modelId,
            modelo: body?.modelo,
            status: body?.status,
            caso: body?.caso,
            tipo: body?.tipo,
            error: body?.error,
            errorMessage: body?.errorMessage,
          })

          // Verificar si es un error desde el backend
          if (body?.status === 'failed' || body?.status === 'error') {
            console.log('[RESOURCES_WEBHOOK] Processing error status from backend')

            // Preparar logs de error
            const errorLog = {
              step: 'azure-analyze',
              status: 'error' as const,
              at: new Date().toISOString(),
              details: body?.errorMessage || body?.error || 'Processing failed in external backend',
              data: {
                modelId: body?.modelId,
                modelo: body?.modelo,
                jobStatus: body?.status,
                caso: body?.caso,
                tipo: body?.tipo,
                errorDetails: body?.errorDetails || null,
                errorCode: body?.errorCode || null,
              },
            }

            // Actualizar resource con status failed y logs de error
            await req.payload.update({
              collection: 'resources',
              id: resourceId,
              data: {
                status: 'failed',
                logs: [errorLog],
                // Preservar caso y tipo si vienen en el body
                ...(typeof body?.caso === 'string' && body.caso.length > 0 && { caso: body.caso }),
                ...(typeof body?.tipo === 'string' && body.tipo.length > 0 && { tipo: body.tipo }),
              },
              overrideAccess: true,
            })

            return Response.json({
              success: true,
              data: {
                id: resourceId,
                status: 'failed',
                message: 'Error status processed successfully',
              },
            })
          }

          // Para casos exitosos, validar analyzeResult
          const analyzeResult = body?.analyzeResult
          if (!analyzeResult) {
            return Response.json(
              { success: false, error: 'Missing analyzeResult in body for successful processing' },
              { status: 400 },
            )
          }
          console.log(
            '[RESOURCES_WEBHOOK] Received analyzeResult keys:',
            Object.keys(analyzeResult || {}),
          )

          // Fusionar analyzeResult recibido con el actual para preservar ediciones manuales
          let mergedAnalyzeResult: any = analyzeResult
          try {
            let currentResource: any = null
            try {
              currentResource = await req.payload.findByID({
                collection: 'resources',
                id: resourceId,
                depth: 0,
                overrideAccess: true,
              })
            } catch {}

            const currentAR = (currentResource as any)?.analyzeResult || {}
            const currentFields =
              currentAR?.fields && typeof currentAR.fields === 'object'
                ? currentAR.fields
                : undefined
            const incomingFields =
              analyzeResult?.fields && typeof analyzeResult.fields === 'object'
                ? analyzeResult.fields
                : undefined

            if (incomingFields || currentFields) {
              const mergedFields: Record<string, unknown> = {
                ...(incomingFields || {}),
              }
              if (currentFields) {
                for (const [k, v] of Object.entries(currentFields)) {
                  // Si el campo fue marcado como manual por el usuario, preservar su valor
                  if (v && typeof v === 'object' && (v as any).manual) {
                    mergedFields[k] = v
                  }
                }
              }
              mergedAnalyzeResult = {
                ...(analyzeResult || {}),
                fields: mergedFields,
              }
            }
          } catch (e) {
            console.warn('[RESOURCES_WEBHOOK] Failed to merge analyzeResult with current edits:', e)
          }

          // Construir data de actualización incluyendo caso/tipo si vienen en el body
          const updateData: any = {
            status: 'completed',
            analyzeResult: mergedAnalyzeResult,
            logs: [
              {
                step: 'azure-analyze',
                status: 'success',
                at: new Date().toISOString(),
                details: 'Analyze result received from Azure via n8n',
                data: {
                  modelId: body?.modelId,
                  modelo: body?.modelo,
                  jobStatus: body?.status,
                  caso: body?.caso,
                  tipo: body?.tipo,
                },
              },
            ],
          }

          if (typeof body?.caso === 'string' && body.caso.length > 0) {
            updateData.caso = body.caso
          }
          if (typeof body?.tipo === 'string' && body.tipo.length > 0) {
            updateData.tipo = body.tipo
          }

          // Sin mapeo automático: ahora el JSON ya llega filtrado desde n8n y se edita desde Admin

          // Auto-registro de nuevas keys en field-translations
          try {
            const fieldsObj = (mergedAnalyzeResult as any)?.fields
            if (fieldsObj && typeof fieldsObj === 'object') {
              const keys = Object.keys(fieldsObj)
              for (const k of keys) {
                try {
                  await req.payload.create({
                    collection: 'field-translations' as any,
                    data: { key: k, label: k },
                  })
                } catch {}
              }
            }
          } catch {}

          // Actualizar el recurso: status -> completed y guardar analyzeResult, caso y tipo si aplica
          const updated = await req.payload.update({
            collection: 'resources',
            id: resourceId,
            data: updateData,
            overrideAccess: true,
          })

          // Calcular automáticamente el campo confidence después de recibir analyzeResult
          try {
            const threshold = await getConfidenceThreshold(req.payload)
            // Obtener campos obligatorios desde field-translations
            let requiredFieldNames: string[] = []
            try {
              const translations = await req.payload.find({
                collection: 'field-translations' as any,
                limit: 1000,
                depth: 0,
              } as any)
              const docs = Array.isArray((translations as any)?.docs)
                ? (translations as any).docs
                : []
              requiredFieldNames = docs
                .filter((d: any) => d?.isRequired)
                .map((d: any) => String(d.key))
                .filter(Boolean)
            } catch (e) {
              console.warn('[RESOURCES_WEBHOOK] No se pudieron cargar campos obligatorios', e)
            }

            const newConfidence = calculateResourceConfidence(updated, threshold, {
              requiredFieldNames,
            })

            // Solo actualizar si el valor ha cambiado
            if ((updated as any).confidence !== newConfidence) {
              await req.payload.update({
                collection: 'resources',
                id: resourceId,
                data: {
                  confidence: newConfidence,
                },
                overrideAccess: true,
              })
              console.log(
                `[RESOURCES_WEBHOOK] Confidence updated automatically: ${(updated as any).confidence} → ${newConfidence}`,
              )
            } else {
              console.log(`[RESOURCES_WEBHOOK] Confidence remains: ${newConfidence}`)
            }
          } catch (confidenceError) {
            // No interrumpir el flujo si hay error calculando confidence
            console.warn('[RESOURCES_WEBHOOK] Error calculating confidence:', confidenceError)
          }

          return Response.json({ success: true, data: { id: updated.id } })
        } catch (error) {
          console.error('Error in resources webhook:', error)
          return Response.json({ success: false, error: 'Internal error' }, { status: 500 })
        }
      },
    },
    {
      path: '/webhook',
      method: 'post',
      handler: async (req) => {
        try {
          // Leer body JSON de n8n
          let body: any = {}
          try {
            body = await (req as any).json()
          } catch {
            return Response.json({ success: false, error: 'Invalid JSON body' }, { status: 400 })
          }

          // Validar que el executionId esté presente
          const executionId = body?.executionId
          if (!executionId) {
            return Response.json(
              { success: false, error: 'executionId is required in body' },
              { status: 400 },
            )
          }

          console.log('[RESOURCES_WEBHOOK] Processing webhook for executionId:', executionId)
          console.log('[RESOURCES_WEBHOOK] Body meta:', {
            executionId,
            modelId: body?.modelId,
            modelo: body?.modelo,
            status: body?.status,
            caso: body?.caso,
            tipo: body?.tipo,
            error: body?.error,
            errorMessage: body?.errorMessage,
          })

          // Buscar resource por executionId
          const resourceResult = await req.payload.find({
            collection: 'resources',
            where: {
              executionId: { equals: String(executionId) },
            },
            limit: 1,
            overrideAccess: true,
          })

          if (resourceResult.docs.length === 0) {
            console.warn(`[RESOURCES_WEBHOOK] No resource found with executionId: ${executionId}`)
            return Response.json(
              {
                success: false,
                error: `No se encontró resource con executionId: ${executionId}`,
                executionId,
              },
              { status: 404 },
            )
          }

          const resource = resourceResult.docs[0]
          const resourceId = resource.id
          console.log(
            `[RESOURCES_WEBHOOK] Found resource ${resourceId} for executionId: ${executionId}`,
          )

          // Verificar si es un error desde el backend
          if (body?.status === 'failed' || body?.status === 'error') {
            console.log('[RESOURCES_WEBHOOK] Processing error status from backend')

            // Preparar logs de error
            const errorLog = {
              step: 'azure-analyze',
              status: 'error' as const,
              at: new Date().toISOString(),
              details: body?.errorMessage || body?.error || 'Processing failed in external backend',
              data: {
                executionId,
                modelId: body?.modelId,
                modelo: body?.modelo,
                jobStatus: body?.status,
                caso: body?.caso,
                tipo: body?.tipo,
                errorDetails: body?.errorDetails || null,
                errorCode: body?.errorCode || null,
              },
            }

            // Actualizar resource con status failed y logs de error
            await req.payload.update({
              collection: 'resources',
              id: resourceId,
              data: {
                status: 'failed',
                logs: [errorLog],
                // Preservar caso y tipo si vienen en el body
                ...(typeof body?.caso === 'string' && body.caso.length > 0 && { caso: body.caso }),
                ...(typeof body?.tipo === 'string' && body.tipo.length > 0 && { tipo: body.tipo }),
              },
              overrideAccess: true,
            })

            return Response.json({
              success: true,
              data: {
                id: resourceId,
                executionId,
                status: 'failed',
                message: 'Error status processed successfully',
              },
            })
          }

          // Para casos exitosos, validar analyzeResult
          const analyzeResult = body?.analyzeResult
          if (!analyzeResult) {
            return Response.json(
              { success: false, error: 'Missing analyzeResult in body for successful processing' },
              { status: 400 },
            )
          }
          console.log(
            '[RESOURCES_WEBHOOK] Received analyzeResult keys:',
            Object.keys(analyzeResult || {}),
          )

          // Fusionar analyzeResult recibido con el actual para preservar ediciones manuales
          let mergedAnalyzeResult: any = analyzeResult
          try {
            let currentResource: any = null
            try {
              currentResource = await req.payload.findByID({
                collection: 'resources',
                id: resourceId,
                depth: 0,
                overrideAccess: true,
              })
            } catch {}

            const currentAR = (currentResource as any)?.analyzeResult || {}
            const currentFields =
              currentAR?.fields && typeof currentAR.fields === 'object'
                ? currentAR.fields
                : undefined
            const incomingFields =
              analyzeResult?.fields && typeof analyzeResult.fields === 'object'
                ? analyzeResult.fields
                : undefined

            if (incomingFields || currentFields) {
              const mergedFields: Record<string, unknown> = {
                ...(incomingFields || {}),
              }
              if (currentFields) {
                for (const [k, v] of Object.entries(currentFields)) {
                  // Si el campo fue marcado como manual por el usuario, preservar su valor
                  if (v && typeof v === 'object' && (v as any).manual) {
                    mergedFields[k] = v
                  }
                }
              }
              mergedAnalyzeResult = {
                ...(analyzeResult || {}),
                fields: mergedFields,
              }
            }
          } catch (e) {
            console.warn('[RESOURCES_WEBHOOK] Failed to merge analyzeResult with current edits:', e)
          }

          // Construir data de actualización incluyendo caso/tipo si vienen en el body
          const updateData: any = {
            status: 'completed',
            analyzeResult: mergedAnalyzeResult,
            logs: [
              {
                step: 'azure-analyze',
                status: 'success',
                at: new Date().toISOString(),
                details: 'Analyze result received from Azure via n8n',
                data: {
                  executionId,
                  modelId: body?.modelId,
                  modelo: body?.modelo,
                  jobStatus: body?.status,
                  caso: body?.caso,
                  tipo: body?.tipo,
                },
              },
            ],
          }

          if (typeof body?.caso === 'string' && body.caso.length > 0) {
            updateData.caso = body.caso
          }
          if (typeof body?.tipo === 'string' && body.tipo.length > 0) {
            updateData.tipo = body.tipo
          }

          // Sin mapeo automático: ahora el JSON ya llega filtrado desde n8n y se edita desde Admin

          // Auto-registro de nuevas keys en field-translations
          try {
            const fieldsObj = (mergedAnalyzeResult as any)?.fields
            if (fieldsObj && typeof fieldsObj === 'object') {
              const keys = Object.keys(fieldsObj)
              for (const k of keys) {
                try {
                  await req.payload.create({
                    collection: 'field-translations' as any,
                    data: { key: k, label: k },
                  })
                } catch {}
              }
            }
          } catch {}

          // Actualizar el recurso: status -> completed y guardar analyzeResult, caso y tipo si aplica
          const updated = await req.payload.update({
            collection: 'resources',
            id: resourceId,
            data: updateData,
            overrideAccess: true,
          })

          // Calcular automáticamente el campo confidence después de recibir analyzeResult
          try {
            const threshold = await getConfidenceThreshold(req.payload)
            // Obtener campos obligatorios desde field-translations
            let requiredFieldNames: string[] = []
            try {
              const translations = await req.payload.find({
                collection: 'field-translations' as any,
                limit: 1000,
                depth: 0,
              } as any)
              const docs = Array.isArray((translations as any)?.docs)
                ? (translations as any).docs
                : []
              requiredFieldNames = docs
                .filter((d: any) => d?.isRequired)
                .map((d: any) => String(d.key))
                .filter(Boolean)
            } catch (e) {
              console.warn('[RESOURCES_WEBHOOK] No se pudieron cargar campos obligatorios', e)
            }

            const newConfidence = calculateResourceConfidence(updated, threshold, {
              requiredFieldNames,
            })

            // Solo actualizar si el valor ha cambiado
            if ((updated as any).confidence !== newConfidence) {
              await req.payload.update({
                collection: 'resources',
                id: resourceId,
                data: {
                  confidence: newConfidence,
                },
                overrideAccess: true,
              })
              console.log(
                `[RESOURCES_WEBHOOK] Confidence updated automatically: ${(updated as any).confidence} → ${newConfidence}`,
              )
            } else {
              console.log(`[RESOURCES_WEBHOOK] Confidence remains: ${newConfidence}`)
            }
          } catch (confidenceError) {
            // No interrumpir el flujo si hay error calculando confidence
            console.warn('[RESOURCES_WEBHOOK] Error calculating confidence:', confidenceError)
          }

          return Response.json({
            success: true,
            data: {
              id: updated.id,
              executionId,
            },
          })
        } catch (error) {
          console.error('Error in resources webhook (executionId):', error)
          return Response.json({ success: false, error: 'Internal error' }, { status: 500 })
        }
      },
    },
  ],
  hooks: {
    beforeDelete: [
      async ({ req, id }) => {
        // Descomentar para activar el hook de limpieza

        // Hook para limpiar archivos S3 y vectores Pinecone antes de eliminar el recurso
        try {
          const resourceId = String(id)
          console.log(`Starting cleanup for resource deletion: ${resourceId}`)

          // Buscar el recurso antes de eliminarlo para obtener información del archivo
          const resource = await req.payload.findByID({
            collection: 'resources',
            id: resourceId,
            depth: 2,
          })

          if (!resource) {
            console.log(`Resource ${resourceId} not found, skipping cleanup`)
            return
          }

          const errors: string[] = []

          // 1. LIMPIEZA DE ARCHIVOS S3
          try {
            console.log(`Starting S3 cleanup for resource: ${resourceId}`)

            // Eliminar archivo de media principal si existe
            const file =
              typeof resource.file === 'string'
                ? await req.payload.findByID({
                    collection: 'media',
                    id: resource.file,
                    depth: 1,
                  })
                : resource.file

            if (file && typeof file === 'object' && file.filename) {
              await StorageManager.deleteMediaFile(file.filename)
              await req.payload.delete({
                collection: 'media',
                id: file.id,
                depth: 1,
              })
              console.log(`Deleted main media file: ${file.filename}`)
            }

            // Eliminar screenshots (Media objects) asociados al recurso
            const resourceWithScreenshots = resource as any
            if (
              resourceWithScreenshots.screenshots &&
              Array.isArray(resourceWithScreenshots.screenshots)
            ) {
              console.log(
                `Cleaning up ${resourceWithScreenshots.screenshots.length} screenshots for resource: ${resourceId}`,
              )

              for (const screenshot of resourceWithScreenshots.screenshots) {
                try {
                  const imageId =
                    typeof screenshot.image === 'string' ? screenshot.image : screenshot.image?.id

                  if (imageId) {
                    const screenshotMedia = await req.payload.findByID({
                      collection: 'media',
                      id: imageId,
                      depth: 1,
                    })

                    if (screenshotMedia && screenshotMedia.filename) {
                      await StorageManager.deleteMediaFile(screenshotMedia.filename)
                      await req.payload.delete({
                        collection: 'media',
                        id: imageId,
                        depth: 1,
                      })
                      console.log(`Deleted screenshot media file: ${screenshotMedia.filename}`)
                    }
                  }
                } catch (screenshotError) {
                  console.error(`Error deleting screenshot:`, screenshotError)
                  errors.push(`Screenshot cleanup failed: ${screenshotError}`)
                }
              }
            }

            // Eliminar archivos relacionados (fotogramas, segmentos, etc.)
            // await StorageManager.deleteResourceFiles(resourceId)
            // console.log(`Deleted resource-related files for: ${resourceId}`)
          } catch (s3Error) {
            console.error('Error during S3 cleanup:', s3Error)
            errors.push(`S3 cleanup failed: ${s3Error}`)
          }

          // 2. LIMPIEZA DE VECTORES PINECONE
          try {
            console.log(`Starting Pinecone cleanup for resource: ${resourceId}`)

            // Obtener el namespace del resource para limpiar vectores correctamente
            const resourceNamespace = (resource as any).namespace

            if (resourceNamespace) {
              console.log(`Using namespace for cleanup: ${resourceNamespace}`)

              // Obtener información de vectores antes de eliminar
              const existingVectors = await PineconeManager.getVectorsByResourceId(
                resourceId,
                resourceNamespace,
              )
              const vectorsCount = existingVectors.length

              if (vectorsCount > 0) {
                await PineconeManager.deleteVectorsByResourceId(resourceId, resourceNamespace)
                console.log(
                  `Deleted ${vectorsCount} vectors from Pinecone for resource: ${resourceId} in namespace: ${resourceNamespace}`,
                )
              } else {
                console.log(
                  `No vectors found in Pinecone for resource: ${resourceId} in namespace: ${resourceNamespace}`,
                )
              }
            } else {
              console.warn(`Resource ${resourceId} has no namespace, trying default cleanup`)

              // Fallback: limpiar en el namespace por defecto
              const existingVectors = await PineconeManager.getVectorsByResourceId(resourceId)
              const vectorsCount = existingVectors.length

              if (vectorsCount > 0) {
                await PineconeManager.deleteVectorsByResourceId(resourceId)
                console.log(
                  `Deleted ${vectorsCount} vectors from Pinecone for resource: ${resourceId} (default namespace)`,
                )
              } else {
                console.log(
                  `No vectors found in Pinecone for resource: ${resourceId} (default namespace)`,
                )
              }
            }
          } catch (pineconeError) {
            console.error('Error during Pinecone cleanup:', pineconeError)
            errors.push(`Pinecone cleanup failed: ${pineconeError}`)
          }

          // Log de resultados de limpieza
          if (errors.length > 0) {
            console.warn(`Resource ${resourceId} cleanup completed with warnings:`, errors)
          } else {
            console.log(`Resource ${resourceId} cleanup completed successfully`)
          }

          // Nota: No lanzamos errores aquí para que la eliminación del recurso continue
          // Los errores se loggean pero no impiden la eliminación del registro
        } catch (error) {
          console.error(`Fatal error during cleanup for resource ${req.routeParams?.id}:`, error)
          // Continuar con la eliminación incluso si la limpieza falla
        }
      },
    ],
    beforeChange: [
      async ({ operation, data, req }) => {
        // Validaciones para creación
        if (operation === 'create') {
          // Inicializar arrays vacíos para nuevos campos
          data.documentPages = data.documentPages || []
          data.chunks = data.chunks || []
          data.extractedText = data.extractedText || ''

          // Validar campos requeridos
          if (!data.namespace || data.namespace.trim().length === 0) {
            throw new Error('Namespace es requerido para crear un recurso')
          }

          // Validar que se haya especificado una empresa
          if (!data.empresa) {
            throw new Error('La empresa es requerida para crear un recurso')
          }

          // Inicializar campos opcionales si no están presentes
          data.filters = data.filters || {}
          data.user_metadata = data.user_metadata || {}

          // Generar código único automáticamente (solo si no viene pre-asignado)
          if (!data.codigo) {
            try {
              const empresaId = typeof data.empresa === 'object' ? data.empresa.id : data.empresa
              data.codigo = await generateUniqueCode(empresaId, req.payload)
            } catch (error) {
              console.error('[RESOURCES] Error generando código automático:', error)
              throw new Error(`Error generando código automático: ${error}`)
            }
          } else {
            console.log(`[RESOURCES] Using pre-assigned code: ${data.codigo}`)
          }
        }

        // Generar código automáticamente en updates cuando hay empresa pero no código
        if (operation === 'update' && data.empresa && !data.codigo) {
          try {
            const empresaId = typeof data.empresa === 'object' ? data.empresa.id : data.empresa
            data.codigo = await generateUniqueCode(empresaId, req.payload)
          } catch (error) {
            console.error('[RESOURCES] Error generando código automático en update:', error)
            throw new Error(`Error generando código automático: ${error}`)
          }
        } else if (operation === 'update' && data.codigo) {
          console.log(`[RESOURCES] Update using existing/pre-assigned code: ${data.codigo}`)
        }

        if (operation === 'create' && (data.type === 'document' || data.type === 'image')) {
          // Para documentos, marcar como completado inmediatamente ya que no necesitan procesamiento complejo
          data.status = 'processing'
          data.startedAt = new Date().toISOString()
          data.completedAt = new Date().toISOString()

          // Obtener información del archivo
          const file = await req.payload.findByID({
            collection: 'media',
            id: data.file,
            depth: 1,
          })

          data.logs = [
            {
              step: 'upload',
              status: 'success',
              at: new Date().toISOString(),
              details: `Document uploaded successfully: ${(file as Media)?.filename || 'unknown'}`,
              data: {
                jobType: 'document-upload',
                fileName: (file as Media)?.filename || '',
                fileSize: (file as Media)?.filesize || 0,
                namespace: data.namespace,
                hasFilters: data.filters && Object.keys(data.filters).length > 0,
                hasUserMetadata: data.user_metadata && Object.keys(data.user_metadata).length > 0,
              },
            },
          ]

          console.log('📄 [RESOURCES] Document resource configured:', {
            type: data.type,
            fileName: (file as Media)?.filename,
            status: data.status,
          })
        }

        // Recalcular confidence automáticamente cuando analyzeResult cambia
        // PERO SOLO si no se está estableciendo manualmente a 'verified'
        if (operation === 'update' && data && req) {
          try {
            // Si el update contiene analyzeResult, recalcular confidence
            const currentAnalyzeResult = (data as any)?.analyzeResult
            const explicitConfidence = (data as any)?.confidence

            // NO recalcular si se está estableciendo explícitamente a 'verified'
            if (currentAnalyzeResult && explicitConfidence !== 'verified') {
              console.log(
                `[RESOURCES_BEFORECHANGE] analyzeResult being updated, recalculating confidence...`,
              )

              // Obtener threshold y calcular nuevo confidence
              const threshold = await getConfidenceThreshold(req.payload)

              // Usar los datos que se van a guardar para el cálculo
              const documentForCalculation = {
                ...data,
                analyzeResult: currentAnalyzeResult,
              }

              // Obtener campos obligatorios desde field-translations
              let requiredFieldNames: string[] = []
              try {
                const translations = await req.payload.find({
                  collection: 'field-translations' as any,
                  limit: 1000,
                  depth: 0,
                } as any)
                const docs = Array.isArray((translations as any)?.docs)
                  ? (translations as any).docs
                  : []
                requiredFieldNames = docs
                  .filter((d: any) => d?.isRequired)
                  .map((d: any) => String(d.key))
                  .filter(Boolean)
              } catch (e) {
                console.warn(
                  '[RESOURCES_BEFORECHANGE] No se pudieron cargar campos obligatorios',
                  e,
                )
              }

              const newConfidence = calculateResourceConfidence(documentForCalculation, threshold, {
                requiredFieldNames,
              })

              // Añadir confidence calculado a los datos que se van a guardar
              ;(data as any).confidence = newConfidence
              console.log(`[RESOURCES_BEFORECHANGE] Confidence calculated: ${newConfidence}`)
              console.log(`[RESOURCES_BEFORECHANGE] Threshold used: ${threshold}%`)

              // Debug: mostrar algunos campos
              if (currentAnalyzeResult.fields) {
                const fieldNames = Object.keys(currentAnalyzeResult.fields)
                console.log(
                  `[RESOURCES_BEFORECHANGE] Fields in analyzeResult: ${fieldNames.length}`,
                )
                fieldNames.slice(0, 3).forEach((fieldName) => {
                  const field = currentAnalyzeResult.fields[fieldName]
                  console.log(
                    `  - ${fieldName}: confidence=${field.confidence}, manual=${field.manual}`,
                  )
                })
              }
            } else if (explicitConfidence === 'verified') {
              console.log(
                `[RESOURCES_BEFORECHANGE] Confidence being set to 'verified' manually - skipping auto-calculation`,
              )
            }
          } catch (confidenceError) {
            console.warn(
              '[RESOURCES_BEFORECHANGE] Error calculating confidence in beforeChange hook:',
              confidenceError,
            )
          }
        }

        // Hook de automatización: disparar webhook N8n al crear cualquier recurso
        if (operation === 'create') {
          try {
            // Leer configuración global con overrideAccess para bypass de permisos
            console.log('[AUTOMATION] Checking global configuracion for webhook...')
            const configuracion: any = await req.payload.findGlobal({
              slug: 'configuracion' as any,
              depth: 0,
              overrideAccess: true,
            } as any)

            const automation = configuracion?.automationEndpoint
            if (!automation || !automation.enabled || !automation.url) {
              console.log('[AUTOMATION] Webhook disabled or URL missing. Skipping webhook.')
              return data
            }

            const method = String(automation.httpMethod || 'POST').toUpperCase()
            const url = String(automation.url)
            console.log('[AUTOMATION] Preparing webhook call:', { method, url })

            // 🆕 Detectar alta concurrencia y añadir delay para uploads masivos (reduce concurrencia en n8n)
            const isHighConcurrency = data.namespace && data.namespace.includes('project-')
            if (isHighConcurrency) {
              const delay = Math.floor(Math.random() * 2000) + 500 // 500-2500ms aleatorio
              console.log(
                `[AUTOMATION] High concurrency detected, adding ${delay}ms delay to reduce n8n load`,
              )
              await new Promise((resolve) => setTimeout(resolve, delay))
            }

            const headers: Record<string, string> = {
              'User-Agent': 'Trinoa-Automation/1.0',
              Accept: 'application/json',
            }

            if (automation?.bearerToken) {
              headers['Authorization'] = String(automation.bearerToken)
            }

            if (Array.isArray(automation.extraHeaders)) {
              for (const h of automation.extraHeaders) {
                if (h?.key && typeof h.key === 'string') {
                  headers[h.key] = String(h.value ?? '')
                }
              }
            }

            let fetchUrl = url
            const init: RequestInit = { method }

            // Obtener información del archivo para el webhook
            let fileUrl: string | null = null
            let fileMeta: any = undefined
            try {
              const media = await req.payload.findByID({
                collection: 'media',
                id: String(data.file),
              })
              fileMeta = media
                ? {
                    id: String(media.id),
                    filename: media.filename,
                    filesize: media.filesize,
                    mimeType: media.mimeType,
                  }
                : undefined

              if (media?.filename) {
                try {
                  fileUrl = await StorageManager.getSignedUrl(media.filename, 3600)
                } catch (e) {
                  console.warn('[AUTOMATION] Failed to create signed URL:', e)
                }
              }
            } catch (mediaError) {
              console.warn('[AUTOMATION] Could not fetch media info:', mediaError)
            }

            if (method === 'GET') {
              const u = new URL(url)
              u.searchParams.set('event', 'resource.created')
              u.searchParams.set('resourceId', 'temp-id') // En beforeChange no tenemos ID aún
              u.searchParams.set('namespace', String(data.namespace || ''))
              u.searchParams.set('type', String(data.type || ''))
              if (fileUrl) u.searchParams.set('fileUrl', String(fileUrl))
              fetchUrl = u.toString()
            } else {
              headers['Content-Type'] = 'application/json'

              const minimalFile = fileMeta
                ? {
                    filename: fileMeta.filename,
                    filesize: fileMeta.filesize,
                    mimeType: fileMeta.mimeType,
                  }
                : undefined

              const payloadBody = {
                event: 'resource.created',
                resourceId: 'temp-id', // En beforeChange no tenemos ID aún
                namespace: String(data.namespace || ''),
                type: String(data.type || ''),
                fileUrl,
                file: minimalFile,
                caso: data.caso,
                tipo: data.tipo,
              }
              init.body = JSON.stringify(payloadBody)
            }

            init.headers = headers

            // Timeout dinámico mejorado: 15s por defecto, más tiempo si detectamos alta carga
            const baseTimeout = 15000
            const timeoutMs = isHighConcurrency ? baseTimeout + 10000 : baseTimeout // +10s si es proyecto

            const controller = new AbortController()
            const timer = setTimeout(() => {
              console.log(`[AUTOMATION] Timeout after ${timeoutMs}ms`)
              controller.abort()
            }, timeoutMs)
            ;(init as any).signal = controller.signal

            console.log('[AUTOMATION] Calling webhook...', {
              fetchUrl,
              method,
              headers: Object.keys(headers),
              timeout: timeoutMs,
              concurrencyMode: isHighConcurrency ? 'high' : 'normal',
            })

            const res = await fetch(fetchUrl, init)
            clearTimeout(timer)
            const ok = res.ok
            const status = res.status
            console.log('[AUTOMATION] Webhook response:', { ok, status, timeoutUsed: timeoutMs })

            let responseText = ''
            let executionId: string | null = null
            let executionUrl: string | null = null

            try {
              responseText = await res.text()
              console.log('[AUTOMATION] Webhook response text:', responseText)

              // Intentar extraer executionId de la respuesta de n8n con validación estricta
              if (ok && responseText) {
                try {
                  const responseJson = JSON.parse(responseText)

                  // Buscar executionId en múltiples ubicaciones posibles
                  const candidateExecutionId =
                    responseJson?.executionId ||
                    responseJson?.data?.executionId ||
                    responseJson?.execution?.id ||
                    responseJson?.id ||
                    null

                  // Validar que el executionId sea un string/number válido
                  if (candidateExecutionId && String(candidateExecutionId).trim()) {
                    executionId = String(candidateExecutionId).trim()

                    executionUrl =
                      responseJson?.executionUrl ||
                      responseJson?.data?.executionUrl ||
                      responseJson?.execution?.url ||
                      null

                    console.log(
                      `[AUTOMATION] ✅ Extracted executionId from n8n response: ${executionId}`,
                    )
                    // Añadir executionId directamente a los datos que se van a guardar
                    data.executionId = executionId
                    console.log(
                      `[AUTOMATION] ✅ Adding executionId ${executionId} to resource data`,
                    )
                  } else {
                    console.warn('[AUTOMATION] ⚠️  Response OK but no valid executionId found:', {
                      responseJson: JSON.stringify(responseJson, null, 2).slice(0, 500),
                      candidateExecutionId,
                    })
                  }
                } catch (parseError) {
                  console.warn(
                    '[AUTOMATION] ❌ Could not parse webhook response as JSON:',
                    parseError,
                  )
                  console.warn('[AUTOMATION] Raw response:', responseText.slice(0, 200))
                }
              } else if (!ok) {
                console.warn(
                  `[AUTOMATION] ❌ Webhook failed with status ${status}:`,
                  responseText.slice(0, 200),
                )
              } else {
                console.warn('[AUTOMATION] ⚠️  Empty response from webhook')
              }
            } catch (responseError) {
              console.warn('[AUTOMATION] ❌ Error reading response:', responseError)
            }

            // Añadir log del webhook a los datos con información mejorada
            const currentLogs = Array.isArray(data.logs) ? data.logs : []
            const webhookSuccess = ok && !!executionId // Solo es éxito si obtuvimos executionId

            const newLog = {
              step: 'automation-webhook-improved',
              status: webhookSuccess ? ('success' as const) : ('error' as const),
              at: new Date().toISOString(),
              details: webhookSuccess
                ? `Webhook enviado correctamente (status ${status}) - ExecutionId: ${executionId}`
                : ok
                  ? `Webhook respondió OK (status ${status}) pero SIN executionId - PROBLEMA DE CONCURRENCIA`
                  : `Webhook falló completamente (status ${status})`,
              data: {
                url: fetchUrl,
                method,
                headers: Object.keys(headers),
                responsePreview: responseText?.slice(0, 300),
                executionId: executionId || null,
                executionUrl: executionUrl || null,
                httpStatus: status,
                httpOk: ok,
                hasExecutionId: !!executionId,
                timeoutUsed: timeoutMs,
                concurrencyMode: isHighConcurrency ? 'high' : 'normal',
              },
            }

            data.logs = [...currentLogs, newLog]

            // Establecer estado basado en la respuesta del webhook Y la presencia de executionId
            if (webhookSuccess) {
              data.status = 'processing'
              data.startedAt = new Date().toISOString()
              console.log(
                `[AUTOMATION] ✅ Resource set to processing with executionId: ${executionId}`,
              )
            } else if (ok && !executionId) {
              // Caso especial: webhook OK pero sin executionId (el problema que experimentaste)
              data.status = 'failed'
              console.log(
                `[AUTOMATION] ❌ Resource set to failed - webhook OK but missing executionId (concurrency issue)`,
              )
            } else {
              data.status = 'failed'
              console.log(`[AUTOMATION] ❌ Resource set to failed - webhook completely failed`)
            }

            console.log(
              `[AUTOMATION] Webhook processed successfully. ExecutionId: ${executionId || 'none'}`,
            )
          } catch (error) {
            console.error('[AUTOMATION] Exception while sending webhook:', error)

            // Añadir log de error
            const currentLogs = Array.isArray(data.logs) ? data.logs : []
            const errLog = {
              step: 'automation-webhook',
              status: 'error' as const,
              at: new Date().toISOString(),
              details: 'Excepción al enviar webhook',
              data: { error: String(error) },
            }
            data.logs = [...currentLogs, errLog]
            // No cambiar el status por errores de webhook
          }
        }

        return data
      },
    ],
    afterChange: [
      async ({ doc, operation, previousDoc, req }) => {
        // Hook simplificado - solo log para documentos
        if (operation === 'create' && (doc.type === 'document' || doc.type === 'image')) {
          try {
            const mediaFile = doc.file as Media
            console.log('✅ [RESOURCES] Document resource created successfully:', {
              resourceId: doc.id,
              fileName: mediaFile?.filename || 'unknown',
              fileSize: mediaFile?.filesize || 0,
              type: doc.type,
              namespace: doc.namespace,
            })
          } catch (error) {
            console.error('❌ [RESOURCES] Error in afterChange hook:', error)
          }
        }

        // Webhook ya manejado en beforeChange - no se necesita lógica adicional aquí

        // Hook para enviar webhooks cuando cambia el estado
        if (
          operation === 'update' &&
          previousDoc?.status !== doc.status &&
          (doc.status === 'completed' || doc.status === 'failed')
        ) {
          // TODO: Implementar envío de webhook en sub-tarea 7.3
          console.log('Resource status changed:', doc.id, 'to', doc.status)

          // Si el recurso se completó, registrar timestamp
          /*  if (doc.status === 'completed') {
            await req.payload.update({
              collection: 'resources',
              id: doc.id,
              data: {
                completedAt: new Date().toISOString(),
              },
            })
          } */
        }

        // LOG: Documentar cambios para debug
        if (operation === 'update' && previousDoc && doc) {
          try {
            const previousAnalyzeResult = (previousDoc as any)?.analyzeResult
            const currentAnalyzeResult = (doc as any)?.analyzeResult

            // Verificar si analyzeResult ha cambiado
            const previousSerialized = previousAnalyzeResult
              ? JSON.stringify(previousAnalyzeResult)
              : null
            const currentSerialized = currentAnalyzeResult
              ? JSON.stringify(currentAnalyzeResult)
              : null

            if (previousSerialized !== currentSerialized) {
              console.log(
                `[RESOURCES_HOOK] analyzeResult changed for resource ${doc.id} - confidence should be recalculated on next load`,
              )
            }
          } catch (logError) {
            console.warn('[RESOURCES_HOOK] Error logging analyzeResult changes:', logError)
          }
        }
      },
    ],
  },
}
