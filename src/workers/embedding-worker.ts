// ============================================================================
// EIDETIK MVP - EMBEDDING PROCESSING WORKER
// ============================================================================

import 'dotenv/config'
import { getPayload } from 'payload'

import { ChunkProcessor } from '@/lib/embeddings/chunk-processor'
import { EmbeddingGenerator } from '@/lib/embeddings/generator'
import { VectorManager } from '@/lib/embeddings/vector-manager'
import { QueueManager } from '@/lib/queue'
import config from '@/payload.config'

import type { EmbeddingJob, VideoChunk } from '@/types'

/**
 * Worker dedicado para procesamiento de embeddings
 * Orquesta el pipeline: obtener chunks → formatear para embeddings → generar embeddings → almacenar en Pinecone
 */
class EmbeddingWorker {
  private isRunning = false
  private name: string

  constructor(name: string = 'embedding-worker-1') {
    this.name = name
  }

  /**
   * Inicia el worker para procesar jobs de embeddings
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log(`[${this.name}] Worker is already running`)
      return
    }

    console.log(`🚀 [${this.name}] Starting embedding processing worker`)

    try {
      // Inicializar el sistema de cola
      await QueueManager.initialize()

      this.isRunning = true
      console.log(`✅ [${this.name}] Embedding processing worker started successfully`)

      // Manejar señales de cierre limpio
      this.setupGracefulShutdown()
    } catch (error) {
      console.error(`❌ [${this.name}] Failed to start embedding processing worker:`, error)
      throw error
    }
  }

  /**
   * Procesa un job de embeddings completo (método estático para uso desde QueueManager)
   */
  static async processEmbeddingJob(job: EmbeddingJob): Promise<void> {
    const { resourceId, namespace, triggeredBy, chunks, metadata } = job

    console.log(`[EMBEDDING-WORKER] 🔮 Starting embedding generation for resource ${resourceId}`)
    console.log(`[EMBEDDING-WORKER] 📁 Namespace: ${namespace}, Chunks: ${chunks?.length || 0}`)
    console.log(`[EMBEDDING-WORKER] 🎯 Triggered by: ${triggeredBy}`)

    // Configurar timeout de 5 minutos
    const TIMEOUT_MS = 5 * 60 * 1000 // 5 minutos
    let timeoutId: NodeJS.Timeout | null = null

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(`Job timeout after ${TIMEOUT_MS / 1000} seconds`))
      }, TIMEOUT_MS)
    })

    try {
      // Correr el procesamiento principal con timeout
      await Promise.race([
        EmbeddingWorker.runEmbeddingProcessing(
          resourceId,
          namespace,
          triggeredBy,
          chunks,
          metadata,
        ),
        timeoutPromise,
      ])
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error(
        `[EMBEDDING-WORKER] ❌ Embedding processing failed for resource ${resourceId}:`,
        errorMessage,
      )

      // Intentar actualizar el resource con información de error
      try {
        const payload = await getPayload({ config })
        const currentResource = await payload.findByID({
          collection: 'resources',
          id: resourceId,
        })

        const errorLog = {
          step: 'embedding-processing',
          status: 'error' as const,
          at: new Date().toISOString(),
          details: `Embedding processing failed: ${errorMessage}`,
          data: { error: errorMessage, resourceId, namespace },
        }

        const existingLogs = currentResource.logs || []
        const combinedLogs = [...existingLogs, errorLog]

        await payload.update({
          collection: 'resources',
          id: resourceId,
          data: {
            logs: combinedLogs,
            embeddingStatus: 'failed' as const,
            embeddingError: errorMessage,
          } as any,
        })

        console.log(`[EMBEDDING-WORKER] 📝 Resource updated with error information`)
      } catch (updateError) {
        console.error(`[EMBEDDING-WORKER] Failed to update resource with error:`, updateError)
      }

      throw error
    } finally {
      // Limpiar timeout si aún está activo
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }

  /**
   * Ejecuta el procesamiento principal de embeddings
   */
  private static async runEmbeddingProcessing(
    resourceId: string,
    namespace: string,
    triggeredBy: 'video-processing' | 'manual' | 'api',
    chunks: VideoChunk[],
    metadata?: { videoTitle?: string; totalDuration?: number; chunkCount?: number },
  ): Promise<void> {
    // ========================================================================
    // PASO 1: VALIDACIÓN INICIAL
    // ========================================================================
    console.log(`[EMBEDDING-WORKER] 🔍 Step 1/6: Validating input data`)

    if (!chunks || chunks.length === 0) {
      throw new Error('No chunks provided for embedding generation')
    }

    if (!resourceId || !namespace) {
      throw new Error('Missing required fields: resourceId or namespace')
    }

    console.log(`[EMBEDDING-WORKER] ✅ Input validation passed: ${chunks.length} chunks`)

    // ========================================================================
    // PASO 2: OBTENER INSTANCIAS DE SERVICIOS
    // ========================================================================
    console.log(`[EMBEDDING-WORKER] 🔧 Step 2/6: Initializing embedding services`)

    const embeddingGenerator = EmbeddingGenerator.getInstance()
    const vectorManager = VectorManager.getInstance()
    const chunkProcessor = ChunkProcessor.getInstance()

    // Health check de servicios
    const generatorHealth = await embeddingGenerator.healthCheck()
    const vectorHealth = await vectorManager.healthCheck()
    const processorHealth = await chunkProcessor.healthCheck()

    if (!generatorHealth.healthy || !vectorHealth.healthy || !processorHealth.healthy) {
      throw new Error('One or more embedding services are unhealthy')
    }

    console.log(`[EMBEDDING-WORKER] ✅ All embedding services are healthy`)

    // ========================================================================
    // PASO 3: FORMATEAR CHUNKS PARA EMBEDDINGS
    // ========================================================================
    console.log(`[EMBEDDING-WORKER] 📝 Step 3/6: Formatting chunks for embeddings`)

    const formatResult = await chunkProcessor.formatChunksBatch(chunks, {
      videoTitle: metadata?.videoTitle,
      totalDuration: metadata?.totalDuration,
    })

    if (!formatResult.success) {
      throw new Error(
        `Chunk formatting failed: ${formatResult.results.find((r) => !r.success)?.error}`,
      )
    }

    const formattedChunks = formatResult.results.filter((r) => r.success)
    console.log(
      `[EMBEDDING-WORKER] ✅ Chunks formatted successfully: ${formattedChunks.length}/${chunks.length}`,
    )

    if (formattedChunks.length === 0) {
      throw new Error('No chunks were successfully formatted for embeddings')
    }

    // ========================================================================
    // PASO 4: GENERAR EMBEDDINGS
    // ========================================================================
    console.log(`[EMBEDDING-WORKER] 🧮 Step 4/6: Generating embeddings with OpenAI`)

    const textsToEmbed = formattedChunks.map((chunk) => chunk.formattedText)
    const embeddingResult = await embeddingGenerator.generateEmbeddingsBatch(textsToEmbed)

    if (!embeddingResult.success) {
      throw new Error(`Embedding generation failed: ${embeddingResult.error}`)
    }

    console.log(
      `[EMBEDDING-WORKER] ✅ Embeddings generated successfully: ${embeddingResult.embeddings.length} vectors`,
    )

    // ========================================================================
    // PASO 5: PREPARAR VECTORES PARA PINECONE
    // ========================================================================
    console.log(`[EMBEDDING-WORKER] 🎯 Step 5/6: Preparing vectors for Pinecone`)

    const vectors = embeddingResult.embeddings.map((embedding, index) => {
      const chunk = formattedChunks[index]
      const originalChunk = chunks[index]

      return {
        id: `${resourceId}--chunk-${chunk.metadata.chunkIndex}`,
        values: embedding,
        metadata: {
          // Campos principales
          resourceId,
          namespace,
          chunkIndex: chunk.metadata.chunkIndex,

          // Campos temporales
          start_ms: chunk.metadata.start_ms,
          end_ms: chunk.metadata.end_ms,

          // Campo requerido por VectorMetadata
          segmentId: `${resourceId}--chunk-${chunk.metadata.chunkIndex}`,

          // Campos legacy (compatibilidad)
          startTime: originalChunk.timeStart,
          endTime: originalChunk.timeEnd,

          // Contenido
          transcript: originalChunk.transcription
            ? typeof originalChunk.transcription === 'string'
              ? originalChunk.transcription
              : JSON.stringify(originalChunk.transcription)
            : '',
          description: originalChunk.description || '',

          // Metadatos adicionales
          type: 'video' as const,
          fileName: metadata?.videoTitle || 'unknown',
        },
      }
    })

    console.log(
      `[EMBEDDING-WORKER] ✅ Vector preparation completed: ${vectors.length} vectors ready`,
    )

    // ========================================================================
    // PASO 6: ALMACENAR EN PINECONE
    // ========================================================================
    console.log(`[EMBEDDING-WORKER] 📌 Step 6/6: Storing vectors in Pinecone`)

    const upsertResult = await vectorManager.upsertVectors(vectors)

    if (!upsertResult.success) {
      throw new Error(`Vector storage failed: ${upsertResult.error}`)
    }

    console.log(
      `[EMBEDDING-WORKER] ✅ Vectors stored successfully in Pinecone: ${upsertResult.upsertedCount} vectors`,
    )

    // ========================================================================
    // PASO 7: ACTUALIZAR RESOURCE EN PAYLOADCMS
    // ========================================================================
    console.log(`[EMBEDDING-WORKER] 💾 Step 7/7: Updating Resource in PayloadCMS`)

    const payload = await getPayload({ config })

    // Obtener el resource actual para preservar datos existentes
    const currentResource = await payload.findByID({
      collection: 'resources',
      id: resourceId,
    })

    // Preparar logs del proceso de embeddings
    const embeddingLogs = [
      {
        step: 'validation',
        status: 'success' as const,
        at: new Date().toISOString(),
        details: `Input validation passed: ${chunks.length} chunks`,
        data: { chunkCount: chunks.length, namespace, triggeredBy },
      },
      {
        step: 'chunk-formatting',
        status: 'success' as const,
        at: new Date().toISOString(),
        details: `Chunks formatted for embeddings: ${formattedChunks.length}/${chunks.length}`,
        data: {
          successfulChunks: formattedChunks.length,
          failedChunks: chunks.length - formattedChunks.length,
          averageTextLength: formatResult.metadata.averageTextLength,
          processingTime: formatResult.metadata.totalProcessingTimeMs,
        },
      },
      {
        step: 'embedding-generation',
        status: 'success' as const,
        at: new Date().toISOString(),
        details: `Embeddings generated: ${embeddingResult.embeddings.length} vectors`,
        data: {
          vectorCount: embeddingResult.embeddings.length,
          model: embeddingResult.metadata.model,
          totalTexts: embeddingResult.metadata.totalTexts,
          processingTime: embeddingResult.metadata.totalProcessingTimeMs,
        },
      },
      {
        step: 'vector-storage',
        status: 'success' as const,
        at: new Date().toISOString(),
        details: `Vectors stored in Pinecone: ${upsertResult.upsertedCount} vectors`,
        data: {
          vectorsStored: upsertResult.upsertedCount,
          namespace,
          processingTime: upsertResult.metadata.processingTimeMs,
        },
      },
    ]

    // Combinar logs existentes con los nuevos
    const existingLogs = currentResource.logs || []
    const combinedLogs = [...existingLogs, ...embeddingLogs]

    // Actualizar metadatos de procesamiento
    const existingMetadata = currentResource.processingMetadata || {}
    const updatedMetadata = {
      ...existingMetadata,
      embeddingsGenerated: embeddingResult.embeddings.length,
      vectorsGenerated: upsertResult.upsertedCount,
      embeddingModel: embeddingResult.metadata.model,
      jobIds: [
        ...(existingMetadata.jobIds || []),
        {
          jobId: `embedding-${resourceId}`,
          type: 'embedding-generation' as const,
        },
      ],
    }

    // Actualizar el resource
    await payload.update({
      collection: 'resources',
      id: resourceId,
      data: {
        logs: combinedLogs,
        processingMetadata: updatedMetadata,
        embeddingStatus: 'completed' as const,
        embeddingCompletedAt: new Date().toISOString(),
      } as any,
    })

    console.log(`[EMBEDDING-WORKER] 📊 Resource updated with embedding data:`)
    console.log(`  - Embeddings generated: ${embeddingResult.embeddings.length}`)
    console.log(`  - Vectors stored: ${upsertResult.upsertedCount}`)
    console.log(`  - Processing time: ${embeddingResult.metadata.totalProcessingTimeMs}ms`)
    console.log(`  - Total texts: ${embeddingResult.metadata.totalTexts}`)

    console.log(
      `[EMBEDDING-WORKER] 🎉 Embedding processing completed successfully for resource ${resourceId}`,
    )
  }

  /**
   * Detiene el worker de forma limpia
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      console.log(`[${this.name}] Worker is not running`)
      return
    }

    console.log(`🔄 [${this.name}] Stopping embedding processing worker...`)

    try {
      await QueueManager.shutdown()
      this.isRunning = false
      console.log(`🔴 [${this.name}] Embedding processing worker stopped successfully`)
    } catch (error) {
      console.error(`❌ [${this.name}] Error stopping embedding processing worker:`, error)
      throw error
    }
  }

  /**
   * Verifica el estado del worker
   */
  async healthCheck(): Promise<{
    worker: string
    status: 'healthy' | 'unhealthy'
    uptime: number
    queue: {
      healthy: boolean
      agenda: boolean
      mongodb: boolean
    }
    services: {
      generator: boolean
      vectorManager: boolean
      chunkProcessor: boolean
    }
  }> {
    const startTime = process.uptime()
    const queueHealth = await QueueManager.healthCheck()

    // Health check de servicios de embeddings
    let servicesHealthy = true
    let generatorHealthy = false
    let vectorManagerHealthy = false
    let chunkProcessorHealthy = false

    try {
      const generatorHealth = await EmbeddingGenerator.getInstance().healthCheck()
      const vectorHealth = await VectorManager.getInstance().healthCheck()
      const processorHealth = await ChunkProcessor.getInstance().healthCheck()

      generatorHealthy = generatorHealth.healthy
      vectorManagerHealthy = vectorHealth.healthy
      chunkProcessorHealthy = processorHealth.healthy

      servicesHealthy = generatorHealthy && vectorManagerHealthy && chunkProcessorHealthy
    } catch (error) {
      console.error(`[${this.name}] Services health check failed:`, error)
      servicesHealthy = false
    }

    return {
      worker: this.name,
      status: this.isRunning && queueHealth.healthy && servicesHealthy ? 'healthy' : 'unhealthy',
      uptime: startTime,
      queue: {
        healthy: queueHealth.healthy,
        agenda: queueHealth.agenda,
        mongodb: queueHealth.mongodb,
      },
      services: {
        generator: generatorHealthy,
        vectorManager: vectorManagerHealthy,
        chunkProcessor: chunkProcessorHealthy,
      },
    }
  }

  /**
   * Obtiene estadísticas del worker
   */
  async getStats(): Promise<{
    worker: string
    isRunning: boolean
    queueStats: {
      pending: number
      running: number
      completed: number
      failed: number
    }
    embeddingStats: {
      openaiHealthy: boolean
      pineconeHealthy: boolean
      processorHealthy: boolean
    }
  }> {
    const queueStats = await QueueManager.getQueueStats()

    // Obtener estadísticas de servicios
    let openaiHealthy = false
    let pineconeHealthy = false
    let processorHealthy = false

    try {
      const generatorHealth = await EmbeddingGenerator.getInstance().healthCheck()
      const vectorHealth = await VectorManager.getInstance().healthCheck()
      const chunkHealth = await ChunkProcessor.getInstance().healthCheck()

      openaiHealthy = generatorHealth.healthy
      pineconeHealthy = vectorHealth.healthy
      processorHealthy = chunkHealth.healthy
    } catch (error) {
      console.error(`[${this.name}] Error getting embedding stats:`, error)
    }

    return {
      worker: this.name,
      isRunning: this.isRunning,
      queueStats: {
        pending: queueStats.pending,
        running: queueStats.running,
        completed: queueStats.completed,
        failed: queueStats.failed,
      },
      embeddingStats: {
        openaiHealthy,
        pineconeHealthy,
        processorHealthy,
      },
    }
  }

  /**
   * Configura el cierre limpio del worker
   */
  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      console.log(`[${this.name}] Received ${signal}. Starting graceful shutdown...`)
      try {
        await this.stop()
        console.log(`[${this.name}] Graceful shutdown completed`)
        process.exit(0)
      } catch (error) {
        console.error(`[${this.name}] Error during shutdown:`, error)
        process.exit(1)
      }
    }

    process.on('SIGTERM', () => shutdown('SIGTERM'))
    process.on('SIGINT', () => shutdown('SIGINT'))
    process.on('SIGQUIT', () => shutdown('SIGQUIT'))
  }
}

export { EmbeddingWorker }
