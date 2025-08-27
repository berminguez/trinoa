#!/usr/bin/env node

import { createServer } from 'http'
import { parse } from 'url'
import next from 'next'
import { initializeCron } from '../src/lib/cron.js'

const port = process.env.PORT || 8080
const hostname = '0.0.0.0'
const dev = process.env.NODE_ENV !== 'production'

console.log('🚀 Initializing Next.js server...')
console.log(`Environment: ${process.env.NODE_ENV}`)
console.log(`Port: ${port}`)
console.log(`Hostname: ${hostname}`)

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

async function startServer() {
  try {
    // Prepare Next.js app
    await app.prepare()
    console.log('✅ Next.js app prepared')

    // Initialize CRON jobs (for Railway production environment)
    try {
      await initializeCron()
      console.log('✅ CRON system initialized')
    } catch (cronError) {
      console.warn('⚠️ CRON initialization failed (continuing anyway):', cronError.message)
    }

    // Create HTTP server
    const server = createServer(async (req, res) => {
      try {
        const parsedUrl = parse(req.url, true)
        await handle(req, res, parsedUrl)
      } catch (err) {
        console.error('Error occurred handling', req.url, err)
        res.statusCode = 500
        res.end('internal server error')
      }
    })

    // Graceful shutdown handlers
    const gracefulShutdown = async (signal) => {
      console.log(`\n🔄 Received ${signal}, starting graceful shutdown...`)

      try {
        // Stop accepting new connections
        server.close(async () => {
          console.log('📦 HTTP server closed')

          try {
            // Stop CRON jobs
            const { stopCron } = await import('../src/lib/cron.js')
            stopCron()
            console.log('🕒 CRON jobs stopped')
          } catch (error) {
            console.warn('⚠️ Error stopping CRON jobs:', error.message)
          }

          console.log('✅ Graceful shutdown completed')
          process.exit(0)
        })

        // Force close after timeout
        setTimeout(() => {
          console.log('⏰ Forcing shutdown due to timeout')
          process.exit(1)
        }, 10000) // 10 seconds timeout
      } catch (error) {
        console.error('❌ Error during shutdown:', error)
        process.exit(1)
      }
    }

    // Setup signal handlers
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
    process.on('SIGINT', () => gracefulShutdown('SIGINT'))
    process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')) // Railway uses this

    // Start server
    server.listen(port, hostname, (err) => {
      if (err) throw err
      console.log(`🌟 Server ready on http://${hostname}:${port}`)
      console.log(`📱 Local: http://localhost:${port}`)
      console.log(`🌍 Network: http://${hostname}:${port}`)
    })
  } catch (error) {
    console.error('❌ Failed to start server:', error)
    process.exit(1)
  }
}

// Start the server
startServer().catch((error) => {
  console.error('💥 Server startup failed:', error)
  process.exit(1)
})
