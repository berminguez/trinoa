// ============================================================================
// EIDETIK MVP - HEALTH CHECK ENDPOINT
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'

import { QueueManager } from '@/lib/queue'

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Health check básico de la cola
    const queueHealth = await QueueManager.healthCheck()

    // Obtener estadísticas de la cola
    const queueStats = await QueueManager.getQueueStats()

    // Health check del sistema completo
    const systemHealth = {
      timestamp: new Date().toISOString(),
      status: queueHealth.healthy ? 'healthy' : 'unhealthy',
      services: {
        api: {
          status: 'healthy', // La API está funcionando si estamos aquí
          uptime: process.uptime(),
        },
        queue: {
          status: queueHealth.healthy ? 'healthy' : 'unhealthy',
          agenda: queueHealth.agenda,
          mongodb: queueHealth.mongodb,
          error: queueHealth.error || null,
        },
        database: {
          status: queueHealth.mongodb ? 'healthy' : 'unhealthy',
        },
      },
      queue: {
        stats: queueStats,
        jobTypes: ['process-video', 'generate-embeddings', 'cleanup-temp-files'],
      },
      version: process.env.npm_package_version || 'development',
      environment: process.env.NODE_ENV || 'development',
    }

    const statusCode = systemHealth.status === 'healthy' ? 200 : 503

    return NextResponse.json(systemHealth, {
      status: statusCode,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    })
  } catch (error) {
    console.error('[HEALTH] Health check failed:', error)

    return NextResponse.json(
      {
        timestamp: new Date().toISOString(),
        status: 'unhealthy',
        error: 'Health check failed',
        details: String(error),
        services: {
          api: {
            status: 'healthy',
            uptime: process.uptime(),
          },
          queue: {
            status: 'unknown',
            agenda: false,
            mongodb: false,
            error: String(error),
          },
          database: {
            status: 'unknown',
          },
        },
      },
      {
        status: 503,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      },
    )
  }
}

// Endpoint específico para comprobar la disponibilidad básica
export async function HEAD(request: NextRequest): Promise<NextResponse> {
  return new NextResponse(null, { status: 200 })
}
