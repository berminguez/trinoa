#!/usr/bin/env npx tsx

// ============================================================================
// EIDETIK MVP - QUEUE MONITORING SCRIPT
// ============================================================================

import 'dotenv/config'
import { QueueManager } from '../src/lib/queue'

interface MonitoringOptions {
  interval?: number // segundos
  detailed?: boolean
  cleanup?: boolean
  cleanupDays?: number
}

class QueueMonitor {
  private options: MonitoringOptions
  private isRunning = false
  private intervalId?: NodeJS.Timeout

  constructor(options: MonitoringOptions = {}) {
    this.options = {
      interval: options.interval || 30,
      detailed: options.detailed || false,
      cleanup: options.cleanup || false,
      cleanupDays: options.cleanupDays || 7,
    }
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('Monitor is already running')
      return
    }

    console.log('🚀 Starting Queue Monitor')
    console.log(`Monitoring interval: ${this.options.interval}s`)
    console.log(`Detailed mode: ${this.options.detailed ? 'ON' : 'OFF'}`)
    console.log(`Auto cleanup: ${this.options.cleanup ? 'ON' : 'OFF'}`)

    try {
      // Health check inicial
      const health = await QueueManager.healthCheck()
      if (!health.healthy) {
        console.warn('⚠️ Queue is not healthy on startup:', health)
      }

      this.isRunning = true

      // Ejecutar monitoring inmediato
      await this.monitor()

      // Configurar intervalo de monitoring
      this.intervalId = setInterval(
        async () => {
          try {
            await this.monitor()
          } catch (error) {
            console.error('❌ Monitoring error:', error)
          }
        },
        (this.options.interval || 30) * 1000,
      )

      // Setup de cleanup automático si está habilitado
      if (this.options.cleanup) {
        this.setupAutoCleanup()
      }

      console.log('✅ Queue Monitor started successfully')
    } catch (error) {
      console.error('❌ Failed to start Queue Monitor:', error)
      throw error
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      console.log('Monitor is not running')
      return
    }

    console.log('🔄 Stopping Queue Monitor...')

    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = undefined
    }

    this.isRunning = false
    console.log('🔴 Queue Monitor stopped')
  }

  private async monitor(): Promise<void> {
    const timestamp = new Date().toISOString()

    try {
      // Health check
      const health = await QueueManager.healthCheck()
      const stats = await QueueManager.getQueueStats()

      // Reporte básico
      console.log(`\n📊 [${timestamp}] Queue Status Report`)
      console.log(`├─ System Health: ${health.healthy ? '✅ HEALTHY' : '❌ UNHEALTHY'}`)
      console.log(`├─ Agenda Status: ${health.agenda ? '✅ Connected' : '❌ Disconnected'}`)
      console.log(`├─ MongoDB Status: ${health.mongodb ? '✅ Connected' : '❌ Disconnected'}`)

      if (!health.healthy && health.error) {
        console.log(`├─ Error: ${health.error}`)
      }

      console.log(`├─ Jobs Summary:`)
      console.log(`│  ├─ Pending: ${stats.pending}`)
      console.log(`│  ├─ Running: ${stats.running}`)
      console.log(`│  ├─ Completed: ${stats.completed}`)
      console.log(`│  ├─ Failed: ${stats.failed}`)
      console.log(`│  └─ Delayed: ${stats.delayed}`)
      console.log(`└─ Total Jobs: ${stats.totalJobs}`)

      // Reporte detallado si está habilitado
      if (this.options.detailed) {
        await this.detailedReport()
      }

      // Alertas automáticas
      this.checkAlerts(stats)
    } catch (error) {
      console.error(`❌ [${timestamp}] Monitoring failed:`, error)
    }
  }

  private async detailedReport(): Promise<void> {
    console.log(`\n📋 Detailed Report:`)

    try {
      const health = await QueueManager.healthCheck()

      if (health.stats) {
        console.log(`├─ Queue Statistics:`, JSON.stringify(health.stats, null, 2))
      }

      // Aquí podríamos añadir más detalles como:
      // - Jobs por tipo
      // - Tiempo promedio de procesamiento
      // - Rate de fallos por tipo de job
      // - etc.
    } catch (error) {
      console.log(`├─ ⚠️ Could not generate detailed report:`, error)
    }
  }

  private checkAlerts(stats: {
    pending: number
    running: number
    completed: number
    failed: number
    delayed: number
    totalJobs: number
  }): void {
    const alerts: string[] = []

    // Alert si hay muchos jobs fallidos
    if (stats.failed > 10) {
      alerts.push(`High number of failed jobs: ${stats.failed}`)
    }

    // Alert si la cola está muy llena
    if (stats.pending > 100) {
      alerts.push(`High number of pending jobs: ${stats.pending}`)
    }

    // Alert si hay jobs corriendo por mucho tiempo (esto requeriría más lógica)
    if (stats.running > 5) {
      alerts.push(`Many jobs running simultaneously: ${stats.running}`)
    }

    if (alerts.length > 0) {
      console.log(`\n🚨 ALERTS:`)
      alerts.forEach((alert) => console.log(`├─ ⚠️ ${alert}`))
    }
  }

  private setupAutoCleanup(): void {
    // Ejecutar limpieza cada 6 horas
    setInterval(
      async () => {
        try {
          console.log(`\n🧹 Running automatic cleanup...`)
          const deletedCount = await QueueManager.cleanupCompletedJobs(
            this.options.cleanupDays || 7,
          )
          console.log(`✅ Cleaned up ${deletedCount} old completed jobs`)
        } catch (error) {
          console.error(`❌ Auto cleanup failed:`, error)
        }
      },
      6 * 60 * 60 * 1000,
    ) // 6 horas
  }

  public setupGracefulShutdown(): void {
    const signals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT', 'SIGUSR2']

    signals.forEach((signal) => {
      process.on(signal, async () => {
        console.log(`\nReceived ${signal}, stopping monitor...`)
        await this.stop()
        process.exit(0)
      })
    })
  }
}

// CLI handling
async function main() {
  const args = process.argv.slice(2)
  const options: MonitoringOptions = {}

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--interval':
        options.interval = parseInt(args[++i]) || 30
        break
      case '--detailed':
        options.detailed = true
        break
      case '--cleanup':
        options.cleanup = true
        break
      case '--cleanup-days':
        options.cleanupDays = parseInt(args[++i]) || 7
        break
      case '--help':
        console.log(`
Queue Monitor Usage:
  --interval <seconds>    Monitoring interval (default: 30)
  --detailed             Enable detailed reporting
  --cleanup              Enable automatic cleanup
  --cleanup-days <days>   Days to keep completed jobs (default: 7)
  --help                 Show this help
`)
        process.exit(0)
        break
    }
  }

  const monitor = new QueueMonitor(options)
  monitor.setupGracefulShutdown()

  try {
    await monitor.start()
    // Mantener el proceso corriendo
    process.stdin.resume()
  } catch (error) {
    console.error('💥 Monitor startup failed:', error)
    process.exit(1)
  }
}

// Ejecutar si es llamado directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('💥 Startup error:', error)
    process.exit(1)
  })
}

export { QueueMonitor }
