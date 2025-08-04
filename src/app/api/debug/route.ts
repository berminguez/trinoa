import { NextResponse } from 'next/server'

export async function GET() {
  const debugInfo = {
    nodeVersion: process.version,
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    port: process.env.PORT,
    availableEnvVars: {
      DATABASE_URI: !!process.env.DATABASE_URI,
      PAYLOAD_SECRET: !!process.env.PAYLOAD_SECRET,
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT,
    },
    memory: process.memoryUsage(),
    uptime: process.uptime(),
    status: 'App is running successfully'
  }

  return NextResponse.json(debugInfo, { status: 200 })
}
