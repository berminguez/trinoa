/**
 * API Endpoint para gestionar el sistema de CRON jobs
 *
 * GET /api/cron - Obtener estado del sistema de CRON
 * POST /api/cron/run - Ejecutar manualmente el checker de N8n
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCronStatus, runN8nCheckerManually } from '@/lib/cron'

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const status = getCronStatus()

    return NextResponse.json({
      success: true,
      data: {
        ...status,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        enableCron: process.env.ENABLE_CRON,
      },
      message: 'CRON status retrieved successfully',
    })
  } catch (error) {
    console.error('[CRON_API] Error getting CRON status:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get CRON status',
        details: String(error),
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const url = new URL(request.url)
    const action = url.searchParams.get('action')

    if (action === 'run') {
      // Ejecutar manualmente el checker de N8n
      console.log('[CRON_API] Manual execution of N8n checker requested')

      const result = await runN8nCheckerManually()

      return NextResponse.json({
        success: true,
        data: result,
        message: 'N8n checker executed successfully',
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid action. Use ?action=run to execute N8n checker manually',
        },
        { status: 400 },
      )
    }
  } catch (error) {
    console.error('[CRON_API] Error in CRON POST request:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to execute CRON action',
        details: String(error),
      },
      { status: 500 },
    )
  }
}
