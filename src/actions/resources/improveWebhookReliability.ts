'use server'

/**
 * Mejoras para hacer más robusto el proceso de envío de webhooks y asignación de executionId
 * Esta función contiene la lógica mejorada que puede reemplazar la lógica existente en Resources.ts
 */

interface WebhookConfig {
  url: string
  method: 'GET' | 'POST'
  bearerToken?: string
}

interface WebhookResult {
  success: boolean
  executionId?: string
  executionUrl?: string
  responseText?: string
  status?: number
  error?: string
  attempt?: number
}

/**
 * Envía webhook con retry logic y mejor manejo de errores
 */
export async function sendWebhookWithRetry(
  config: WebhookConfig,
  data: any,
  fileMeta?: any,
  fileUrl?: string,
  maxRetries: number = 3,
): Promise<WebhookResult> {
  const { url: webhookUrl, method, bearerToken } = config

  console.log(`[WEBHOOK_ROBUST] Starting webhook with retry logic. MaxRetries: ${maxRetries}`)

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`[WEBHOOK_ROBUST] Attempt ${attempt}/${maxRetries}`)

    try {
      const result = await sendSingleWebhook(config, data, fileMeta, fileUrl, attempt)

      if (result.success) {
        console.log(`[WEBHOOK_ROBUST] Success on attempt ${attempt}`)
        return { ...result, attempt }
      }

      // Si no es el último intento, esperar antes de reintentar
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000) // Backoff exponencial, máximo 5s
        console.log(`[WEBHOOK_ROBUST] Attempt ${attempt} failed, retrying in ${delay}ms...`)
        await new Promise((resolve) => setTimeout(resolve, delay))
      } else {
        console.log(`[WEBHOOK_ROBUST] All attempts failed`)
        return { ...result, attempt }
      }
    } catch (error) {
      console.error(`[WEBHOOK_ROBUST] Exception on attempt ${attempt}:`, error)

      if (attempt === maxRetries) {
        return {
          success: false,
          error: `Failed after ${maxRetries} attempts: ${String(error)}`,
          attempt,
        }
      }
    }
  }

  return {
    success: false,
    error: `Failed after ${maxRetries} attempts`,
    attempt: maxRetries,
  }
}

/**
 * Envía un webhook individual con timeout extendido
 */
async function sendSingleWebhook(
  config: WebhookConfig,
  data: any,
  fileMeta?: any,
  fileUrl?: string,
  attempt: number = 1,
): Promise<WebhookResult> {
  const { url: webhookUrl, method, bearerToken } = config

  // Timeout dinámico: 15s primer intento, 25s segundo intento, 35s tercer intento
  const timeoutMs = 15000 + (attempt - 1) * 10000

  let fetchUrl = webhookUrl
  const headers: Record<string, string> = {}
  const init: RequestInit = { method }

  if (bearerToken) {
    headers['Authorization'] = bearerToken
  }

  // Configurar URL y body según método
  if (method === 'GET') {
    const u = new URL(webhookUrl)
    u.searchParams.set('event', 'resource.created')
    u.searchParams.set('resourceId', 'temp-id')
    u.searchParams.set('namespace', String(data.namespace || ''))
    u.searchParams.set('type', String(data.type || ''))
    if (fileUrl) u.searchParams.set('fileUrl', String(fileUrl))
    fetchUrl = u.toString()
  } else {
    headers['Content-Type'] = 'application/json'

    const minimalFile = fileMeta
      ? {
          filename: fileMeta.filename,
          filesize: fileMeta.filesize,
          mimeType: fileMeta.mimeType,
        }
      : undefined

    const payloadBody = {
      event: 'resource.created',
      resourceId: 'temp-id',
      namespace: String(data.namespace || ''),
      type: String(data.type || ''),
      fileUrl,
      file: minimalFile,
      caso: data.caso,
      tipo: data.tipo,
    }
    init.body = JSON.stringify(payloadBody)
  }

  init.headers = headers

  // Controller de timeout dinámico
  const controller = new AbortController()
  const timer = setTimeout(() => {
    console.log(`[WEBHOOK_ROBUST] Timeout after ${timeoutMs}ms on attempt ${attempt}`)
    controller.abort()
  }, timeoutMs)

  ;(init as any).signal = controller.signal

  console.log(`[WEBHOOK_ROBUST] Sending webhook (timeout: ${timeoutMs}ms):`, {
    fetchUrl,
    method,
    headers: Object.keys(headers),
    attempt,
  })

  try {
    const res = await fetch(fetchUrl, init)
    clearTimeout(timer)

    const ok = res.ok
    const status = res.status
    console.log(`[WEBHOOK_ROBUST] Response on attempt ${attempt}:`, { ok, status })

    let responseText = ''
    let executionId: string | null = null
    let executionUrl: string | null = null

    try {
      responseText = await res.text()
      console.log(`[WEBHOOK_ROBUST] Response text (attempt ${attempt}):`, responseText)

      // Intentar extraer executionId de la respuesta de n8n
      if (ok && responseText) {
        try {
          const responseJson = JSON.parse(responseText)

          executionId =
            responseJson?.executionId ||
            responseJson?.data?.executionId ||
            responseJson?.execution?.id ||
            null

          executionUrl =
            responseJson?.executionUrl ||
            responseJson?.data?.executionUrl ||
            responseJson?.execution?.url ||
            null

          if (executionId) {
            console.log(
              `[WEBHOOK_ROBUST] Extracted executionId on attempt ${attempt}: ${executionId}`,
            )
          } else {
            console.warn(`[WEBHOOK_ROBUST] No executionId found in response on attempt ${attempt}`)
          }
        } catch (parseError) {
          console.warn(
            `[WEBHOOK_ROBUST] Could not parse response as JSON on attempt ${attempt}:`,
            parseError,
          )
        }
      }
    } catch (responseError) {
      console.warn(`[WEBHOOK_ROBUST] Error reading response on attempt ${attempt}:`, responseError)
    }

    return {
      success: ok && !!executionId, // Solo consideramos éxito si obtuvimos executionId
      executionId: executionId || undefined,
      executionUrl: executionUrl || undefined,
      responseText,
      status,
      error: !ok ? `HTTP ${status}` : !executionId ? 'No executionId in response' : undefined,
    }
  } catch (error) {
    clearTimeout(timer)

    const isTimeout =
      error instanceof Error &&
      (error.name === 'AbortError' ||
        error.message.includes('timeout') ||
        error.message.includes('aborted'))

    const errorMsg = isTimeout ? `Timeout after ${timeoutMs}ms` : String(error)
    console.error(`[WEBHOOK_ROBUST] Error on attempt ${attempt}:`, errorMsg)

    return {
      success: false,
      error: errorMsg,
    }
  }
}

/**
 * Crea un log mejorado del resultado del webhook
 */
export function createWebhookLog(result: WebhookResult, webhookUrl: string) {
  const { success, executionId, responseText, status, error, attempt } = result

  return {
    step: 'automation-webhook-robust',
    status: success ? ('success' as const) : ('error' as const),
    at: new Date().toISOString(),
    details: success
      ? `Webhook enviado correctamente (status ${status}) en intento ${attempt}${executionId ? ` - ExecutionId: ${executionId}` : ''}`
      : `Webhook falló después de ${attempt} intentos: ${error}`,
    data: {
      url: webhookUrl,
      success,
      status: status || null,
      executionId: executionId || null,
      responsePreview: responseText?.slice(0, 300),
      totalAttempts: attempt,
      error: error || null,
    },
  }
}

/**
 * Función de utilidad para validar configuración de webhook
 */
export function validateWebhookConfig(config: any): WebhookConfig | null {
  if (!config?.url || typeof config.url !== 'string') {
    console.warn('[WEBHOOK_ROBUST] Invalid webhook URL in config')
    return null
  }

  const method = config.method === 'GET' ? 'GET' : 'POST'
  const bearerToken = config.bearerToken || config.authorization

  return {
    url: config.url,
    method,
    bearerToken,
  }
}
