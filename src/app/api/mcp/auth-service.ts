// ============================================================================
// MCP AUTHENTICATION SERVICE
// ============================================================================

/**
 * Servicio de autenticación MCP reutilizable para todos los endpoints
 * Este archivo sirve como punto de entrada limpio para la autenticación MCP
 */

// Re-export de tipos y funciones principales
export type {
  McpAuthResult,
  McpKeyData,
  McpQueryProjectRequest,
  McpQueryVideosRequest,
  McpQueryRecord,
  McpQueryResponse,
  McpErrorCode,
} from './types'

// Import primero para usar en funciones locales
import {
  MCP_KEY_REGEX,
  MAX_QUESTION_LENGTH,
  ALLOWED_MCP_HOSTS,
  MCP_ERROR_CODES,
  HTTP_STATUS_TO_ERROR_CODE,
  ERROR_MESSAGES,
  isValidErrorCodeForStatus,
  getErrorMessage,
  validateMcpHost,
  extractHostFromRequest,
  validateMcpKeyFormat,
  findMcpKeyByValue,
  extractAccessibleProjects,
  verifyProjectAccess,
  authenticateMcp,
  type McpErrorCode,
} from './types'

// Re-export para que otros módulos puedan usar
export {
  MCP_KEY_REGEX,
  MAX_QUESTION_LENGTH,
  ALLOWED_MCP_HOSTS,
  MCP_ERROR_CODES,
  HTTP_STATUS_TO_ERROR_CODE,
  ERROR_MESSAGES,
  isValidErrorCodeForStatus,
  getErrorMessage,
  validateMcpHost,
  extractHostFromRequest,
  validateMcpKeyFormat,
  findMcpKeyByValue,
  extractAccessibleProjects,
  verifyProjectAccess,
  authenticateMcp,
}

// ============================================================================
// FUNCIONES DE CONVENIENCIA PARA ENDPOINTS
// ============================================================================

/**
 * Middleware de autenticación simplificado para endpoints MCP
 * Uso típico: const auth = await requireMcpAuth(request, '/api/mcp/projects')
 * @param request - Request object de Next.js
 * @param endpoint - Endpoint específico para logging de seguridad
 * @returns McpAuthResult - Usar auth.success para verificar éxito
 */
export async function requireMcpAuth(request: Request, endpoint: string = 'unknown') {
  return await authenticateMcp(request, endpoint)
}

/**
 * Verifica que una MCP Key tenga acceso a un proyecto específico
 * Simplifica la verificación de permisos en endpoints con logging de seguridad
 * @param request - Request object
 * @param projectId - ID del proyecto a verificar
 * @param endpoint - Endpoint específico para logging
 * @returns McpAuthResult con validación de acceso al proyecto
 */
export async function requireProjectAccess(
  request: Request,
  projectId: string,
  endpoint: string = 'unknown',
) {
  const auth = await authenticateMcp(request, endpoint)
  if (!auth.success || !auth.mcpKey) {
    return auth
  }

  const hasAccess = await verifyProjectAccess(auth.mcpKey, projectId)
  if (!hasAccess) {
    // Log de acceso denegado con detalles de seguridad
    const { extractSecurityContext, logAccessDenied } = await import('./security-logger')
    const securityContext = extractSecurityContext(request, endpoint)

    logAccessDenied(
      MCP_ERROR_CODES.NO_PROJECT_ACCESS,
      securityContext,
      {
        userId: auth.user?.id || 'unknown',
        mcpKeyId: auth.mcpKey.id,
        mcpKeyName: auth.mcpKey.name,
      },
      {
        resourceType: 'PROJECT',
        resourceIds: [projectId],
        accessibleProjects: auth.projects?.map((p) => p.id) || [],
      },
    )

    return {
      success: false,
      error: getErrorMessage(MCP_ERROR_CODES.NO_PROJECT_ACCESS),
    }
  }

  return auth
}

/**
 * Parsea el body de un request como JSON de manera segura
 * @param request - Request object
 * @returns Objeto parseado o null si hay error
 */
export async function parseRequestBody(request: Request): Promise<any | null> {
  try {
    const body = await request.json()
    return body
  } catch (error) {
    console.warn('[MCP_AUTH] Failed to parse request body:', {
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}

// ============================================================================
// FUNCIONES DE RESPUESTA ESTANDARIZADAS
// ============================================================================

/**
 * Crea una respuesta de error estándar para endpoints MCP con validación
 * @param status - Código de estado HTTP (debe coincidir con errorCode)
 * @param message - Mensaje de error personalizado (opcional, usa mensaje estándar si no se proporciona)
 * @param errorCode - Código de error específico (opcional, usa UNKNOWN_ERROR por defecto)
 * @returns Response object con formato estándar
 */
export function createErrorResponse(
  status: number,
  message?: string,
  errorCode?: McpErrorCode,
): Response {
  // Usar código por defecto basado en status HTTP
  const finalErrorCode = errorCode || getDefaultErrorCodeForStatus(status)

  // Validar que el código de error sea apropiado para el status HTTP
  if (errorCode && !isValidErrorCodeForStatus(status, errorCode)) {
    console.warn('[MCP_AUTH] Error code mismatch:', {
      status,
      errorCode,
      validCodes: HTTP_STATUS_TO_ERROR_CODE[status],
    })
  }

  // Usar mensaje estándar si no se proporciona uno personalizado
  const finalMessage = message || getErrorMessage(finalErrorCode)

  const errorResponse = {
    error: finalMessage,
    code: finalErrorCode,
    timestamp: new Date().toISOString(),
    status,
  }

  // Log de errores para monitoreo
  if (status >= 500) {
    console.error('[MCP_ERROR]', errorResponse)
  } else if (status >= 400) {
    console.warn('[MCP_WARNING]', {
      code: finalErrorCode,
      status,
      message: finalMessage,
    })
  }

  return new Response(JSON.stringify(errorResponse), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  })
}

/**
 * Crea una respuesta de éxito estándar para endpoints MCP
 * @param data - Datos a devolver en la respuesta
 * @param status - Código de estado HTTP (por defecto 200)
 * @returns Response object con formato estándar
 */
export function createSuccessResponse(data: any, status: number = 200): Response {
  const successResponse = {
    data,
    timestamp: new Date().toISOString(),
    status,
  }

  return new Response(JSON.stringify(successResponse), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  })
}

/**
 * Obtiene el código de error por defecto para un status HTTP
 * @param status - Código de estado HTTP
 * @returns Código de error por defecto
 */
function getDefaultErrorCodeForStatus(status: number): McpErrorCode {
  const statusErrorCodes = HTTP_STATUS_TO_ERROR_CODE[status]
  if (statusErrorCodes && statusErrorCodes.length > 0) {
    return statusErrorCodes[0] // Usar el primer código como por defecto
  }
  return MCP_ERROR_CODES.UNKNOWN_ERROR
}

/**
 * Crea respuesta estándar para métodos HTTP no permitidos
 * @param allowedMethod - Método HTTP permitido (ej: 'POST')
 * @returns Response con error 405
 */
export function createMethodNotAllowedResponse(allowedMethod: string): Response {
  return createErrorResponse(
    405,
    `Method not allowed. Use ${allowedMethod} instead.`,
    MCP_ERROR_CODES.METHOD_NOT_ALLOWED,
  )
}
