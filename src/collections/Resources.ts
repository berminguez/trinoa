import { createAuthErrorResponse } from '../lib/auth'
import { PineconeManager } from '../lib/pinecone'
import { QueueManager } from '../lib/queue'
import { StorageManager } from '../lib/storage'

import type { EmbeddingJob, Media } from '../types'
import type { CollectionConfig } from 'payload'

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
    defaultColumns: ['title', 'project', 'namespace', 'type', 'status', 'progress', 'updatedAt'],
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

    // ---- Campos globales (siempre visibles)
    { name: 'nombre_cliente', label: 'Nombre del cliente', type: 'text', required: false },
    { name: 'nombre_documento', label: 'Nombre del documento', type: 'text', required: false },

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
        { label: 'Combustible para calefacción', value: 'combustible' },
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

    // ---- Caso 1: Factura de suministros
    {
      name: 'factura_suministros',
      label: 'Factura de suministros',
      type: 'group',
      admin: { condition: (_, siblingData) => siblingData?.caso === 'factura_suministros' },
      fields: [
        { name: 'codigo_suministro', label: 'Código de suministro (CUPS / agua)', type: 'text' },
        {
          name: 'periodo_consumo',
          label: 'Periodo de consumo',
          type: 'group',
          fields: [
            { name: 'fecha_inicio', label: 'Fecha inicio', type: 'date' },
            { name: 'fecha_fin', label: 'Fecha fin', type: 'date' },
          ],
        },
        { name: 'fecha_compra', label: 'Fecha de compra (solo combustibles)', type: 'date' },
        { name: 'volumen_consumido', label: 'Volumen total consumido', type: 'number' },
        {
          name: 'unidad_medida',
          label: 'Unidad de medida',
          type: 'select',
          options: ['kWh', 'L', 'm3', 'kg', 'km'].map((v) => ({ label: v, value: v })),
        },
        { name: 'proveedor_servicio', label: 'Proveedor del servicio', type: 'text' },
        { name: 'codigo_factura', label: 'Código de la factura', type: 'text' },
      ],
    },

    // ---- Caso 2: Compras de combustible o servicios de taxi
    {
      name: 'desplazamientos',
      label: 'Compras de combustible / Taxi',
      type: 'group',
      admin: { condition: (_, siblingData) => siblingData?.caso === 'desplazamientos' },
      fields: [
        { name: 'fecha_servicio', label: 'Fecha del servicio', type: 'date' },
        {
          name: 'empresa_servicio',
          label: 'Empresa del servicio',
          type: 'select',
          options: ['Uber', 'Cabify', 'Taxi', 'Bolt', 'Otra'].map((v) => ({
            label: v,
            value: v.toLowerCase(),
          })),
        },
        { name: 'importe', label: 'Importe', type: 'number' },
        {
          name: 'moneda',
          label: 'Moneda',
          type: 'select',
          options: ['EUR', 'USD', 'GBP'].map((v) => ({ label: v, value: v })),
        },
        { name: 'cantidad_consumida', label: 'Cantidad consumida', type: 'number' },
        {
          name: 'unidad_medida',
          label: 'Unidad de medida',
          type: 'select',
          options: ['km', 'L'].map((v) => ({ label: v, value: v })),
        },
        {
          name: 'tipo_combustible',
          label: 'Tipo de combustible',
          type: 'select',
          options: ['gasolina', 'diesel', 'GLP', 'NA'].map((v) => ({
            label: v.toUpperCase(),
            value: v,
          })),
        },
        { name: 'codigo_factura', label: 'Código de la factura', type: 'text' },
      ],
    },

    // ---- Caso 3: Compras de materias primas
    {
      name: 'materias_primas',
      label: 'Compras de materias primas',
      type: 'group',
      admin: { condition: (_, siblingData) => siblingData?.caso === 'materias_primas' },
      fields: [
        { name: 'nombre_proveedor', label: 'Nombre del proveedor', type: 'text' },
        { name: 'fecha_factura', label: 'Fecha de facturación', type: 'date' },
        { name: 'codigo_factura', label: 'Código de la factura', type: 'text' },
        { name: 'tipo_producto', label: 'Tipo de producto (item)', type: 'text' },
        { name: 'descripcion_producto', label: 'Descripción del producto', type: 'textarea' },
        { name: 'peso_kg', label: 'Peso del producto (kg)', type: 'number' },
        { name: 'importe', label: 'Importe', type: 'number' },
        {
          name: 'moneda',
          label: 'Moneda',
          type: 'select',
          options: ['EUR', 'USD', 'GBP'].map((v) => ({ label: v, value: v })),
        },
      ],
    },

    // ---- Caso 4: Viajes realizados (tipo 2)
    {
      name: 'viajes_tipo_2',
      label: 'Viajes realizados (tipo 2)',
      type: 'group',
      admin: { condition: (_, siblingData) => siblingData?.caso === 'viajes_tipo_2' },
      fields: [
        { name: 'fecha_viaje', label: 'Fecha del viaje', type: 'date' },
        {
          name: 'medio_transporte',
          label: 'Medio de transporte',
          type: 'select',
          options: ['avion', 'tren', 'ferry', 'coche'].map((v) => ({
            label: v.toUpperCase(),
            value: v,
          })),
        },
        { name: 'origen', label: 'Origen (estación/aeropuerto)', type: 'text' },
        { name: 'destino', label: 'Destino (estación/aeropuerto)', type: 'text' },
        {
          name: 'escalas',
          label: 'Escalas',
          type: 'array',
          labels: { singular: 'Escala', plural: 'Escalas' },
          fields: [{ name: 'escala', label: 'Código escala', type: 'text' }],
        },
        { name: 'numero_personas', label: 'Nº de personas', type: 'number' },
        {
          name: 'categoria_billete',
          label: 'Categoría del billete',
          type: 'select',
          options: ['turista', 'preferente', 'business', 'primera'].map((v) => ({
            label: v,
            value: v,
          })),
        },
        {
          name: 'tipo_trayecto',
          label: 'Tipo de trayecto',
          type: 'select',
          options: [
            { label: 'Ida', value: 'ida' },
            { label: 'Ida y vuelta', value: 'ida_vuelta' },
          ],
        },
        { name: 'distancia', label: 'Distancia (km)', type: 'number' },
        { name: 'fuente_distancia', label: 'Fuente de la distancia', type: 'text' },
        { name: 'codigo_factura', label: 'Código de la factura', type: 'text' },
      ],
    },

    // ---- Caso 5: Variado de emails
    {
      name: 'variado_emails',
      label: 'Variado de emails',
      type: 'group',
      admin: { condition: (_, siblingData) => siblingData?.caso === 'variado_emails' },
      fields: [
        { name: 'remitente', label: 'Remitente', type: 'text' },
        { name: 'fecha', label: 'Fecha', type: 'date' },
        { name: 'descripcion_consumo', label: 'Descripción del consumo/dato', type: 'textarea' },
        { name: 'cantidad', label: 'Cantidad', type: 'number' },
        {
          name: 'unidad_medida',
          label: 'Unidad de medida',
          type: 'select',
          options: ['kWh', 'L', 'm3', 'kg', 'km', 'ud'].map((v) => ({ label: v, value: v })),
        },
      ],
    },

    // ---- Caso 6: Consumos de combustible (tipo 1)
    {
      name: 'consumos_combustible_tipo_1',
      label: 'Consumos de combustible (tipo 1)',
      type: 'group',
      admin: { condition: (_, siblingData) => siblingData?.caso === 'consumos_combustible_tipo_1' },
      fields: [
        {
          name: 'codigo_tarjeta_o_matricula',
          label: 'Tarjeta de combustible o matrícula',
          type: 'text',
        },
        { name: 'fecha_repostaje', label: 'Fecha de repostaje', type: 'date' },
        { name: 'cantidad_combustible', label: 'Cantidad repostada', type: 'number' },
        {
          name: 'unidad_medida',
          label: 'Unidad de medida',
          type: 'select',
          options: ['L', 'kg', 'kWh'].map((v) => ({ label: v, value: v })),
        },
        {
          name: 'tipo_combustible',
          label: 'Tipo de combustible',
          type: 'select',
          options: ['gasolina', 'diesel', 'GLP'].map((v) => ({ label: v.toUpperCase(), value: v })),
        },
        { name: 'importe', label: 'Importe', type: 'number' },
        {
          name: 'moneda',
          label: 'Moneda',
          type: 'select',
          options: ['EUR', 'USD', 'GBP'].map((v) => ({ label: v, value: v })),
        },
        { name: 'codigo_factura', label: 'Nº de factura', type: 'text' },
      ],
    },

    // ---- Caso 7: Residuos
    {
      name: 'residuos',
      label: 'Residuos',
      type: 'group',
      admin: { condition: (_, siblingData) => siblingData?.caso === 'residuos' },
      fields: [
        { name: 'codigo_recogida', label: 'Código de recogida', type: 'text' },
        { name: 'localizacion_recogida', label: 'Localización de la recogida', type: 'text' },
        { name: 'fecha_recogida', label: 'Fecha de recogida', type: 'date' },
        {
          name: 'tipo_residuo',
          label: 'Tipo de residuo',
          type: 'select',
          options: ['papel', 'plastico', 'organico', 'vidrio', 'mixto', 'peligroso', 'otro'].map(
            (v) => ({ label: v.charAt(0).toUpperCase() + v.slice(1), value: v }),
          ),
        },
        { name: 'cantidad_residuo', label: 'Cantidad', type: 'number' },
        {
          name: 'unidad_medida',
          label: 'Unidad',
          type: 'select',
          options: ['kg', 't'].map((v) => ({ label: v, value: v })),
        },
      ],
    },

    // ---- Caso 8: Viajes realizados (tipo 1)
    {
      name: 'viajes_tipo_1',
      label: 'Viajes realizados (tipo 1)',
      type: 'group',
      admin: { condition: (_, siblingData) => siblingData?.caso === 'viajes_tipo_1' },
      fields: [
        { name: 'fecha_viaje', label: 'Fecha del viaje', type: 'date' },
        {
          name: 'medio_transporte',
          label: 'Medio de transporte',
          type: 'select',
          options: ['avion', 'tren', 'ferry', 'coche'].map((v) => ({
            label: v.toUpperCase(),
            value: v,
          })),
        },
        { name: 'origen', label: 'Origen (estación/aeropuerto)', type: 'text' },
        { name: 'destino', label: 'Destino (estación/aeropuerto)', type: 'text' },
        {
          name: 'escalas',
          label: 'Escalas',
          type: 'array',
          labels: { singular: 'Escala', plural: 'Escalas' },
          fields: [{ name: 'escala', label: 'Código escala', type: 'text' }],
        },
        { name: 'numero_personas', label: 'Nº de personas', type: 'number' },
        {
          name: 'categoria_billete',
          label: 'Categoría del billete',
          type: 'select',
          options: ['turista', 'preferente', 'business', 'primera'].map((v) => ({
            label: v,
            value: v,
          })),
        },
        {
          name: 'tipo_trayecto',
          label: 'Tipo de trayecto',
          type: 'select',
          options: [
            { label: 'Ida', value: 'ida' },
            { label: 'Ida y vuelta', value: 'ida_vuelta' },
          ],
        },
        { name: 'distancia', label: 'Distancia (km)', type: 'number' },
        { name: 'fuente_distancia', label: 'Fuente de la distancia', type: 'text' },
        { name: 'codigo_factura', label: 'Código de la factura', type: 'text' },
      ],
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

          const analyzeResult = body?.analyzeResult
          if (!analyzeResult) {
            return Response.json(
              { success: false, error: 'Missing analyzeResult in body' },
              { status: 400 },
            )
          }

          // Construir data de actualización incluyendo caso/tipo si vienen en el body
          const updateData: any = {
            status: 'completed',
            analyzeResult: analyzeResult,
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

          // Actualizar el recurso: status -> completed y guardar analyzeResult, caso y tipo si aplica
          const updated = await req.payload.update({
            collection: 'resources',
            id: resourceId,
            data: updateData,
            overrideAccess: true,
          })

          return Response.json({ success: true, data: { id: updated.id } })
        } catch (error) {
          console.error('Error in resources webhook:', error)
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

          // Inicializar campos opcionales si no están presentes
          data.filters = data.filters || {}
          data.user_metadata = data.user_metadata || {}
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
              return
            }

            const method = String(automation.httpMethod || 'POST').toUpperCase()
            const url = String(automation.url)
            console.log('[AUTOMATION] Preparing webhook call:', { method, url })

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

            // Intentar obtener URL del media. Preferir URL firmada S3 si filename existe
            let fileUrl: string | null = null
            let fileMeta: any = undefined
            try {
              const media =
                typeof (doc as any).file === 'string'
                  ? await req.payload.findByID({
                      collection: 'media',
                      id: String((doc as any).file),
                    })
                  : ((doc as any).file as any)
              fileMeta = media
                ? {
                    id: String((media as any)?.id ?? ''),
                    filename: (media as any)?.filename ?? undefined,
                    filesize: (media as any)?.filesize ?? undefined,
                    mimeType: (media as any)?.mimeType ?? (media as any)?.mime_type ?? undefined,
                  }
                : undefined
              const rawUrl = (media as any)?.url ?? null
              if (rawUrl) {
                const isAbsolute = /^https?:\/\//i.test(String(rawUrl))
                if (isAbsolute) {
                  fileUrl = String(rawUrl)
                } else {
                  // Base URL desde configuración o cabeceras
                  const configuredBase: string | undefined =
                    configuracion?.seo?.baseUrl || configuracion?.brand?.baseUrl
                  const headerHost = (req as any)?.headers?.host as string | undefined
                  const headerProto =
                    ((req as any)?.headers?.['x-forwarded-proto'] as string | undefined) || 'https'
                  const derivedBase = headerHost ? `${headerProto}://${headerHost}` : undefined
                  const base = configuredBase || derivedBase
                  fileUrl = base ? `${base}${String(rawUrl)}` : String(rawUrl)
                }
              }
              // Si disponemos de filename (clave en S3), generamos URL firmada prioritaria
              const s3Key = (media as any)?.filename as string | undefined
              if (s3Key) {
                try {
                  const signed = await StorageManager.getSignedUrl(s3Key, 3600)
                  fileUrl = signed
                } catch (e) {
                  console.warn(
                    '[AUTOMATION] Failed to create signed URL, falling back to raw url:',
                    e,
                  )
                }
              }
            } catch {}

            if (method === 'GET') {
              const u = new URL(url)
              u.searchParams.set('event', 'resource.created')
              u.searchParams.set('resourceId', String(doc.id))
              u.searchParams.set('namespace', String((doc as any).namespace || ''))
              u.searchParams.set('type', String((doc as any).type || ''))
              if (fileUrl) u.searchParams.set('fileUrl', String(fileUrl))
              fetchUrl = u.toString()
            } else {
              // POST: siempre enviamos cuerpo JSON mínimo
              headers['Content-Type'] = 'application/json'

              const minimalFile = fileMeta
                ? {
                    filename: fileMeta.filename,
                    filesize: fileMeta.filesize,
                    mimeType: fileMeta.mimeType,
                  }
                : undefined

              // Valores de caso y tipo_suministro (solo aplica cuando caso === 'factura_suministros')
              const casoValue = (doc as any)?.caso as string | undefined
              const tipo = (doc as any)?.tipo as string | undefined
              const tipoSuministroValue =
                casoValue === 'factura_suministros'
                  ? (((doc as any)?.factura_suministros as any)?.tipo_suministro as
                      | string
                      | undefined)
                  : undefined

              const payloadBody = {
                event: 'resource.created',
                resourceId: String(doc.id),
                namespace: String((doc as any).namespace || ''),
                type: String((doc as any).type || ''),
                fileUrl,
                file: minimalFile,
                // Si no existen, JSON.stringify omitirá estas propiedades (equivalente a undefined)
                caso: casoValue,
                tipo: tipo,
                tipo_suministro: tipoSuministroValue,
              }
              init.body = JSON.stringify(payloadBody)
            }

            init.headers = headers

            // Timeout de 10s por seguridad
            const controller = new AbortController()
            const timer = setTimeout(() => controller.abort(), 10000)
            ;(init as any).signal = controller.signal
            console.log('[AUTOMATION] Calling webhook...', {
              fetchUrl,
              method,
              headers: Object.keys(headers),
            })
            const res = await fetch(fetchUrl, init)
            clearTimeout(timer)
            const ok = res.ok
            const status = res.status
            console.log('[AUTOMATION] Webhook response:', { ok, status })
            let responseText = ''
            try {
              responseText = await res.text()
            } catch {}

            // Añadir log del webhook
            const currentLogs = Array.isArray((doc as any).logs) ? (doc as any).logs : []
            const newLog = {
              step: 'automation-webhook',
              status: ok ? ('success' as const) : ('error' as const),
              at: new Date().toISOString(),
              details: ok
                ? `Webhook enviado correctamente (status ${status})`
                : `Webhook falló (status ${status})`,
              data: {
                url: fetchUrl,
                method,
                headers: Object.keys(headers),
                responsePreview: responseText?.slice(0, 300),
              },
            }

            // Si la respuesta fue OK, marcamos el recurso como processing
            const updateData: any = { logs: [...currentLogs, newLog] }
            if (ok) {
              updateData.status = 'processing'
              updateData.startedAt = (doc as any).startedAt || new Date().toISOString()
            } else {
              updateData.status = 'failed'
            }

            await req.payload.update({
              collection: 'resources',
              id: String(doc.id),
              data: updateData,
              overrideAccess: true,
            })
          } catch (error) {
            // No interrumpir el flujo por errores del webhook; solo loggear
            console.error('[AUTOMATION] Exception while sending webhook:', error)
            try {
              const current = await req.payload.findByID({
                collection: 'resources',
                id: String(doc.id),
              })
              const currentLogs = Array.isArray((current as any).logs) ? (current as any).logs : []
              const errLog = {
                step: 'automation-webhook',
                status: 'error' as const,
                at: new Date().toISOString(),
                details: 'Excepción al enviar webhook',
                data: { error: String(error) },
              }
              await req.payload.update({
                collection: 'resources',
                id: String(doc.id),
                data: { logs: [...currentLogs, errLog] },
                overrideAccess: true,
              })
            } catch {}
          }
        }

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
      },
    ],
  },
}
