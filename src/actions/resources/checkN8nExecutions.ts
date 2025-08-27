'use server'

import { getPayload } from 'payload'
import config from '@payload-config'
import type { Resource } from '@/payload-types'

interface N8nExecutionResponse {
  id: string
  finished: boolean
  mode: string
  retryOf: string | null
  retrySuccessId: string | null
  status: 'success' | 'error' | 'running' | 'waiting' | 'canceled'
  createdAt: string
  startedAt: string
  stoppedAt: string | null
  deletedAt: string | null
  workflowId: string
  waitTill: string | null
}

interface CheckExecutionResult {
  success: boolean
  resourceId: string
  executionId: string
  n8nStatus?: string
  action?: 'updated_to_completed' | 'updated_to_failed' | 'timeout_to_error' | 'no_action'
  error?: string
}

/**
 * Verifica el estado de una ejecución específica en N8n
 */
async function checkN8nExecution(executionId: string): Promise<N8nExecutionResponse | null> {
  const n8nUrl = process.env.N8N_URL
  const n8nApiKey = process.env.N8N_API_KEY

  if (!n8nUrl || !n8nApiKey) {
    console.error('[N8N_CHECK] Missing N8N_URL or N8N_API_KEY environment variables')
    return null
  }

  try {
    const response = await fetch(`${n8nUrl}/api/v1/executions/${executionId}`, {
      method: 'GET',
      headers: {
        'X-N8N-API-KEY': n8nApiKey,
        'Content-Type': 'application/json',
      },
      // Timeout de 10 segundos para la consulta
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      console.warn(`[N8N_CHECK] HTTP ${response.status} for execution ${executionId}`)
      return null
    }

    const data = await response.json()
    return data as N8nExecutionResponse
  } catch (error) {
    console.error(`[N8N_CHECK] Error checking execution ${executionId}:`, error)
    return null
  }
}

/**
 * Verifica y actualiza el estado de un resource basado en su execution en N8n
 */
async function processResourceExecution(resource: Resource): Promise<CheckExecutionResult> {
  const payload = await getPayload({ config })
  const resourceId = resource.id
  const executionId = resource.executionId

  if (!executionId) {
    return {
      success: false,
      resourceId,
      executionId: 'none',
      error: 'Resource has no executionId',
    }
  }

  // Verificar timeout (más de 1 minuto en processing)
  const now = new Date()
  const startedAt = resource.startedAt ? new Date(resource.startedAt) : null
  const timeoutMinutes = 1

  if (startedAt) {
    const minutesInProgress = (now.getTime() - startedAt.getTime()) / (1000 * 60)

    if (minutesInProgress > timeoutMinutes) {
      console.log(
        `[N8N_CHECK] Resource ${resourceId} timeout after ${minutesInProgress.toFixed(1)} minutes`,
      )

      try {
        await payload.update({
          collection: 'resources',
          id: resourceId,
          data: {
            status: 'failed',
            logs: [
              ...(resource.logs || []),
              {
                step: 'timeout-check',
                status: 'error',
                at: new Date().toISOString(),
                details: `Execution timeout after ${minutesInProgress.toFixed(1)} minutes without completion`,
                data: {
                  executionId,
                  timeoutMinutes,
                  startedAt: resource.startedAt,
                },
              },
            ],
          },
          overrideAccess: true,
        })

        return {
          success: true,
          resourceId,
          executionId,
          action: 'timeout_to_error',
        }
      } catch (error) {
        console.error(`[N8N_CHECK] Error updating timeout resource ${resourceId}:`, error)
        return {
          success: false,
          resourceId,
          executionId,
          error: `Failed to update timeout resource: ${error}`,
        }
      }
    }
  }

  // Consultar estado en N8n
  const execution = await checkN8nExecution(executionId)

  if (!execution) {
    return {
      success: false,
      resourceId,
      executionId,
      error: 'Failed to get execution status from N8n',
    }
  }

  console.log(
    `[N8N_CHECK] Resource ${resourceId} - N8n status: ${execution.status}, finished: ${execution.finished}`,
  )

  // Determinar acción basada en el estado de N8n
  let newStatus: 'completed' | 'failed' | null = null
  let logDetails = ''

  if (execution.finished && execution.status === 'success') {
    newStatus = 'completed'
    logDetails = 'Execution completed successfully in N8n'
  } else if (execution.finished && execution.status === 'error') {
    newStatus = 'failed'
    logDetails = 'Execution failed in N8n'
  } else if (execution.status === 'canceled') {
    newStatus = 'failed'
    logDetails = 'Execution was canceled in N8n'
  }
  // Si está running o waiting, no hacer nada (seguir en processing)

  if (newStatus) {
    try {
      await payload.update({
        collection: 'resources',
        id: resourceId,
        data: {
          status: newStatus,
          ...(newStatus === 'completed' && { completedAt: new Date().toISOString() }),
          logs: [
            ...(resource.logs || []),
            {
              step: 'n8n-status-check',
              status: newStatus === 'completed' ? 'success' : 'error',
              at: new Date().toISOString(),
              details: logDetails,
              data: {
                executionId,
                n8nStatus: execution.status,
                n8nFinished: execution.finished,
                stoppedAt: execution.stoppedAt,
              },
            },
          ],
        },
        overrideAccess: true,
      })

      return {
        success: true,
        resourceId,
        executionId,
        n8nStatus: execution.status,
        action: newStatus === 'completed' ? 'updated_to_completed' : 'updated_to_failed',
      }
    } catch (error) {
      console.error(`[N8N_CHECK] Error updating resource ${resourceId}:`, error)
      return {
        success: false,
        resourceId,
        executionId,
        n8nStatus: execution.status,
        error: `Failed to update resource: ${error}`,
      }
    }
  }

  return {
    success: true,
    resourceId,
    executionId,
    n8nStatus: execution.status,
    action: 'no_action',
  }
}

/**
 * Server action principal: verifica el estado de todos los resources en processing
 */
export async function checkN8nExecutions(): Promise<{
  success: boolean
  totalChecked: number
  updated: number
  errors: number
  results: CheckExecutionResult[]
  error?: string
}> {
  console.log('[N8N_CHECK] Starting N8n executions check...')

  try {
    const payload = await getPayload({ config })

    // Buscar todos los resources con status "processing" y executionId presente
    const resources = await payload.find({
      collection: 'resources',
      where: {
        and: [
          { status: { equals: 'processing' } },
          { executionId: { exists: true } },
          { executionId: { not_equals: '' } },
        ],
      },
      limit: 100, // Limitar a 100 para evitar sobrecarga
      overrideAccess: true,
    })

    console.log(`[N8N_CHECK] Found ${resources.docs.length} resources in processing state`)

    const results: CheckExecutionResult[] = []
    let updated = 0
    let errors = 0

    // Procesar cada resource
    for (const resource of resources.docs) {
      const result = await processResourceExecution(resource as Resource)
      results.push(result)

      if (result.success) {
        if (result.action && result.action !== 'no_action') {
          updated++
          console.log(`[N8N_CHECK] ✅ Resource ${result.resourceId}: ${result.action}`)
        }
      } else {
        errors++
        console.log(`[N8N_CHECK] ❌ Resource ${result.resourceId}: ${result.error}`)
      }
    }

    console.log(
      `[N8N_CHECK] Completed. Total: ${resources.docs.length}, Updated: ${updated}, Errors: ${errors}`,
    )

    return {
      success: true,
      totalChecked: resources.docs.length,
      updated,
      errors,
      results,
    }
  } catch (error) {
    console.error('[N8N_CHECK] Fatal error in checkN8nExecutions:', error)
    return {
      success: false,
      totalChecked: 0,
      updated: 0,
      errors: 1,
      results: [],
      error: String(error),
    }
  }
}
