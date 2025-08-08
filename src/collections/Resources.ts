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
        { label: 'Procesando', value: 'processing' },
        { label: 'Completado', value: 'completed' },
        { label: 'Fallido', value: 'failed' },
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
      path: '/:id/embeddings',
      method: 'post',
      handler: async (req) => {
        try {
          // Verificar autenticación
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
            depth: 2,
          })

          if (!resource) {
            return Response.json({ error: 'Resource not found' }, { status: 404 })
          }

          // Validar que el recurso está completado y tiene chunks
          if (resource.status !== 'completed') {
            return Response.json(
              {
                error: 'Resource must be completed before generating embeddings',
                currentStatus: resource.status,
                message: 'Please wait for document processing to complete first',
              },
              { status: 400 },
            )
          }

          if (!resource.chunks || resource.chunks.length === 0) {
            return Response.json(
              {
                error: 'No chunks available for embedding generation',
                message: 'The resource must have processed chunks to generate embeddings',
              },
              { status: 400 },
            )
          }

          // Convertir chunks de PayloadCMS al formato esperado por EmbeddingJob
          const embeddingChunks: any[] = resource.chunks.map((chunk: any, index: number) => {
            // Procesar contenido del chunk de documento
            const content = chunk.content || ''

            return {
              id: index + 1,
              namespace: resource.namespace,
              resourceId: resource.id,
              chunkIndex: index,
              pageNumber: chunk.pageNumber || 1,
              content: content,
              summary: chunk.summary || '',
              metadata: {
                chunkLength: content.length,
                pageNumber: chunk.pageNumber || 1,
                processingTime: 0, // No disponible en este contexto
              },
            }
          })

          // Crear job de embeddings
          const embeddingJob: EmbeddingJob = {
            resourceId: resource.id,
            namespace: resource.namespace,
            triggeredBy: 'manual',
            chunks: embeddingChunks,
            metadata: {
              documentTitle: resource.title || `Resource ${resource.id}`,
              totalPages: resource.processingMetadata?.pages || undefined,
              chunkCount: embeddingChunks.length,
            },
          }

          // Encolar job de embeddings
          const embeddingJobId = await QueueManager.enqueueEmbeddingGeneration(embeddingJob)

          // Agregar log de embedding job manual
          const currentLogs = resource.logs || []
          const newLog = {
            step: 'embedding-manual',
            status: 'started' as const,
            at: new Date().toISOString(),
            details: `Manual embedding generation job enqueued: ${embeddingJobId}`,
            data: {
              jobId: embeddingJobId,
              chunkCount: embeddingChunks.length,
              triggeredBy: 'manual',
              triggeredByUser: req.user.id,
              namespace: resource.namespace,
            },
          }

          // Actualizar resource con el nuevo log
          await req.payload.update({
            collection: 'resources',
            id: resourceId,
            data: {
              logs: [...currentLogs, newLog],
            },
          })

          const response = {
            resourceId: resource.id,
            embeddingJobId: embeddingJobId,
            chunkCount: embeddingChunks.length,
            namespace: resource.namespace,
            message: 'Embedding generation job enqueued successfully',
            estimatedTime: `${embeddingChunks.length * 2} seconds`,
            status: 'enqueued',
            triggeredBy: 'manual',
            triggeredAt: new Date().toISOString(),
          }

          return Response.json({
            success: true,
            data: response,
            message: 'Embedding generation started successfully',
          })
        } catch (error) {
          console.error('Error starting embedding generation:', error)

          if (error instanceof Error && error.message.includes('Authentication')) {
            const authError = createAuthErrorResponse(error.message)
            return Response.json(authError, { status: 401 })
          }

          return Response.json(
            {
              success: false,
              error: 'Internal server error while starting embedding generation',
              details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 },
          )
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
          data.status = 'completed'
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
