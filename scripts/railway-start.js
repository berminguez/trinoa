#!/usr/bin/env node

async function startServer() {
  console.log('🚀 Railway Startup Script')
  console.log('Time:', new Date().toISOString())
  console.log('Node version:', process.version)
  console.log('Platform:', process.platform)
  console.log('ENV PORT:', process.env.PORT)
  console.log('ENV NODE_ENV:', process.env.NODE_ENV)

  // Set default port if not provided
  const port = process.env.PORT || 8080
  process.env.PORT = port

  console.log('Starting server on port:', port)
  console.log('Hostname: 0.0.0.0')

  // Start the Next.js server (server.js is in the same directory)
  try {
    // Use dynamic import for ES modules compatibility
    await import('./server.js')
  } catch (error) {
    console.error('❌ Failed to start server:', error.message)
    process.exit(1)
  }
}

// Start the server
startServer()
