// ============================================================================
// MCP SECURITY LOGGING SYSTEM
// ============================================================================

/**
 * Sistema de logging de seguridad para eventos de autenticación MCP
 * Proporciona logging detallado para auditorías de seguridad y detección de amenazas
 */

import { MCP_ERROR_CODES } from './types'
import type { McpErrorCode, McpKeyData } from './types'

// ============================================================================
// INTERFACES PARA EVENTOS DE SEGURIDAD
// ============================================================================

/**
 * Información de contexto extraída del request para logging de seguridad
 */
export interface SecurityContext {
  /** IP address del cliente (real o proxy) */
  clientIP: string | null
  /** User-Agent del cliente */
  userAgent: string | null
  /** Host header del request */
  host: string | null
  /** Referer header si está disponible */
  referer: string | null
  /** Headers X-Forwarded-For para identificar IP real */
  forwardedFor: string | null
  /** Request ID único para tracking */
  requestId: string
  /** Timestamp del evento */
  timestamp: string
  /** Endpoint específico que se intentó acceder */
  endpoint: string
  /** Método HTTP usado */
  method: string
}

/**
 * Evento de autenticación fallida para logging de seguridad
 */
export interface AuthenticationFailureEvent {
  /** Tipo de evento */
  eventType: 'AUTHENTICATION_FAILURE'
  /** Código de error específico */
  errorCode: McpErrorCode
  /** Descripción del error */
  errorMessage: string
  /** Contexto de seguridad del request */
  context: SecurityContext
  /** Detalles específicos del fallo */
  failureDetails: {
    /** Etapa en la que falló la autenticación */
    failureStage:
      | 'HOST_VALIDATION'
      | 'HEADER_PARSING'
      | 'KEY_FORMAT'
      | 'KEY_LOOKUP'
      | 'PERMISSION_CHECK'
      | 'INTERNAL_ERROR'
    /** Información parcial de la key (sin revelar valor completo) */
    mcpKeyInfo?: {
      keyPrefix: string
      keyLength: number
      hasValidFormat: boolean
    }
    /** Host que intentó conectar */
    attemptedHost?: string
    /** Información adicional del intento */
    additionalInfo?: Record<string, any>
  }
  /** Nivel de severidad del evento */
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
}

/**
 * Evento de autenticación exitosa para logging de auditoría
 */
export interface AuthenticationSuccessEvent {
  /** Tipo de evento */
  eventType: 'AUTHENTICATION_SUCCESS'
  /** Contexto de seguridad del request */
  context: SecurityContext
  /** Detalles de la autenticación exitosa */
  authDetails: {
    /** ID del usuario autenticado */
    userId: string
    /** Email del usuario */
    userEmail?: string
    /** ID de la MCP Key usada */
    mcpKeyId: string
    /** Nombre de la MCP Key */
    mcpKeyName: string
    /** Si la key tiene acceso a todos los proyectos */
    hasAllProjects: boolean
    /** Cantidad de proyectos accesibles */
    projectCount: number
    /** Últimos 4 caracteres de la key para identificación */
    keyLastFour: string
  }
}

/**
 * Evento de acceso denegado a recursos específicos
 */
export interface AccessDeniedEvent {
  /** Tipo de evento */
  eventType: 'ACCESS_DENIED'
  /** Código de error específico */
  errorCode: McpErrorCode
  /** Contexto de seguridad del request */
  context: SecurityContext
  /** Detalles del usuario autenticado */
  userDetails: {
    userId: string
    mcpKeyId: string
    mcpKeyName: string
  }
  /** Detalles del recurso al que se intentó acceder */
  resourceDetails: {
    /** Tipo de recurso (project, video, etc.) */
    resourceType: 'PROJECT' | 'VIDEO' | 'RESOURCE'
    /** IDs de los recursos solicitados */
    resourceIds: string[]
    /** Proyectos accesibles por el usuario */
    accessibleProjects: string[]
  }
}

export type SecurityEvent =
  | AuthenticationFailureEvent
  | AuthenticationSuccessEvent
  | AccessDeniedEvent

// ============================================================================
// EXTRACTOR DE CONTEXTO DE SEGURIDAD
// ============================================================================

/**
 * Extrae información de contexto de seguridad de un request
 * @param request - Request object de Next.js
 * @param endpoint - Endpoint específico para logging
 * @returns SecurityContext con información completa
 */
export function extractSecurityContext(request: Request, endpoint: string): SecurityContext {
  // Generar request ID único
  const requestId = generateRequestId()

  // Extraer headers de seguridad importantes
  const userAgent = request.headers.get('user-agent')
  const host = request.headers.get('host')
  const referer = request.headers.get('referer')
  const forwardedFor = request.headers.get('x-forwarded-for')

  // Intentar extraer IP real del cliente
  const clientIP = extractClientIP(request)

  return {
    clientIP,
    userAgent,
    host,
    referer,
    forwardedFor,
    requestId,
    timestamp: new Date().toISOString(),
    endpoint,
    method: request.method,
  }
}

/**
 * Extrae la IP real del cliente considerando proxies
 * @param request - Request object
 * @returns IP address del cliente o null si no se puede determinar
 */
function extractClientIP(request: Request): string | null {
  // Intentar extraer IP de varios headers comunes
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    // X-Forwarded-For puede contener múltiples IPs, tomar la primera
    const ips = forwardedFor.split(',').map((ip) => ip.trim())
    if (ips.length > 0 && ips[0] !== '') {
      return ips[0]
    }
  }

  const realIP = request.headers.get('x-real-ip')
  if (realIP) {
    return realIP
  }

  const clientIP = request.headers.get('x-client-ip')
  if (clientIP) {
    return clientIP
  }

  // En desarrollo local, podríamos usar otros métodos
  // En producción, Vercel/Cloudflare/AWS proporcionan estos headers
  return null
}

/**
 * Genera un ID único para el request para tracking
 * @returns String ID único
 */
function generateRequestId(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 8)
  return `mcp_${timestamp}_${random}`
}

// ============================================================================
// FUNCIONES DE LOGGING DE SEGURIDAD
// ============================================================================

/**
 * Registra un fallo de autenticación con detalles completos de seguridad
 * @param errorCode - Código de error específico
 * @param errorMessage - Mensaje de error
 * @param context - Contexto de seguridad del request
 * @param failureDetails - Detalles específicos del fallo
 */
export function logAuthenticationFailure(
  errorCode: McpErrorCode,
  errorMessage: string,
  context: SecurityContext,
  failureDetails: AuthenticationFailureEvent['failureDetails'],
): void {
  // Determinar severidad basada en el tipo de error
  const severity = determineSeverity(errorCode, failureDetails.failureStage)

  const event: AuthenticationFailureEvent = {
    eventType: 'AUTHENTICATION_FAILURE',
    errorCode,
    errorMessage,
    context,
    failureDetails,
    severity,
  }

  // Log estructurado para parsing automático
  const logLevel = severity === 'CRITICAL' || severity === 'HIGH' ? 'error' : 'warn'

  console[logLevel]('[MCP_SECURITY] Authentication Failure:', {
    ...event,
    // Información resumida para logs más limpios
    summary: {
      requestId: context.requestId,
      clientIP: context.clientIP || 'unknown',
      errorCode,
      failureStage: failureDetails.failureStage,
      severity,
      endpoint: context.endpoint,
      timestamp: context.timestamp,
    },
  })

  // Log adicional para eventos de alta severidad
  if (severity === 'CRITICAL' || severity === 'HIGH') {
    console.error('[MCP_SECURITY] HIGH SEVERITY AUTHENTICATION FAILURE:', {
      alert: '🚨 SECURITY ALERT',
      requestId: context.requestId,
      clientIP: context.clientIP,
      userAgent: context.userAgent,
      errorCode,
      endpoint: context.endpoint,
      recommendation: getSecurityRecommendation(errorCode, failureDetails.failureStage),
    })
  }
}

/**
 * Registra una autenticación exitosa para auditoría
 * @param context - Contexto de seguridad del request
 * @param mcpKeyData - Datos de la MCP Key autenticada
 * @param accessibleProjects - Proyectos accesibles
 */
export function logAuthenticationSuccess(
  context: SecurityContext,
  mcpKeyData: McpKeyData,
  accessibleProjects: any[],
): void {
  const event: AuthenticationSuccessEvent = {
    eventType: 'AUTHENTICATION_SUCCESS',
    context,
    authDetails: {
      userId: mcpKeyData.user.id,
      userEmail: mcpKeyData.user.email || undefined,
      mcpKeyId: mcpKeyData.id,
      mcpKeyName: mcpKeyData.name,
      hasAllProjects: mcpKeyData.hasAllProjects || false,
      projectCount: accessibleProjects?.length || 0,
      keyLastFour: mcpKeyData.keyValueLastFour,
    },
  }

  console.log('[MCP_SECURITY] Authentication Success:', {
    ...event,
    summary: {
      requestId: context.requestId,
      clientIP: context.clientIP || 'unknown',
      userId: mcpKeyData.user.id,
      mcpKeyId: mcpKeyData.id,
      endpoint: context.endpoint,
      projectCount: accessibleProjects?.length || 0,
      timestamp: context.timestamp,
    },
  })
}

/**
 * Registra un acceso denegado a recursos específicos
 * @param errorCode - Código de error específico
 * @param context - Contexto de seguridad del request
 * @param userDetails - Detalles del usuario autenticado
 * @param resourceDetails - Detalles del recurso solicitado
 */
export function logAccessDenied(
  errorCode: McpErrorCode,
  context: SecurityContext,
  userDetails: AccessDeniedEvent['userDetails'],
  resourceDetails: AccessDeniedEvent['resourceDetails'],
): void {
  const event: AccessDeniedEvent = {
    eventType: 'ACCESS_DENIED',
    errorCode,
    context,
    userDetails,
    resourceDetails,
  }

  console.warn('[MCP_SECURITY] Access Denied:', {
    ...event,
    summary: {
      requestId: context.requestId,
      clientIP: context.clientIP || 'unknown',
      userId: userDetails.userId,
      resourceType: resourceDetails.resourceType,
      resourceCount: resourceDetails.resourceIds.length,
      errorCode,
      endpoint: context.endpoint,
      timestamp: context.timestamp,
    },
  })
}

// ============================================================================
// FUNCIONES HELPER DE SEGURIDAD
// ============================================================================

/**
 * Determina la severidad de un evento de seguridad
 * @param errorCode - Código de error
 * @param failureStage - Etapa del fallo
 * @returns Nivel de severidad
 */
function determineSeverity(
  errorCode: McpErrorCode,
  failureStage: AuthenticationFailureEvent['failureDetails']['failureStage'],
): AuthenticationFailureEvent['severity'] {
  // Eventos críticos
  if (failureStage === 'INTERNAL_ERROR') {
    return 'CRITICAL'
  }

  // Eventos de alta severidad
  if (errorCode === MCP_ERROR_CODES.INVALID_HOST || failureStage === 'HOST_VALIDATION') {
    return 'HIGH'
  }

  // Eventos de severidad media
  if (
    errorCode === MCP_ERROR_CODES.KEY_NOT_FOUND ||
    errorCode === MCP_ERROR_CODES.INVALID_KEY_FORMAT ||
    failureStage === 'KEY_LOOKUP' ||
    failureStage === 'KEY_FORMAT'
  ) {
    return 'MEDIUM'
  }

  // Otros eventos de baja severidad
  return 'LOW'
}

/**
 * Proporciona recomendaciones de seguridad basadas en el tipo de fallo
 * @param errorCode - Código de error
 * @param failureStage - Etapa del fallo
 * @returns Recomendación de seguridad
 */
function getSecurityRecommendation(
  errorCode: McpErrorCode,
  failureStage: AuthenticationFailureEvent['failureDetails']['failureStage'],
): string {
  switch (failureStage) {
    case 'HOST_VALIDATION':
      return 'Verify that only authorized hosts are attempting to connect. Consider IP allowlisting.'

    case 'KEY_FORMAT':
      return 'Monitor for repeated invalid key format attempts. May indicate automated attacks.'

    case 'KEY_LOOKUP':
      return 'Check if this represents a compromised or stolen key attempt.'

    case 'INTERNAL_ERROR':
      return 'Investigate system integrity. Internal errors during auth may indicate system compromise.'

    default:
      return 'Monitor for patterns and repeated attempts from same IP.'
  }
}

/**
 * Crea información segura de la MCP key para logging (sin exponer el valor completo)
 * @param mcpKey - Valor completo de la MCP key
 * @returns Información segura para logging
 */
export function createSafeMcpKeyInfo(
  mcpKey: string,
): AuthenticationFailureEvent['failureDetails']['mcpKeyInfo'] {
  if (!mcpKey) {
    return {
      keyPrefix: 'null',
      keyLength: 0,
      hasValidFormat: false,
    }
  }

  return {
    keyPrefix: mcpKey.length >= 10 ? mcpKey.substring(0, 10) : mcpKey,
    keyLength: mcpKey.length,
    hasValidFormat: /^pcsk_[A-Za-z0-9]{30,}$/.test(mcpKey),
  }
}
