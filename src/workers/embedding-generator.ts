// ============================================================================
// EIDETIK MVP - EMBEDDING GENERATION WORKER
// ============================================================================

import 'dotenv/config'
import { QueueManager } from '../lib/queue'

/**
 * Worker dedicado para generación de embeddings
 * Este worker puede ejecutarse como un proceso separado para escalar horizontalmente
 */
class EmbeddingGenerationWorker {
  private isRunning = false
  private name: string

  constructor(name: string = 'embedding-worker-1') {
    this.name = name
  }

  /**
   * Inicia el worker para procesar jobs de embedding
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log(`[${this.name}] Worker is already running`)
      return
    }

    console.log(`🚀 [${this.name}] Starting embedding generation worker`)

    try {
      // Inicializar el sistema de cola
      await QueueManager.initialize()

      this.isRunning = true
      console.log(`✅ [${this.name}] Embedding generation worker started successfully`)

      // Manejar señales de cierre limpio
      this.setupGracefulShutdown()
    } catch (error) {
      console.error(`❌ [${this.name}] Failed to start embedding generation worker:`, error)
      throw error
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

    console.log(`🔄 [${this.name}] Stopping embedding generation worker...`)

    try {
      await QueueManager.shutdown()
      this.isRunning = false
      console.log(`🔴 [${this.name}] Embedding generation worker stopped successfully`)
    } catch (error) {
      console.error(`❌ [${this.name}] Error stopping embedding generation worker:`, error)
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

export { EmbeddingGenerationWorker }

// Si este archivo se ejecuta directamente, iniciar el worker
if (import.meta.url === `file://${process.argv[1]}`) {
  const worker = new EmbeddingGenerationWorker(process.env.WORKER_NAME || 'embedding-worker-1')

  worker.start().catch((error) => {
    console.error('Failed to start embedding generation worker:', error)
    process.exit(1)
  })
}
