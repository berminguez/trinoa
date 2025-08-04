#!/usr/bin/env npx tsx

// ============================================================================
// EIDETIK MVP - EMBEDDING WORKER STARTUP SCRIPT
// ============================================================================

import 'dotenv/config'
import { EmbeddingWorker } from '../src/workers/embedding-worker'

async function main() {
  console.log('🚀 Starting Eidetik Embedding Processing Worker')

  // Configurar nombre del worker desde variables de entorno
  const workerName = process.env.WORKER_NAME || `embedding-worker-${process.pid}`
  const instanceId = process.env.INSTANCE_ID || '1'

  console.log(`Worker Name: ${workerName}`)
  console.log(`Instance ID: ${instanceId}`)
  console.log(`Process ID: ${process.pid}`)
  console.log(`Node Version: ${process.version}`)
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`)

  // Verificar variables de entorno críticas
  const requiredEnvVars = [
    'OPENAI_API_KEY',
    'PINECONE_API_KEY',
    'PINECONE_INDEX_NAME',
    'DATABASE_URI',
  ]

  const missingVars = requiredEnvVars.filter((varName) => !process.env[varName])

  if (missingVars.length > 0) {
    console.error(`❌ Missing required environment variables: ${missingVars.join(', ')}`)
    console.error('Please set these variables before starting the embedding worker.')
    process.exit(1)
  }

  console.log('✅ All required environment variables found')

  // Crear y iniciar el worker
  const worker = new EmbeddingWorker(workerName)

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

          // Mostrar estado de servicios
          const services = currentHealth.services
          console.log(`  🧮 EmbeddingGenerator: ${services.generator ? '✅' : '❌'}`)
          console.log(`  📌 VectorManager: ${services.vectorManager ? '✅' : '❌'}`)
          console.log(`  📝 ChunkProcessor: ${services.chunkProcessor ? '✅' : '❌'}`)
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
          embeddingStats: stats.embeddingStats,
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

    console.log('✅ Embedding Processing Worker started successfully')
    console.log('📋 Monitoring enabled - Health checks every 30s, Stats every 60s')
    console.log('🔮 Ready to process embedding generation jobs')
    console.log('')
    console.log('🎯 Capabilities:')
    console.log('  • Generate embeddings using OpenAI text-embedding-ada-002')
    console.log('  • Store vectors in Pinecone with metadata')
    console.log('  • Process video chunks with transcription + visual description')
    console.log('  • Automatic retry logic with exponential backoff')
    console.log('  • Health monitoring and statistics')
  } catch (error) {
    console.error('❌ Failed to start Embedding Processing Worker:', error)
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
