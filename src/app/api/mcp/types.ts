// ============================================================================
// MCP API TYPES
// ============================================================================

import type { ApiKey, User, Project } from '@/payload-types'
import { CONFIG } from '@/lib/config'

// ============================================================================
// AUTENTICACIÓN MCP
// ============================================================================

/**
 * Resultado de la autenticación MCP
 * Usado por el servicio de autenticación para devolver información de auth
 */
export interface McpAuthResult {
  /** Indica si la autenticación fue exitosa */
  success: boolean
  /** Mensaje de error en caso de fallo */
  error?: string
  /** Usuario propietario de la MCP Key (solo si success = true) */
  user?: User
  /** Proyectos a los que tiene acceso la MCP Key (solo si success = true) */
  projects?: Project[]
  /** Información completa de la MCP Key (solo si success = true) */
  mcpKey?: McpKeyData
}

/**
 * Datos completos de una MCP Key con relaciones resueltas
 * Versión de McpKey con tipos específicos para relaciones populadas
 */
export interface McpKeyData {
  /** ID único de la MCP Key */
  id: string
  /** Nombre descriptivo de la MCP Key */
  name: string
  /** Valor completo de la API Key */
  keyValue: string
  /** Últimos 4 caracteres de la API Key */
  keyValueLastFour: string
  /** Usuario propietario (relación resuelta) */
  user: User
  /** Proyectos específicos con acceso (relación resuelta, null si hasAllProjects = true) */
  projects?: Project[] | null
  /** Si esta key tiene acceso a todos los proyectos del usuario */
  hasAllProjects?: boolean | null
  /** Fecha de creación */
  createdAt: string
  /** Fecha de última actualización */
  updatedAt: string
}

// ============================================================================
// REQUEST/RESPONSE TYPES PARA ENDPOINTS MCP
// ============================================================================

/**
 * Request body para endpoint /api/mcp/query-project
 */
export interface McpQueryProjectRequest {
  /** ID del proyecto a consultar */
  project_id: string
  /** Pregunta a realizar sobre el contenido del proyecto */
  question: string
}

/**
 * Request body para endpoint /api/mcp/query-videos
 */
export interface McpQueryVideosRequest {
  /** IDs de los videos específicos a consultar */
  videos_id: string[]
  /** Pregunta a realizar sobre el contenido de los videos */
  question: string
}

/**
 * Estructura de un record de Pinecone devuelto por los endpoints de consulta
 */
export interface McpQueryRecord {
  /** ID único del chunk en Pinecone */
  id: string
  /** Score de similaridad (0-1, donde 1 es más similar) */
  score: number
  /** Metadata completa del chunk */
  metadata: {
    /** Índice del chunk dentro del video */
    chunkIndex: number
    /** Descripción visual del segmento */
    description: string
    /** Tiempo de inicio en milisegundos */
    startTime: number
    /** Tiempo de fin en milisegundos */
    endTime: number
    /** Tiempo de inicio (alias) */
    start_ms: number
    /** Tiempo de fin (alias) */
    end_ms: number
    /** Nombre del archivo de video */
    fileName: string
    /** Namespace de Pinecone */
    namespace: string
    /** ID del recurso (video) */
    resourceId: string
    /** ID del segmento */
    segmentId: string
    /** Transcripción del segmento */
    transcript: string
    /** Tipo de contenido */
    type: string
    /** Campos adicionales que pueda tener Pinecone */
    [key: string]: any
  }
}

/**
 * Response estándar para endpoints de consulta (query-project, query-videos)
 */
export interface McpQueryResponse {
  /** Array de records encontrados en Pinecone */
  records: McpQueryRecord[]
  /** Vector de consulta */
  vector: number[]
}

/**
 * Response para endpoint /api/mcp/auth - Configuración inicial del MCP
 */
export interface McpAuthConfigResponse {
  /** Confirmación de autenticación exitosa */
  authenticated: true
  /** Información de la MCP Key (sin exponer valor completo) */
  mcpKey: {
    /** ID de la MCP Key */
    id: string
    /** Nombre descriptivo de la key */
    name: string
    /** Últimos 4 caracteres para identificación */
    lastFour: string
    /** Si tiene acceso a todos los proyectos del usuario */
    hasAllProjects: boolean
    /** Fecha de creación */
    createdAt: string
  }
  /** Información del usuario propietario */
  user: {
    /** ID del usuario */
    id: string
    /** Email del usuario */
    email?: string
    /** Nombre del usuario si está disponible */
    name?: string
  }
  /** Configuración del sistema MCP */
  systemConfig: {
    /** Host autorizado para conexiones */
    authorizedHost: string
    /** Versión de la API MCP */
    apiVersion: string
    /** Endpoints disponibles */
    availableEndpoints: string[]
    /** Límites de longitud para consultas */
    limits: {
      /** Longitud máxima de preguntas */
      maxQuestionLength: number
      /** Límite máximo de videos por consulta */
      maxVideosPerQuery?: number
    }
    /** Información de rate limiting (aunque esté deshabilitado) */
    rateLimits: {
      /** Si el rate limiting está habilitado */
      enabled: boolean
      /** Límites por endpoint cuando esté habilitado */
      endpoints: Record<
        string,
        {
          requestsPerMinute: number
          requestsPerHour: number
          requestsPerDay: number
        }
      >
    }
  }
  /** Proyectos accesibles por esta MCP Key */
  accessibleProjects: {
    /** Cantidad total de proyectos */
    total: number
    /** Lista de proyectos con información básica */
    projects: Array<{
      /** ID del proyecto */
      id: string
      /** Título del proyecto */
      title: string
      /** Slug del proyecto */
      slug: string
      /** Descripción si está disponible */
      description?: string
      /** Fecha de creación */
      createdAt: string
      /** Fecha de última actualización */
      updatedAt: string
      /** Estadísticas básicas */
      stats?: {
        /** Cantidad de recursos (videos) en el proyecto */
        resourceCount?: number
      }
    }>
  }
  /** Información adicional del sistema */
  systemInfo: {
    /** Timestamp de la respuesta */
    timestamp: string
    /** Versión del sistema Eidetik */
    eidetikVersion?: string
    /** Información de disponibilidad de servicios */
    services: {
      /** Estado del servicio de embeddings */
      embeddings: 'available' | 'unavailable'
      /** Estado del servicio de base de datos vectorial */
      vectorDatabase: 'available' | 'unavailable'
      /** Estado del servicio de autenticación */
      authentication: 'available' | 'unavailable'
    }
  }
}

/**
 * Función principal de autenticación MCP que combina todas las validaciones
 * Ahora integrada con el sistema de logging de seguridad completo
 * @param request - Request object de Next.js
 * @param endpoint - Endpoint específico para logging de seguridad
 * @returns McpAuthResult con información de autenticación y acceso
 */
export async function authenticateMcp(
  request: Request,
  endpoint: string = 'unknown',
): Promise<McpAuthResult> {
  // Importar dinámicamente para evitar circular dependencies
  const {
    extractSecurityContext,
    logAuthenticationFailure,
    logAuthenticationSuccess,
    createSafeMcpKeyInfo,
  } = await import('./security-logger')

  // Extraer contexto de seguridad del request
  const securityContext = extractSecurityContext(request, endpoint)

  try {
    // 1. Validar host - TEMPORALMENTE DESHABILITADO
    // PROBLEMA: La validación actual verifica el host de destino (donde está la API)
    // pero debería validar el origen del cliente MCP. En desarrollo:
    // - API Eidetik: localhost:3000 (Next.js)
    // - Cliente MCP: localhost:8081 (externo)
    // El header 'host' contiene localhost:3000 (destino), no localhost:8081 (origen)
    //
    // TODO: Implementar validación de origen usando headers como Origin, Referer,
    // X-Forwarded-For o un sistema de allowlist de IPs
    /*
    const requestHost = extractHostFromRequest(request)
    if (!requestHost) {
      logAuthenticationFailure(
        MCP_ERROR_CODES.MISSING_AUTHORIZATION,
        'Host header missing in request',
        securityContext,
        {
          failureStage: 'HEADER_PARSING',
          additionalInfo: {
            missingHeader: 'host',
          },
        },
      )

      return {
        success: false,
        error: 'Host header missing in request',
      }
    }

    if (!validateMcpHost(requestHost)) {
      logAuthenticationFailure(
        MCP_ERROR_CODES.INVALID_HOST,
        'Unauthorized host for MCP access - DEBUG: API host=' + requestHost + ', Expected MCP client=' + CONFIG.MCP_HOST,
        securityContext,
        {
          failureStage: 'HOST_VALIDATION',
          attemptedHost: requestHost,
          additionalInfo: {
            allowedHost: CONFIG.MCP_HOST,
            receivedHost: requestHost,
            note: 'Host validation logic needs review - validating destination instead of origin',
          },
        },
      )

      return {
        success: false,
        error: 'Unauthorized host for MCP access - Host validation disabled in development',
      }
    }
    */

    // 1. Extraer y validar MCP Key
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logAuthenticationFailure(
        MCP_ERROR_CODES.MISSING_AUTHORIZATION,
        'Missing or invalid Authorization header',
        securityContext,
        {
          failureStage: 'HEADER_PARSING',
          additionalInfo: {
            hasAuthHeader: !!authHeader,
            authHeaderFormat: authHeader ? 'invalid' : 'missing',
          },
        },
      )

      return {
        success: false,
        error: 'Missing or invalid Authorization header',
      }
    }

    const mcpKey = authHeader.substring(7) // Remove "Bearer "

    if (!validateMcpKeyFormat(mcpKey)) {
      logAuthenticationFailure(
        MCP_ERROR_CODES.INVALID_KEY_FORMAT,
        'Invalid MCP key format',
        securityContext,
        {
          failureStage: 'KEY_FORMAT',
          mcpKeyInfo: createSafeMcpKeyInfo(mcpKey),
          additionalInfo: {
            expectedFormat: 'pcsk_[A-Za-z0-9]{30,}',
          },
        },
      )

      return {
        success: false,
        error: 'Invalid MCP key format',
      }
    }

    // 2. Buscar MCP Key en PayloadCMS
    const mcpKeyData = await findMcpKeyByValue(mcpKey)
    if (!mcpKeyData) {
      logAuthenticationFailure(
        MCP_ERROR_CODES.KEY_NOT_FOUND,
        'MCP key not found or invalid',
        securityContext,
        {
          failureStage: 'KEY_LOOKUP',
          mcpKeyInfo: createSafeMcpKeyInfo(mcpKey),
          additionalInfo: {
            searchAttempted: true,
            databaseQueried: true,
          },
        },
      )

      return {
        success: false,
        error: 'MCP key not found or invalid',
      }
    }

    // 3. Extraer proyectos accesibles
    const accessibleProjects = await extractAccessibleProjects(mcpKeyData)

    // Log de autenticación exitosa
    logAuthenticationSuccess(securityContext, mcpKeyData, accessibleProjects || [])

    return {
      success: true,
      user: mcpKeyData.user,
      projects: accessibleProjects || [],
      mcpKey: mcpKeyData,
    }
  } catch (error) {
    // Log de error interno crítico
    logAuthenticationFailure(
      MCP_ERROR_CODES.UNKNOWN_ERROR,
      'Internal authentication error',
      securityContext,
      {
        failureStage: 'INTERNAL_ERROR',
        additionalInfo: {
          errorMessage: error instanceof Error ? error.message : String(error),
          errorType: error instanceof Error ? error.constructor.name : 'unknown',
          stack: error instanceof Error ? error.stack?.substring(0, 500) : undefined,
        },
      },
    )

    return {
      success: false,
      error: 'Internal authentication error',
    }
  }
}

// ============================================================================
// VALIDACIÓN Y CONSTANTES
// ============================================================================

/**
 * Regex para validar formato de MCP Key
 */
export const MCP_KEY_REGEX = /^pcsk_[A-Za-z0-9]{30,}$/

/**
 * Límite máximo de caracteres para preguntas en endpoints de consulta
 */
export const MAX_QUESTION_LENGTH = 2000

/**
 * Hosts permitidos para conexiones MCP
 */
export const ALLOWED_MCP_HOSTS = {
  LOCAL: 'localhost:5058',
  PRODUCTION: 'mcp.eidetik.com',
} as const

/**
 * Códigos de error estándar para endpoints MCP
 * Organizados por categoría para mejor mantenimiento
 */
export const MCP_ERROR_CODES = {
  // 400 - Bad Request errors
  INVALID_REQUEST_FORMAT: 'INVALID_REQUEST_FORMAT',
  MISSING_REQUIRED_FIELDS: 'MISSING_REQUIRED_FIELDS',
  INVALID_FIELD_TYPE: 'INVALID_FIELD_TYPE',
  QUESTION_TOO_LONG: 'QUESTION_TOO_LONG',
  INVALID_ARRAY_FORMAT: 'INVALID_ARRAY_FORMAT',
  EMPTY_ARRAY: 'EMPTY_ARRAY',

  // 401 - Authentication errors
  INVALID_HOST: 'INVALID_HOST',
  INVALID_KEY_FORMAT: 'INVALID_KEY_FORMAT',
  KEY_NOT_FOUND: 'KEY_NOT_FOUND',
  MISSING_AUTHORIZATION: 'MISSING_AUTHORIZATION',
  EXPIRED_KEY: 'EXPIRED_KEY',

  // 403 - Authorization errors
  NO_PROJECT_ACCESS: 'NO_PROJECT_ACCESS',
  NO_VIDEO_ACCESS: 'NO_VIDEO_ACCESS',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',

  // 404 - Not Found errors
  PROJECT_NOT_FOUND: 'PROJECT_NOT_FOUND',
  VIDEO_NOT_FOUND: 'VIDEO_NOT_FOUND',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',

  // 405 - Method Not Allowed
  METHOD_NOT_ALLOWED: 'METHOD_NOT_ALLOWED',

  // 429 - Rate Limiting (futuro)
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',

  // 500 - Server errors
  OPENAI_ERROR: 'OPENAI_ERROR',
  PINECONE_ERROR: 'PINECONE_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const

export type McpErrorCode = (typeof MCP_ERROR_CODES)[keyof typeof MCP_ERROR_CODES]

// ============================================================================
// MAPEO DE CÓDIGOS HTTP A CÓDIGOS DE ERROR
// ============================================================================

/**
 * Mapeo estándar de códigos HTTP a códigos de error MCP
 * Garantiza consistencia en todas las respuestas de error
 */
export const HTTP_STATUS_TO_ERROR_CODE: Record<number, McpErrorCode[]> = {
  400: [
    MCP_ERROR_CODES.INVALID_REQUEST_FORMAT,
    MCP_ERROR_CODES.MISSING_REQUIRED_FIELDS,
    MCP_ERROR_CODES.INVALID_FIELD_TYPE,
    MCP_ERROR_CODES.QUESTION_TOO_LONG,
    MCP_ERROR_CODES.INVALID_ARRAY_FORMAT,
    MCP_ERROR_CODES.EMPTY_ARRAY,
  ],
  401: [
    MCP_ERROR_CODES.INVALID_HOST,
    MCP_ERROR_CODES.INVALID_KEY_FORMAT,
    MCP_ERROR_CODES.KEY_NOT_FOUND,
    MCP_ERROR_CODES.MISSING_AUTHORIZATION,
    MCP_ERROR_CODES.EXPIRED_KEY,
  ],
  403: [
    MCP_ERROR_CODES.NO_PROJECT_ACCESS,
    MCP_ERROR_CODES.NO_VIDEO_ACCESS,
    MCP_ERROR_CODES.INSUFFICIENT_PERMISSIONS,
  ],
  404: [
    MCP_ERROR_CODES.PROJECT_NOT_FOUND,
    MCP_ERROR_CODES.VIDEO_NOT_FOUND,
    MCP_ERROR_CODES.RESOURCE_NOT_FOUND,
  ],
  405: [MCP_ERROR_CODES.METHOD_NOT_ALLOWED],
  429: [MCP_ERROR_CODES.RATE_LIMIT_EXCEEDED],
  500: [
    MCP_ERROR_CODES.OPENAI_ERROR,
    MCP_ERROR_CODES.PINECONE_ERROR,
    MCP_ERROR_CODES.DATABASE_ERROR,
    MCP_ERROR_CODES.NETWORK_ERROR,
    MCP_ERROR_CODES.SERVICE_UNAVAILABLE,
    MCP_ERROR_CODES.UNKNOWN_ERROR,
  ],
}

/**
 * Mensajes de error estándar y descriptivos
 * Organizados por código de error para consistencia
 */
export const ERROR_MESSAGES: Record<McpErrorCode, string> = {
  // 400 - Bad Request
  [MCP_ERROR_CODES.INVALID_REQUEST_FORMAT]: 'Request body contains invalid JSON format',
  [MCP_ERROR_CODES.MISSING_REQUIRED_FIELDS]: 'One or more required fields are missing',
  [MCP_ERROR_CODES.INVALID_FIELD_TYPE]: 'One or more fields have invalid data types',
  [MCP_ERROR_CODES.QUESTION_TOO_LONG]: `Question exceeds maximum length of ${MAX_QUESTION_LENGTH} characters`,
  [MCP_ERROR_CODES.INVALID_ARRAY_FORMAT]: 'Field must be a valid array',
  [MCP_ERROR_CODES.EMPTY_ARRAY]: 'Array field cannot be empty',

  // 401 - Authentication
  [MCP_ERROR_CODES.INVALID_HOST]: 'Request host is not authorized for MCP API access',
  [MCP_ERROR_CODES.INVALID_KEY_FORMAT]: 'MCP API key format is invalid',
  [MCP_ERROR_CODES.KEY_NOT_FOUND]: 'MCP API key not found or invalid',
  [MCP_ERROR_CODES.MISSING_AUTHORIZATION]: 'Authorization header is missing or malformed',
  [MCP_ERROR_CODES.EXPIRED_KEY]: 'MCP API key has expired',

  // 403 - Authorization
  [MCP_ERROR_CODES.NO_PROJECT_ACCESS]: 'MCP key does not have access to the specified project',
  [MCP_ERROR_CODES.NO_VIDEO_ACCESS]: 'MCP key does not have access to one or more specified videos',
  [MCP_ERROR_CODES.INSUFFICIENT_PERMISSIONS]:
    'MCP key has insufficient permissions for this operation',

  // 404 - Not Found
  [MCP_ERROR_CODES.PROJECT_NOT_FOUND]: 'Specified project was not found',
  [MCP_ERROR_CODES.VIDEO_NOT_FOUND]: 'One or more specified videos were not found',
  [MCP_ERROR_CODES.RESOURCE_NOT_FOUND]: 'Requested resource was not found',

  // 405 - Method Not Allowed
  [MCP_ERROR_CODES.METHOD_NOT_ALLOWED]: 'HTTP method not allowed for this endpoint',

  // 429 - Rate Limiting
  [MCP_ERROR_CODES.RATE_LIMIT_EXCEEDED]: 'API rate limit exceeded. Please try again later',

  // 500 - Server Errors
  [MCP_ERROR_CODES.OPENAI_ERROR]: 'Failed to generate embeddings using OpenAI service',
  [MCP_ERROR_CODES.PINECONE_ERROR]: 'Failed to query vector database',
  [MCP_ERROR_CODES.DATABASE_ERROR]: 'Database operation failed',
  [MCP_ERROR_CODES.NETWORK_ERROR]: 'Network connectivity issue with external service',
  [MCP_ERROR_CODES.SERVICE_UNAVAILABLE]: 'Required service is temporarily unavailable',
  [MCP_ERROR_CODES.UNKNOWN_ERROR]: 'An unexpected error occurred while processing the request',
}

/**
 * Valida que un código de error sea válido para el status HTTP dado
 * @param status - Código de estado HTTP
 * @param errorCode - Código de error MCP
 * @returns true si la combinación es válida
 */
export function isValidErrorCodeForStatus(status: number, errorCode: McpErrorCode): boolean {
  const validCodes = HTTP_STATUS_TO_ERROR_CODE[status]
  return validCodes ? validCodes.includes(errorCode) : false
}

/**
 * Obtiene el mensaje de error estándar para un código de error
 * @param errorCode - Código de error MCP
 * @returns Mensaje de error descriptivo
 */
export function getErrorMessage(errorCode: McpErrorCode): string {
  return ERROR_MESSAGES[errorCode] || ERROR_MESSAGES[MCP_ERROR_CODES.UNKNOWN_ERROR]
}

// ============================================================================
// FUNCIONES DE VALIDACIÓN
// ============================================================================

/**
 * Valida que la request proviene de un host autorizado para MCP
 * @param requestHost - Host del request (ej: "localhost:5058" o "mcp.eidetik.com")
 * @returns true si el host está autorizado, false en caso contrario
 */
export function validateMcpHost(requestHost: string): boolean {
  if (!requestHost) {
    return false
  }

  // Obtener el host configurado desde variables de entorno
  const allowedHost = CONFIG.MCP_HOST

  // Normalizar hosts removiendo protocolo si existe
  const normalizeHost = (host: string): string => {
    return host.replace(/^https?:\/\//, '').toLowerCase()
  }

  const normalizedRequestHost = normalizeHost(requestHost)
  const normalizedAllowedHost = normalizeHost(allowedHost)

  // Validación exacta del host
  return normalizedRequestHost === normalizedAllowedHost
}

/**
 * Extrae el host del objeto Request de Next.js
 * @param request - Request object de Next.js
 * @returns Host extraído del header o null si no se encuentra
 */
export function extractHostFromRequest(request: Request): string | null {
  // Intentar obtener el host desde diferentes headers
  const host =
    request.headers.get('host') ||
    request.headers.get('x-forwarded-host') ||
    request.headers.get('x-original-host')

  return host
}

/**
 * Valida el formato de una MCP Key
 * @param key - Key a validar
 * @returns true si el formato es válido, false en caso contrario
 */
export function validateMcpKeyFormat(key: string): boolean {
  if (!key || typeof key !== 'string') {
    return false
  }

  return MCP_KEY_REGEX.test(key)
}

/**
 * Extrae los proyectos accesibles para una MCP Key considerando permisos
 * @param mcpKeyData - Datos de la MCP Key con relaciones resueltas
 * @returns Array de proyectos accesibles o null si hasAllProjects=true (acceso total)
 */
export async function extractAccessibleProjects(mcpKeyData: McpKeyData): Promise<Project[] | null> {
  try {
    // Si la key tiene acceso a todos los proyectos, obtener todos los del usuario
    if (mcpKeyData.hasAllProjects) {
      const { getPayload } = await import('payload')
      const config = await import('@payload-config')

      const payload = await getPayload({ config: config.default })

      // Obtener todos los proyectos del usuario
      const userProjectsResult = await payload.find({
        collection: 'projects' as any,
        where: {
          createdBy: {
            equals: mcpKeyData.user.id,
          },
        },
        depth: 1,
        limit: 1000, // Límite alto para obtener todos los proyectos
      })

      return userProjectsResult.docs as Project[]
    }

    // Si no tiene acceso total, devolver solo los proyectos específicos
    return mcpKeyData.projects || []
  } catch (error) {
    console.error('[EXTRACT_ACCESSIBLE_PROJECTS] Error extracting accessible projects:', {
      mcpKeyId: mcpKeyData.id,
      userId: mcpKeyData.user.id,
      hasAllProjects: mcpKeyData.hasAllProjects,
      error: error instanceof Error ? error.message : String(error),
    })

    // En caso de error, devolver proyectos específicos como fallback
    return mcpKeyData.projects || []
  }
}

/**
 * Verifica si una MCP Key tiene acceso a un proyecto específico
 * @param mcpKeyData - Datos de la MCP Key con relaciones resueltas
 * @param projectId - ID del proyecto a verificar
 * @returns true si tiene acceso, false en caso contrario
 */
export async function verifyProjectAccess(
  mcpKeyData: McpKeyData,
  projectId: string,
): Promise<boolean> {
  try {
    // Si tiene acceso a todos los proyectos, verificar que el proyecto pertenezca al usuario
    if (mcpKeyData.hasAllProjects) {
      const { getPayload } = await import('payload')
      const config = await import('@payload-config')

      const payload = await getPayload({ config: config.default })

      const projectResult = await payload.find({
        collection: 'projects' as any,
        where: {
          id: {
            equals: projectId,
          },
          createdBy: {
            equals: mcpKeyData.user.id,
          },
        },
        limit: 1,
      })

      return projectResult.docs.length > 0
    }

    // Si no tiene acceso total, verificar que el proyecto esté en la lista específica
    if (!mcpKeyData.projects || mcpKeyData.projects.length === 0) {
      return false
    }

    return mcpKeyData.projects.some((project) => project.id === projectId)
  } catch (error) {
    console.error('[VERIFY_PROJECT_ACCESS] Error verifying project access:', {
      mcpKeyId: mcpKeyData.id,
      projectId,
      hasAllProjects: mcpKeyData.hasAllProjects,
      error: error instanceof Error ? error.message : String(error),
    })

    return false
  }
}

/**
 * Busca una MCP Key en PayloadCMS por su keyValue
 * @param keyValue - Valor de la MCP Key a buscar (ej: "pcsk_ABC123...")
 * @returns McpKeyData con relaciones resueltas o null si no se encuentra
 */
export async function findMcpKeyByValue(keyValue: string): Promise<McpKeyData | null> {
  try {
    // Importación dinámica para evitar problemas de circular dependency
    const { getPayload } = await import('payload')
    const config = await import('@payload-config')

    const payload = await getPayload({ config: config.default })

    // Buscar la API Key por keyValue
    const result = await payload.find({
      collection: 'api-keys' as any,
      where: {
        keyValue: {
          equals: keyValue,
        },
      },
      depth: 2, // Para obtener relaciones resueltas (user y projects)
      limit: 1,
    })

    if (!result.docs.length) {
      return null
    }

    const apiKey = result.docs[0] as ApiKey

    // Verificar que las relaciones están populadas
    if (typeof apiKey.user === 'string') {
      console.warn('[FIND_API_KEY] User relation not populated:', apiKey.id)
      return null
    }

    // Convertir a McpKeyData con relaciones resueltas
    const mcpKeyData: McpKeyData = {
      id: apiKey.id,
      name: apiKey.name,
      keyValue: apiKey.keyValue,
      keyValueLastFour: apiKey.keyValueLastFour,
      user: apiKey.user as User,
      projects: apiKey.projects ? (apiKey.projects as Project[]) : null,
      hasAllProjects: apiKey.hasAllProjects,
      createdAt: apiKey.createdAt,
      updatedAt: apiKey.updatedAt,
    }

    return mcpKeyData
  } catch (error) {
    console.error('[FIND_API_KEY] Error searching for API key:', {
      keyValue: keyValue ? `${keyValue.substring(0, 10)}...` : 'undefined',
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}
