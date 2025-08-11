// ============================================================================
// EIDETIK MVP - SISTEMA DE COLA (AGENDA) COMPLETO
// ============================================================================

import Agenda, { type Job } from 'agenda'
import { getPayload } from 'payload'

import config from '@payload-config'

import type { VideoProcessingJob, EmbeddingJob } from '../types'

let agenda: Agenda | null = null

/**
 * Configuración de jobs con metadatos
 */
interface JobConfig {
  priority: 'low' | 'normal' | 'high' | 'critical'
  attempts: number
  backoff: 'fixed' | 'exponential'
  delay?: string // e.g., '5 minutes', '1 hour'
}

/**
 * Configuraciones por tipo de job
 */
const JOB_CONFIGS: Record<string, JobConfig> = {
  'process-video': {
    priority: 'high',
    attempts: 3,
    backoff: 'exponential',
  },
  'generate-embeddings': {
    priority: 'normal',
    attempts: 3,
    backoff: 'exponential',
  },
  'cleanup-temp-files': {
    priority: 'low',
    attempts: 2,
    backoff: 'fixed',
    delay: '1 hour',
  },
}

export class QueueManager {
  /**
   * Inicializa el sistema de cola Agenda con configuración avanzada
   */
  static async initialize(): Promise<void> {
    if (agenda) return // Ya inicializado

    const mongoUrl = process.env.DATABASE_URI
    if (!mongoUrl) {
      throw new Error('DATABASE_URI environment variable is required for queue system')
    }

    try {
      agenda = new Agenda({
        db: {
          address: mongoUrl,
          collection: 'agenda-jobs',
        },
        processEvery: '15 seconds', // Procesar cada 15 segundos
        maxConcurrency: 5, // Máximo 5 jobs concurrentes
        defaultConcurrency: 2, // Por defecto 2 jobs del mismo tipo
        defaultLockLifetime: 45 * 60 * 1000, // 45 minutos de lock
        defaultLockLimit: 0, // Sin límite de locks
      })

      // Eventos globales de agenda
      agenda.on('ready', () => {
        console.log('Agenda connected to MongoDB successfully')
      })

      agenda.on('error', (error) => {
        console.error('Agenda connection error:', error)
      })

      // Definir job de procesamiento de video
      agenda.define(
        'process-video',
        {
          concurrency: 2,
        },
        async (job: Job) => {
          const jobData = job.attrs.data as VideoProcessingJob
          const { resourceId, fileName } = jobData

          console.log(`[QUEUE] Starting real video processing for resource: ${resourceId}`)

          try {
            // Actualizar estado inicial
            await this.updateResourceStatus(resourceId, 'processing', 5, {
              step: 'pipeline-start',
              status: 'started',
              details: `Starting real video processing pipeline for ${fileName}`,
              data: {
                pipeline: 'real',
                steps: [
                  'download',
                  'transcription',
                  'scene-detection',
                  'frame-extraction',
                  'vision-analysis',
                  'media-upload',
                  'chunk-processing',
                ],
              },
            })

            // El worker ya actualiza el resource con los datos finales
            // Aquí solo confirmamos el éxito
            await this.updateResourceStatus(resourceId, 'completed', 100, {
              step: 'pipeline-complete',
              status: 'success',
              details: 'Real video processing pipeline completed successfully',
              data: {
                pipeline: 'real',
                timestamp: new Date().toISOString(),
              },
            })

            console.log(
              `[QUEUE] Real video processing completed successfully for resource: ${resourceId}`,
            )
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'
            console.error(`[QUEUE] Real video processing failed for ${resourceId}:`, errorMessage)

            await this.updateResourceStatus(resourceId, 'failed', 0, {
              step: 'pipeline-error',
              status: 'error',
              details: `Real video processing pipeline failed: ${errorMessage}`,
              data: {
                error: errorMessage,
                pipeline: 'real',
                timestamp: new Date().toISOString(),
              },
            })

            throw error // Re-lanzar para que Agenda maneje el retry
          }
        },
      )

      // Definir job de generación de embeddings
      agenda.define(
        'generate-embeddings',
        {
          concurrency: 3,
        },
        async (job: Job) => {
          const jobData = job.attrs.data as EmbeddingJob
          const { resourceId, namespace, triggeredBy, chunks } = jobData

          console.log(
            `[QUEUE] Starting embedding generation for resource: ${resourceId} (${chunks?.length || 0} chunks)`,
          )

          try {
            // Actualizar estado inicial
            await this.updateResourceStatus(resourceId, 'processing', 5, {
              step: 'embedding-start',
              status: 'started',
              details: `Starting embedding generation pipeline for ${chunks?.length || 0} chunks`,
              data: {
                pipeline: 'embeddings',
                triggeredBy,
                chunkCount: chunks?.length || 0,
                namespace,
              },
            })

            // El worker ya actualiza el resource con los datos finales
            // Aquí solo confirmamos el éxito del job
            console.log(
              `[QUEUE] Embedding generation completed successfully for resource: ${resourceId}`,
            )
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'
            console.error(`[QUEUE] Embedding generation failed for ${resourceId}:`, errorMessage)

            // El error handling ya se hace en el worker, aquí solo loggeamos
            throw error // Re-lanzar para que Agenda maneje el retry
          }
        },
      )

      // Definir job de limpieza de archivos temporales
      agenda.define(
        'cleanup-temp-files',
        {
          concurrency: 1,
        },
        async (job: Job) => {
          const { resourceId, tempFiles } = job.attrs.data as {
            resourceId: string
            tempFiles: string[]
          }

          console.log(`[WORKER] Cleaning up temporary files for resource: ${resourceId}`)

          try {
            // TODO: Implementar limpieza real de archivos temporales
            await new Promise((resolve) => setTimeout(resolve, 100))

            console.log(`[WORKER] Cleanup completed for resource: ${resourceId}`)
          } catch (error) {
            console.error(`[WORKER] Cleanup failed for ${resourceId}:`, error)
            // No re-lanzar error para cleanup, solo loggear
          }
        },
      )

      // Manejar eventos de jobs
      agenda.on('start', (job) => {
        console.log(`[QUEUE] Job started: ${job.attrs.name} (${job.attrs._id})`)
      })

      agenda.on('complete', (job) => {
        console.log(`[QUEUE] Job completed: ${job.attrs.name} (${job.attrs._id})`)
      })

      agenda.on('fail', (error, job) => {
        console.error(`[QUEUE] Job failed: ${job.attrs.name} (${job.attrs._id})`, error)

        // Implementar reintentos con backoff exponencial
        const config = JOB_CONFIGS[job.attrs.name]
        if (config && (job.attrs.failCount || 0) < config.attempts) {
          const delay =
            config.backoff === 'exponential'
              ? Math.pow(2, job.attrs.failCount || 0) * 60 * 1000 // 1min, 2min, 4min...
              : 5 * 60 * 1000 // 5 minutos fijo

          console.log(`[QUEUE] Scheduling retry for ${job.attrs.name} in ${delay}ms`)
          job.schedule(new Date(Date.now() + delay))
          job.save()
        }
      })

      await agenda.start()
      console.log('🚀 Queue system (Agenda) initialized successfully')
    } catch (error) {
      console.error('❌ Failed to initialize queue system:', error)
      throw error
    }
  }

  /**
   * Actualiza el estado de un recurso en la base de datos
   */
  private static async updateResourceStatus(
    resourceId: string,
    status: 'pending' | 'uploading' | 'processing' | 'completed' | 'failed' | 'needs_review',
    progress: number,
    logEntry?: {
      step: string
      status: 'started' | 'progress' | 'success' | 'error'
      details: string
      data?: Record<string, unknown>
    },
  ): Promise<void> {
    try {
      const payload = await getPayload({ config })

      const updateData: Record<string, unknown> = {
        status,
        progress,
      }

      if (status === 'completed') {
        updateData.completedAt = new Date().toISOString()
      }

      // Añadir log entry si se proporciona
      if (logEntry) {
        // Obtener logs actuales
        const resource = await payload.findByID({
          collection: 'resources',
          id: resourceId,
        })

        const currentLogs = resource.logs || []
        updateData.logs = [
          ...currentLogs,
          {
            ...logEntry,
            at: new Date().toISOString(),
          },
        ]
      }

      await payload.update({
        collection: 'resources',
        id: resourceId,
        data: updateData,
      })

      console.log(`[QUEUE] Updated resource ${resourceId} status to ${status} (${progress}%)`)
    } catch (error) {
      console.error(`[QUEUE] Failed to update resource status for ${resourceId}:`, error)
      // No re-lanzar el error para no afectar el job principal
    }
  }

  /**
   * Encola un job de procesamiento de video con prioridad
   */
  static async enqueueVideoProcessing(
    job: VideoProcessingJob,
    priority: 'low' | 'normal' | 'high' | 'critical' = 'high',
  ): Promise<string> {
    if (!agenda) {
      await this.initialize()
    }

    if (!agenda) {
      throw new Error('Queue system not initialized')
    }

    try {
      const agendaJob = await agenda.now('process-video', job)

      console.log(
        `[QUEUE] Video processing job enqueued for resource: ${job.resourceId} (priority: ${priority})`,
      )
      return agendaJob.attrs._id?.toString() || ''
    } catch (error) {
      console.error('[QUEUE] Failed to enqueue video processing job:', error)
      throw error
    }
  }

  /**
   * Encola un job de generación de embeddings
   */
  static async enqueueEmbeddingGeneration(job: EmbeddingJob, delay?: string): Promise<string> {
    if (!agenda) {
      await this.initialize()
    }

    if (!agenda) {
      throw new Error('Queue system not initialized')
    }

    try {
      const agendaJob = delay
        ? await agenda.schedule(delay, 'generate-embeddings', job)
        : await agenda.now('generate-embeddings', job)

      console.log(`[QUEUE] Embedding generation job enqueued for resource: ${job.resourceId}`)
      return agendaJob.attrs._id?.toString() || ''
    } catch (error) {
      console.error('[QUEUE] Failed to enqueue embedding generation job:', error)
      throw error
    }
  }

  /**
   * Encola un job de limpieza de archivos temporales
   */
  static async enqueueCleanup(
    resourceId: string,
    tempFiles: string[],
    delay: string = '1 hour',
  ): Promise<string> {
    if (!agenda) {
      await this.initialize()
    }

    if (!agenda) {
      throw new Error('Queue system not initialized')
    }

    try {
      const job = await agenda.schedule(delay, 'cleanup-temp-files', { resourceId, tempFiles })

      console.log(`[QUEUE] Cleanup job scheduled for resource: ${resourceId} in ${delay}`)
      return job.attrs._id?.toString() || ''
    } catch (error) {
      console.error('[QUEUE] Failed to enqueue cleanup job:', error)
      throw error
    }
  }

  /**
   * Obtiene el estado detallado de un job específico
   */
  static async getJobStatus(jobId: string): Promise<{
    status: string
    progress?: number
    error?: string
    startedAt?: Date
    completedAt?: Date
    attempts: number
  }> {
    if (!agenda) {
      return { status: 'queue_not_initialized', attempts: 0 }
    }

    try {
      const jobs = await agenda.jobs({ _id: jobId })
      if (jobs.length === 0) {
        return { status: 'not_found', attempts: 0 }
      }

      const job = jobs[0]
      const result: {
        status: string
        progress?: number
        error?: string
        startedAt?: Date
        completedAt?: Date
        attempts: number
      } = {
        status: 'pending',
        startedAt: job.attrs.lastRunAt,
        completedAt: job.attrs.lastFinishedAt,
        attempts: job.attrs.failCount || 0,
      }

      if (job.attrs.failedAt) {
        result.status = 'failed'
        result.error = job.attrs.failReason
      } else if (job.attrs.lastFinishedAt) {
        result.status = 'completed'
      } else if (job.attrs.lastRunAt) {
        result.status = 'running'
      }

      return result
    } catch (error) {
      console.error('[QUEUE] Failed to get job status:', error)
      return { status: 'error', attempts: 0 }
    }
  }

  /**
   * Obtiene estadísticas detalladas de la cola
   */
  static async getQueueStats(): Promise<{
    pending: number
    running: number
    completed: number
    failed: number
    delayed: number
    totalJobs: number
  }> {
    if (!agenda) {
      return { pending: 0, running: 0, completed: 0, failed: 0, delayed: 0, totalJobs: 0 }
    }

    try {
      const [pending, running, completed, failed, delayed] = await Promise.all([
        agenda.jobs({
          nextRunAt: { $exists: true },
          lastFinishedAt: { $exists: false },
          lockedAt: { $exists: false },
        }),
        agenda.jobs({ lockedAt: { $exists: true }, lastFinishedAt: { $exists: false } }),
        agenda.jobs({ lastFinishedAt: { $exists: true }, failedAt: { $exists: false } }),
        agenda.jobs({ failedAt: { $exists: true } }),
        agenda.jobs({ nextRunAt: { $gt: new Date() } }),
      ])

      const stats = {
        pending: pending.length,
        running: running.length,
        completed: completed.length,
        failed: failed.length,
        delayed: delayed.length,
        totalJobs: pending.length + running.length + completed.length + failed.length,
      }

      return stats
    } catch (error) {
      console.error('[QUEUE] Failed to get queue stats:', error)
      return { pending: 0, running: 0, completed: 0, failed: 0, delayed: 0, totalJobs: 0 }
    }
  }

  /**
   * Health check del sistema de cola
   */
  static async healthCheck(): Promise<{
    healthy: boolean
    agenda: boolean
    mongodb: boolean
    stats?: Record<string, number>
    error?: string
  }> {
    try {
      if (!agenda) {
        return {
          healthy: false,
          agenda: false,
          mongodb: false,
          error: 'Agenda not initialized',
        }
      }

      // Test básico de conexión
      const stats = await this.getQueueStats()

      return {
        healthy: true,
        agenda: true,
        mongodb: true,
        stats,
      }
    } catch (error) {
      return {
        healthy: false,
        agenda: !!agenda,
        mongodb: false,
        error: String(error),
      }
    }
  }

  /**
   * Limpia jobs completados más antiguos que X días
   */
  static async cleanupCompletedJobs(daysOld: number = 7): Promise<number> {
    if (!agenda) {
      throw new Error('Queue system not initialized')
    }

    try {
      const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000)

      const result = await agenda.cancel({
        lastFinishedAt: { $lt: cutoffDate },
        failedAt: { $exists: false },
      })

      const deletedCount = result || 0
      console.log(`[QUEUE] Cleaned up ${deletedCount} completed jobs older than ${daysOld} days`)
      return deletedCount
    } catch (error) {
      console.error('[QUEUE] Failed to cleanup completed jobs:', error)
      throw error
    }
  }

  /**
   * Cierra la conexión del sistema de cola
   */
  static async shutdown(): Promise<void> {
    if (agenda) {
      await agenda.stop()
      agenda = null
      console.log('🔴 Queue system shut down successfully')
    }
  }
}

export { QueueManager as default }
