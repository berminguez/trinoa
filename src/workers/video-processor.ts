// ============================================================================
// EIDETIK MVP - VIDEO PROCESSING WORKER
// ============================================================================

import 'dotenv/config'
import { getPayload } from 'payload'

import { processVideoChunks, type ScreenshotInfo } from '@/lib/video/chunk-processor'
import { VideoDownloader } from '@/lib/video/downloader'
import { VideoFrameExtractor, type FrameInfo } from '@/lib/video/frame-extractor'
import { uploadFrames } from '@/lib/video/media-uploader'
import { VideoSceneDetector } from '@/lib/video/scene-detector'
import { VideoTranscriber } from '@/lib/video/transcriber'
import { describeFrames } from '@/lib/video/vision-describer'
import config from '@/payload.config'

import { QueueManager } from '../lib/queue'

import type { VideoProcessingJob, EmbeddingJob, VideoChunk } from '../types'

// Importar todos los servicios del pipeline

/**
 * Worker dedicado para procesamiento completo de vídeos
 * Orquesta todo el pipeline: descarga → transcripción → detección de escenas →
 * extracción de frames → descripción visual → upload → chunks → síntesis final
 */
class VideoProcessingWorker {
  private isRunning = false
  private name: string

  constructor(name: string = 'video-worker-1') {
    this.name = name
  }

  /**
   * Inicia el worker para procesar jobs de video
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log(`[${this.name}] Worker is already running`)
      return
    }

    console.log(`🚀 [${this.name}] Starting video processing worker`)

    try {
      // Inicializar el sistema de cola
      await QueueManager.initialize()

      // El QueueManager ya tiene los jobs definidos internamente
      // No necesitamos registrar handlers adicionales aquí

      this.isRunning = true
      console.log(`✅ [${this.name}] Video processing worker started successfully`)

      // Manejar señales de cierre limpio
      this.setupGracefulShutdown()
    } catch (error) {
      console.error(`❌ [${this.name}] Failed to start video processing worker:`, error)
      throw error
    }
  }

  /**
   * Procesa un job de video completo (método estático para uso desde QueueManager)
   */
  static async processVideoJob(job: VideoProcessingJob): Promise<void> {
    const { resourceId, videoUrl, fileName, namespace, filters, user_metadata } = job

    console.log(`[VIDEO-WORKER] 🎬 Starting video processing for resource ${resourceId}`)
    console.log(`[VIDEO-WORKER] 📁 Namespace: ${namespace}, File: ${fileName}`)

    let downloadResult: any = null
    const tempFrames: FrameInfo[] = []

    try {
      // ========================================================================
      // PASO 1: DESCARGA DEL VIDEO
      // ========================================================================
      console.log(`[${this.name}] 📥 Step 1/6: Downloading video from S3`)

      downloadResult = await VideoDownloader.downloadVideo(job)
      if (!downloadResult.success) {
        throw new Error(`Download failed: ${downloadResult.error}`)
      }

      console.log(`[${this.name}] ✅ Video downloaded successfully: ${downloadResult.localPath}`)

      // ========================================================================
      // PASO 2: TRANSCRIPCIÓN CON WHISPER
      // ========================================================================
      console.log(`[${this.name}] 🎤 Step 2/6: Transcribing audio with Whisper`)

      const transcriptionResult = await VideoTranscriber.transcribeVideo(downloadResult.localPath)
      if (!transcriptionResult.success) {
        throw new Error(`Transcription failed: ${transcriptionResult.error}`)
      }

      console.log(
        `[${this.name}] ✅ Transcription completed: ${transcriptionResult.metadata?.segmentCount} segments`,
      )

      // Guardar transcripción inmediatamente en el resource
      console.log(`[${this.name}] 💾 Saving transcription to resource immediately`)
      await VideoTranscriber.saveTranscriptionToResource(resourceId, transcriptionResult)
      console.log(`[${this.name}] ✅ Transcription saved to resource successfully`)

      // ========================================================================
      // PASO 3: DETECCIÓN DE ESCENAS
      // ========================================================================
      console.log(`[${this.name}] 🎞️ Step 3/6: Detecting scenes with PySceneDetect`)

      const scenesResult = await VideoSceneDetector.detectScenes(downloadResult.localPath)
      if (!scenesResult.success) {
        throw new Error(`Scene detection failed: ${scenesResult.error}`)
      }

      console.log(
        `[${this.name}] ✅ Scene detection completed: ${scenesResult.scenes?.length} scenes`,
      )

      // ========================================================================
      // PASO 4: EXTRACCIÓN DE FRAMES
      // ========================================================================
      console.log(`[${this.name}] 📸 Step 4/6: Extracting key frames with FFmpeg`)

      const frameExtractionResult = await VideoFrameExtractor.extractFramesFromScenes(
        downloadResult.localPath,
        scenesResult.scenes || [],
      )

      if (!frameExtractionResult.success) {
        throw new Error(`Frame extraction failed: ${frameExtractionResult.error}`)
      }

      const tempFrames = frameExtractionResult.frames
      const successfulFrames = tempFrames.map((frame, index) => ({
        success: true,
        framePath: frame.filePath,
        timestamp: frame.timestamp_ms,
        frameInfo: frame,
      }))
      console.log(`[${this.name}] ✅ Frame extraction completed: ${successfulFrames.length} frames`)

      // ========================================================================
      // PASO 5: DESCRIPCIÓN VISUAL CON GPT-4o VISION
      // ========================================================================
      console.log(`[${this.name}] 👁️ Step 5/6: Analyzing frames with GPT-4o Vision`)

      const visionRequests = successfulFrames.map((frame, index) => ({
        framePath: frame.framePath,
        sceneNumber: index + 1,
        timestamp: frame.timestamp,
        context: {
          namespace,
          videoTitle: fileName,
        },
      }))

      const visionResults = await describeFrames(visionRequests)
      const successfulVisions = visionResults.filter((v) => 'shortDescription' in v)

      console.log(
        `[${this.name}] ✅ Vision analysis completed: ${successfulVisions.length} descriptions`,
      )

      // ========================================================================
      // PASO 6: UPLOAD DE FRAMES A PAYLOADCMS
      // ========================================================================
      console.log(`[${this.name}] ☁️ Step 6/6: Uploading frames to PayloadCMS`)

      const uploadRequests = successfulVisions.map((vision, index) => {
        const frameResult = successfulFrames[index]
        return {
          framePath: frameResult.framePath,
          sceneNumber: vision.metadata.sceneNumber,
          timestamp: vision.metadata.timestamp,
          shortDescription: vision.shortDescription,
          description: vision.description,
          metadata: {
            resourceId,
            namespace,
            videoFileName: fileName,
            sceneTimestamp: vision.metadata.timestamp,
            frameQuality: process.env.FRAME_QUALITY || '720p',
            extractionMethod: 'scene-detection',
          },
        }
      })

      const uploadResults = await uploadFrames(uploadRequests)
      const successfulUploads = uploadResults.filter((u) => u.success)

      console.log(
        `[${this.name}] ✅ Frame upload completed: ${successfulUploads.length} frames uploaded`,
      )

      // ========================================================================
      // PASO 7: PROCESAMIENTO DE CHUNKS Y SÍNTESIS GLOBAL
      // ========================================================================
      console.log(`[${this.name}] 🧩 Step 7/7: Processing chunks and global synthesis`)

      // Preparar screenshots info para el chunk processor
      const screenshots: ScreenshotInfo[] = successfulUploads.map((upload, index) => ({
        id: upload.mediaId,
        timestamp: upload.metadata.timestamp, // Ya está en milisegundos desde el frame extractor
        sceneNumber: upload.metadata.sceneNumber,
        shortDescription: uploadRequests[index].shortDescription,
        description: uploadRequests[index].description,
        mediaUrl: upload.mediaUrl,
      }))

      // Obtener duración del video (estimada de la transcripción)
      const lastSegment =
        transcriptionResult.transcription[transcriptionResult.transcription.length - 1]
      const videoDuration = lastSegment ? lastSegment.end_ms : 60000 // fallback 1 minuto

      const chunkProcessingRequest = {
        videoDuration,
        transcriptionSegments: transcriptionResult.transcription,
        screenshots,
        namespace,
        resourceId,
        videoTitle: fileName,
      }

      const chunksResult = await processVideoChunks(chunkProcessingRequest)
      if (!chunksResult.success) {
        throw new Error(`Chunk processing failed: ${chunksResult.error}`)
      }

      console.log(
        `[${this.name}] ✅ Chunk processing completed: ${chunksResult.chunks?.length} chunks`,
      )

      // ========================================================================
      // PASO 8: ACTUALIZACIÓN FINAL DEL RESOURCE EN PAYLOADCMS
      // ========================================================================
      console.log(`[${this.name}] 💾 Updating Resource in PayloadCMS with final data`)

      const payload = await getPayload({ config })

      // Preparar screenshots array para PayloadCMS
      const screenshotsArray = successfulUploads.map((upload, index) => ({
        image: upload.mediaId, // ID de la imagen en Media collection
        timestamp: upload.metadata.timestamp, // Timestamp en milisegundos
        shortDescription: uploadRequests[index].shortDescription,
        description: uploadRequests[index].description,
      }))

      // Preparar chunks array para PayloadCMS
      const chunksArray =
        chunksResult.chunks?.map((chunk) => ({
          timeStart: chunk.timeStart,
          timeEnd: chunk.timeEnd,
          transcription: JSON.stringify(chunk.transcription || []),
          description: chunk.description,
          screenshots:
            chunk.screenshots?.map((screenshotId) => ({
              screenshotId: screenshotId, // screenshotId ya es un string
            })) || [],
        })) || []

      // Preparar logs array del proceso
      const logsArray = [
        {
          step: 'download',
          status: 'success' as const,
          at: new Date().toISOString(),
          details: `Video downloaded successfully: ${fileName}`,
          data: { fileSize: downloadResult.fileSize, duration: downloadResult.duration },
        },
        {
          step: 'transcription',
          status: 'success' as const,
          at: new Date().toISOString(),
          details: `Transcription completed: ${transcriptionResult.metadata?.segmentCount} segments`,
          data: {
            language: transcriptionResult.language,
            segmentCount: transcriptionResult.metadata?.segmentCount,
            processingTime: transcriptionResult.metadata?.processingTimeMs,
          },
        },
        {
          step: 'scene-detection',
          status: 'success' as const,
          at: new Date().toISOString(),
          details: `Scene detection completed: ${scenesResult.scenes?.length} scenes`,
          data: {
            sceneCount: scenesResult.scenes?.length,
            threshold: scenesResult.metadata?.threshold,
            processingTime: scenesResult.metadata?.processingTimeMs,
          },
        },
        {
          step: 'frame-extraction',
          status: 'success' as const,
          at: new Date().toISOString(),
          details: `Frame extraction completed: ${successfulFrames.length} frames`,
          data: { frameCount: successfulFrames.length },
        },
        {
          step: 'vision-analysis',
          status: 'success' as const,
          at: new Date().toISOString(),
          details: `Vision analysis completed: ${successfulVisions.length} descriptions`,
          data: { descriptionCount: successfulVisions.length },
        },
        {
          step: 'upload',
          status: 'success' as const,
          at: new Date().toISOString(),
          details: `Frame upload completed: ${successfulUploads.length} frames uploaded`,
          data: { uploadCount: successfulUploads.length },
        },
        {
          step: 'chunk-processing',
          status: 'success' as const,
          at: new Date().toISOString(),
          details: `Chunk processing completed: ${chunksResult.chunks?.length} chunks`,
          data: { chunkCount: chunksResult.chunks?.length },
        },
      ]

      // ========================================================================
      // PASO 7.5: DISPARAR JOB DE EMBEDDINGS AUTOMÁTICAMENTE
      // ========================================================================
      console.log(`[${this.name}] 🔮 Step 7.5/8: Triggering automatic embedding generation`)

      if (chunksResult.chunks && chunksResult.chunks.length > 0) {
        try {
          // Convertir chunks del video processing al formato esperado por EmbeddingWorker
          const embeddingChunks: VideoChunk[] = chunksResult.chunks.map((chunk, index) => ({
            id: chunk.id,
            start_ms: chunk.start_ms,
            end_ms: chunk.end_ms,
            namespace: chunk.namespace,
            resourceId: chunk.resourceId,
            chunkIndex: chunk.chunkIndex,
            timeStart: chunk.timeStart, // Compatibilidad legacy
            timeEnd: chunk.timeEnd, // Compatibilidad legacy
            transcription: chunk.transcription,
            description: chunk.description,
            screenshots: chunk.screenshots,
            metadata: chunk.metadata,
          }))

          // Crear job de embeddings
          const embeddingJob: EmbeddingJob = {
            resourceId,
            namespace,
            triggeredBy: 'video-processing',
            chunks: embeddingChunks,
            metadata: {
              videoTitle: fileName,
              totalDuration: videoDuration,
              chunkCount: embeddingChunks.length,
            },
          }

          // Encolar job de embeddings para procesamiento automático
          const embeddingJobId = await QueueManager.enqueueEmbeddingGeneration(embeddingJob)

          console.log(
            `[${this.name}] ✅ Embedding job enqueued successfully: ${embeddingJobId} (${embeddingChunks.length} chunks)`,
          )

          // Agregar log de embedding job creado
          logsArray.push({
            step: 'embedding-trigger',
            status: 'success' as const,
            at: new Date().toISOString(),
            details: `Embedding generation job enqueued: ${embeddingJobId}`,
            data: { chunkCount: embeddingChunks.length },
          })
        } catch (embeddingError) {
          const embeddingErrorMessage =
            embeddingError instanceof Error ? embeddingError.message : 'Unknown error'
          console.error(`[${this.name}] ⚠️ Failed to enqueue embedding job:`, embeddingErrorMessage)

          // Agregar log de warning de embedding (no crítico para el video processing)
          logsArray.push({
            step: 'embedding-trigger',
            status: 'success' as const,
            at: new Date().toISOString(),
            details: `Warning: Failed to enqueue embedding generation: ${embeddingErrorMessage}`,
            data: { chunkCount: chunksResult.chunks?.length || 0 },
          })
        }
      } else {
        console.log(`[${this.name}] ⚠️ No chunks available for embedding generation`)

        // Log cuando no hay chunks para embeddings
        logsArray.push({
          step: 'embedding-trigger',
          status: 'success' as const,
          at: new Date().toISOString(),
          details: 'Warning: No chunks available for embedding generation',
          data: { chunkCount: 0 },
        })
      }

      // Actualizar resource con todos los datos procesados
      await payload.update({
        collection: 'resources',
        id: resourceId,
        data: {
          // Campos básicos
          namespace,
          filters,
          user_metadata,

          // Resultados del procesamiento
          description: chunksResult.globalSynthesis,
          screenshots: screenshotsArray,
          chunks: chunksArray,

          // Logs del proceso
          logs: logsArray,

          // Metadatos de procesamiento
          processingMetadata: {
            duration: Math.round((transcriptionResult.duration_ms || 0) / 1000), // en segundos
            segments: transcriptionResult.metadata?.segmentCount || 0,
            vectorsGenerated: chunksArray.length, // Número de chunks = vectores
            jobIds: [
              {
                jobId: `video-${resourceId}`,
                type: 'video-processing' as const,
              },
            ],
          },

          // Estado final
          status: 'completed' as const,
          progress: 100,
          completedAt: new Date().toISOString(),
        } as any, // Temporary to avoid PayloadCMS type issues
      })

      console.log(`[${this.name}] 📊 Resource updated with complete data:`)
      console.log(`  - Screenshots: ${screenshotsArray.length}`)
      console.log(`  - Chunks: ${chunksArray.length}`)
      console.log(`  - Logs: ${logsArray.length}`)
      console.log(`  - Description: ${chunksResult.globalSynthesis?.substring(0, 100)}...`)

      console.log(
        `[${this.name}] 🎉 Video processing completed successfully for resource ${resourceId}`,
      )
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error(
        `[${this.name}] ❌ Video processing failed for resource ${resourceId}:`,
        errorMessage,
      )

      // Intentar actualizar el resource con información de error
      try {
        const payload = await getPayload({ config })
        await payload.update({
          collection: 'resources',
          id: resourceId,
          data: {
            namespace,
            filters,
            user_metadata,
            description: `Error processing video: ${errorMessage}`,
          },
        })
      } catch (updateError) {
        console.error(`[${this.name}] Failed to update resource with error:`, updateError)
      }

      throw error
    } finally {
      // ========================================================================
      // LIMPIEZA DE ARCHIVOS TEMPORALES
      // ========================================================================
      console.log(`[${this.name}] 🧹 Cleaning up temporary files`)

      try {
        // Limpiar archivo de video descargado
        if (downloadResult?.success && downloadResult.localPath) {
          await VideoDownloader.cleanupTempFile(downloadResult.localPath)
          console.log(`[VIDEO-WORKER] ✅ Video file cleaned up`)
        }

        // Limpiar frames extraídos
        if (tempFrames.length > 0) {
          await VideoFrameExtractor.cleanupFrames(tempFrames)
          console.log(`[VIDEO-WORKER] ✅ Frame files cleaned up`)
        }
      } catch (cleanupError) {
        console.error(`[${this.name}] ⚠️ Error during cleanup:`, cleanupError)
      }
    }
  }

  /**
   * Detiene el worker de forma limpia
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      console.log(`[${this.name}] Worker is not running`)
      return
    }

    console.log(`🔄 [${this.name}] Stopping video processing worker...`)

    try {
      await QueueManager.shutdown()
      this.isRunning = false
      console.log(`🔴 [${this.name}] Video processing worker stopped successfully`)
    } catch (error) {
      console.error(`❌ [${this.name}] Error stopping video processing worker:`, error)
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
  }> {
    const startTime = process.uptime()
    const queueHealth = await QueueManager.healthCheck()

    return {
      worker: this.name,
      status: this.isRunning && queueHealth.healthy ? 'healthy' : 'unhealthy',
      uptime: startTime,
      queue: {
        healthy: queueHealth.healthy,
        agenda: queueHealth.agenda,
        mongodb: queueHealth.mongodb,
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
  }> {
    const queueStats = await QueueManager.getQueueStats()

    return {
      worker: this.name,
      isRunning: this.isRunning,
      queueStats: {
        pending: queueStats.pending,
        running: queueStats.running,
        completed: queueStats.completed,
        failed: queueStats.failed,
      },
    }
  }

  /**
   * Configura el cierre limpio del worker
   */
  private setupGracefulShutdown(): void {
    const signals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT', 'SIGUSR2']

    signals.forEach((signal) => {
      process.on(signal, async () => {
        console.log(`[${this.name}] Received ${signal}, shutting down gracefully...`)

        try {
          await this.stop()
          process.exit(0)
        } catch (error) {
          console.error(`[${this.name}] Error during graceful shutdown:`, error)
          process.exit(1)
        }
      })
    })

    // Manejar errores no capturados
    process.on('uncaughtException', (error) => {
      console.error(`[${this.name}] Uncaught exception:`, error)
      this.stop().finally(() => process.exit(1))
    })

    process.on('unhandledRejection', (reason, promise) => {
      console.error(`[${this.name}] Unhandled rejection at:`, promise, 'reason:', reason)
      this.stop().finally(() => process.exit(1))
    })
  }
}

export { VideoProcessingWorker }

// Si este archivo se ejecuta directamente, iniciar el worker
if (import.meta.url === `file://${process.argv[1]}`) {
  const worker = new VideoProcessingWorker(process.env.WORKER_NAME || 'video-worker-1')

  worker.start().catch((error) => {
    console.error('Failed to start video processing worker:', error)
    process.exit(1)
  })
}
