import { NextRequest } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

interface N8nErrorPayload {
  status: string
  errorMessage: string
  executionId: string | number
  lastNodeExecuted?: string
  errorStack?: string
  workflowName?: string
}

/**
 * POST /api/resources/errors
 * Webhook para recibir errores de n8n y marcar resources como failed
 *
 * Formato esperado:
 * {
 *   "status": "failed",
 *   "errorMessage": "Error de procesamiento",
 *   "executionId": 231,
 *   "lastNodeExecuted": "Node With Error",
 *   "errorStack": "Stack trace optional",
 *   "workflowName": "Workflow Name optional"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    console.log(
      '[RESOURCES_ERRORS] Received error webhook from n8n:',
      JSON.stringify(body, null, 2),
    )

    // Extraer datos del payload simple
    const errorData = body as N8nErrorPayload
    const executionId = String(errorData.executionId || '')
    const errorMessage = errorData.errorMessage || 'Error desconocido'
    const errorStack = errorData.errorStack
    const workflowName = errorData.workflowName || 'Workflow desconocido'
    const lastNodeExecuted = errorData.lastNodeExecuted

    if (!executionId) {
      console.warn('[RESOURCES_ERRORS] No executionId found in error data:', errorData)
      return Response.json(
        {
          success: false,
          error: 'No se encontró executionId en los datos de error',
          data: errorData,
        },
        { status: 400 },
      )
    }

    console.log(`[RESOURCES_ERRORS] Processing error for executionId: ${executionId}`)

    const payload = await getPayload({ config })

    try {
      // Buscar resource por executionId
      const resourceResult = await payload.find({
        collection: 'resources',
        where: {
          executionId: { equals: executionId },
        },
        limit: 1,
      })

      if (resourceResult.docs.length === 0) {
        console.warn(`[RESOURCES_ERRORS] No resource found with executionId: ${executionId}`)
        return Response.json(
          {
            success: false,
            error: `No se encontró resource con executionId: ${executionId}`,
            executionId,
          },
          { status: 404 },
        )
      }

      const resource = resourceResult.docs[0]
      console.log(
        `[RESOURCES_ERRORS] Found resource ${resource.id} for executionId: ${executionId}`,
      )

      // Obtener logs actuales del resource
      const currentLogs = Array.isArray((resource as any).logs) ? (resource as any).logs : []

      // Crear log de error
      const errorLog = {
        step: 'n8n-execution-error',
        status: 'error' as const,
        at: new Date().toISOString(),
        details: `Error en ejecución de n8n: ${errorMessage}`,
        data: {
          executionId,
          workflowName,
          errorMessage,
          errorStack: errorStack || null,
          lastNodeExecuted: lastNodeExecuted || null,
        },
      }

      // Actualizar resource como failed y agregar log
      await payload.update({
        collection: 'resources',
        id: resource.id,
        data: {
          status: 'failed',
          logs: [...currentLogs, errorLog],
        },
        overrideAccess: true,
      })

      console.log(
        `[RESOURCES_ERRORS] Resource ${resource.id} marked as failed due to n8n execution error`,
      )

      return Response.json({
        success: true,
        data: {
          resourceId: resource.id,
          executionId,
          status: 'failed',
        },
        message: 'Error de n8n procesado exitosamente',
      })
    } catch (error) {
      console.error(`[RESOURCES_ERRORS] Error processing executionId ${executionId}:`, error)
      return Response.json(
        {
          success: false,
          error: `Error al procesar executionId ${executionId}: ${error instanceof Error ? error.message : 'Error desconocido'}`,
          executionId,
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error('[RESOURCES_ERRORS] Error processing n8n error webhook:', error)
    return Response.json(
      {
        success: false,
        error: 'Error interno del servidor procesando webhook de errores',
      },
      { status: 500 },
    )
  }
}

/**
 * GET /api/resources/errors
 * Endpoint de prueba para verificar que el webhook está funcionando
 */
export async function GET() {
  return Response.json({
    success: true,
    message: 'Resources errors webhook endpoint está activo',
    timestamp: new Date().toISOString(),
    expectedFormat: {
      description: 'Objeto simple con información de error de n8n',
      example: {
        status: 'failed',
        errorMessage: 'Error de procesamiento',
        executionId: 231,
        lastNodeExecuted: 'Node With Error',
        errorStack: 'Stack trace opcional',
        workflowName: 'Workflow Name opcional',
      },
    },
  })
}
