/**
 * Endpoint para inicializar CRON en desarrollo
 * Solo disponible en modo development
 */

import { NextRequest, NextResponse } from 'next/server'
import { initializeCron, getCronStatus } from '@/lib/cron'

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Solo permitir en desarrollo
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      {
        success: false,
        error: 'This endpoint is only available in development mode',
      },
      { status: 403 },
    )
  }

  try {
    await initializeCron()
    const status = getCronStatus()

    return NextResponse.json({
      success: true,
      data: status,
      message: 'CRON system initialized successfully in development mode',
    })
  } catch (error) {
    console.error('[DEV_CRON] Error initializing CRON:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to initialize CRON system',
        details: String(error),
      },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  // Solo permitir en desarrollo
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      {
        success: false,
        error: 'This endpoint is only available in development mode',
      },
      { status: 403 },
    )
  }

  const status = getCronStatus()

  return NextResponse.json({
    success: true,
    data: status,
    message: 'Development CRON status retrieved successfully',
  })
}
