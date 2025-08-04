#!/usr/bin/env npx tsx

// ============================================================================
// EIDETIK MVP - VIDEO WORKER STARTUP SCRIPT
// ============================================================================

import 'dotenv/config'
import { VideoProcessingWorker } from '../src/workers/video-processor'

async function main() {
  console.log('🚀 Starting Eidetik Video Processing Worker')

  // Configurar nombre del worker desde variables de entorno
  const workerName = process.env.WORKER_NAME || `video-worker-${process.pid}`
  const instanceId = process.env.INSTANCE_ID || '1'

  console.log(`Worker Name: ${workerName}`)
  console.log(`Instance ID: ${instanceId}`)
  console.log(`Process ID: ${process.pid}`)
  console.log(`Node Version: ${process.version}`)
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`)

  // Crear y iniciar el worker
  const worker = new VideoProcessingWorker(workerName)

  try {
    await worker.start()

    // Mostrar health check inicial
    const health = await worker.healthCheck()
    console.log('Initial Health Check:', JSON.stringify(health, null, 2))

    // Configurar health check periódico cada 30 segundos
    const healthCheckInterval = setInterval(async () => {
      try {
        const currentHealth = await worker.healthCheck()
        if (currentHealth.status === 'unhealthy') {
          console.warn('⚠️ Worker health check failed:', currentHealth)
        } else {
          console.log(`✅ Worker healthy - uptime: ${Math.floor(currentHealth.uptime)}s`)
        }
      } catch (error) {
        console.error('❌ Health check error:', error)
      }
    }, 30000)

    // Mostrar estadísticas cada 60 segundos
    const statsInterval = setInterval(async () => {
      try {
        const stats = await worker.getStats()
        console.log('📊 Worker Stats:', {
          worker: stats.worker,
          isRunning: stats.isRunning,
          queueStats: stats.queueStats,
        })
      } catch (error) {
        console.error('❌ Stats error:', error)
      }
    }, 60000)

    // Cleanup en shutdown
    process.on('SIGTERM', () => {
      clearInterval(healthCheckInterval)
      clearInterval(statsInterval)
    })

    process.on('SIGINT', () => {
      clearInterval(healthCheckInterval)
      clearInterval(statsInterval)
    })

    console.log('✅ Video Processing Worker started successfully')
    console.log('📋 Monitoring enabled - Health checks every 30s, Stats every 60s')
  } catch (error) {
    console.error('❌ Failed to start Video Processing Worker:', error)
    process.exit(1)
  }
}

// Manejar errores no capturados
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error)
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason)
  process.exit(1)
})

// Ejecutar si es llamado directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('💥 Startup failed:', error)
    process.exit(1)
  })
}
