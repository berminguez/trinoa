// ============================================================================
// MCP RATE LIMITING SYSTEM (STRUCTURE FOR FUTURE IMPLEMENTATION)
// ============================================================================

/**
 * Sistema de rate limiting para endpoints MCP
 * Estructura preparada para implementación futura sin activar restricciones actualmente
 */

import { MCP_ERROR_CODES } from './types'
import type { McpErrorCode, McpKeyData } from './types'

// ============================================================================
// CONFIGURACIÓN DE RATE LIMITING
// ============================================================================

/**
 * Configuración de límites por endpoint
 */
export interface RateLimitConfig {
  /** Límite de requests por minuto */
  requestsPerMinute: number
  /** Límite de requests por hora */
  requestsPerHour: number
  /** Límite de requests por día */
  requestsPerDay: number
  /** Si está habilitado el rate limiting para este endpoint */
  enabled: boolean
}

/**
 * Configuración de rate limits por endpoint
 * Actualmente deshabilitados - preparados para activación futura
 */
export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  // Endpoint de autenticación - moderado (para configuración inicial)
  '/api/mcp/auth': {
    requestsPerMinute: 60,
    requestsPerHour: 300,
    requestsPerDay: 2000,
    enabled: false, // Deshabilitado por ahora
  },

  // Endpoint de listado de proyectos - moderado
  '/api/mcp/projects': {
    requestsPerMinute: 30,
    requestsPerHour: 500,
    requestsPerDay: 5000,
    enabled: false,
  },

  // Endpoints de consulta - más permisivos (computacionalmente costosos)
  '/api/mcp/query-project': {
    requestsPerMinute: 10,
    requestsPerHour: 100,
    requestsPerDay: 1000,
    enabled: false,
  },

  '/api/mcp/query-videos': {
    requestsPerMinute: 10,
    requestsPerHour: 100,
    requestsPerDay: 1000,
    enabled: false,
  },

  // Default para endpoints no especificados
  default: {
    requestsPerMinute: 20,
    requestsPerHour: 200,
    requestsPerDay: 2000,
    enabled: false,
  },
}

// ============================================================================
// TRACKING DE USO POR MCP KEY
// ============================================================================

/**
 * Información de uso de una MCP Key
 */
export interface McpKeyUsage {
  /** ID de la MCP Key */
  mcpKeyId: string
  /** Contador de requests por minuto actual */
  requestsThisMinute: number
  /** Contador de requests por hora actual */
  requestsThisHour: number
  /** Contador de requests por día actual */
  requestsThisDay: number
  /** Timestamp del último request */
  lastRequestTime: number
  /** Timestamp del inicio del minuto actual */
  currentMinuteStart: number
  /** Timestamp del inicio de la hora actual */
  currentHourStart: number
  /** Timestamp del inicio del día actual */
  currentDayStart: number
  /** Endpoint más usado */
  mostUsedEndpoint: string
  /** Contadores por endpoint */
  endpointUsage: Record<string, number>
}

/**
 * Cache en memoria para tracking de uso (en producción usar Redis/Database)
 * Estructura preparada para persistencia futura
 */
const usageCache = new Map<string, McpKeyUsage>()

// ============================================================================
// FUNCIONES DE TRACKING (PREPARADAS PARA FUTURO)
// ============================================================================

/**
 * Registra el uso de un endpoint por una MCP Key
 * Actualmente solo para logging - no aplica restricciones
 * @param mcpKeyData - Datos de la MCP Key
 * @param endpoint - Endpoint accedido
 * @param additionalInfo - Información adicional del request
 */
export function trackMcpKeyUsage(
  mcpKeyData: McpKeyData,
  endpoint: string,
  additionalInfo?: {
    requestSize?: number
    responseSize?: number
    processingTimeMs?: number
    success?: boolean
  },
): void {
  const now = Date.now()
  const mcpKeyId = mcpKeyData.id

  // Obtener o crear registro de uso
  let usage = usageCache.get(mcpKeyId)
  if (!usage) {
    usage = createNewUsageRecord(mcpKeyId, now)
  }

  // Actualizar contadores según ventanas de tiempo
  usage = updateUsageCounters(usage, now)

  // Incrementar contadores
  usage.requestsThisMinute++
  usage.requestsThisHour++
  usage.requestsThisDay++
  usage.lastRequestTime = now

  // Tracking por endpoint
  usage.endpointUsage[endpoint] = (usage.endpointUsage[endpoint] || 0) + 1

  // Actualizar endpoint más usado
  const maxUsage = Math.max(...Object.values(usage.endpointUsage))
  const mostUsed = Object.entries(usage.endpointUsage).find(([_, count]) => count === maxUsage)
  if (mostUsed) {
    usage.mostUsedEndpoint = mostUsed[0]
  }

  // Guardar en cache
  usageCache.set(mcpKeyId, usage)

  // Log de uso para análisis futuro
  console.log('[MCP_RATE_LIMITER] Usage tracked:', {
    mcpKeyId,
    mcpKeyName: mcpKeyData.name,
    endpoint,
    requestsThisMinute: usage.requestsThisMinute,
    requestsThisHour: usage.requestsThisHour,
    requestsThisDay: usage.requestsThisDay,
    mostUsedEndpoint: usage.mostUsedEndpoint,
    additionalInfo,
    timestamp: new Date().toISOString(),
  })
}

/**
 * Verifica si una MCP Key ha excedido los límites (PREPARADO PARA FUTURO)
 * Actualmente retorna siempre allowed=true - no aplica restricciones
 * @param mcpKeyData - Datos de la MCP Key
 * @param endpoint - Endpoint a verificar
 * @returns Resultado de la verificación
 */
export function checkRateLimit(
  mcpKeyData: McpKeyData,
  endpoint: string,
): {
  allowed: boolean
  errorCode?: McpErrorCode
  resetTime?: number
  remainingRequests?: number
  limitType?: 'minute' | 'hour' | 'day'
} {
  // Obtener configuración del endpoint
  const config = RATE_LIMITS[endpoint] || RATE_LIMITS['default']

  // Si rate limiting está deshabilitado, permitir siempre
  if (!config.enabled) {
    return { allowed: true }
  }

  // Obtener registro de uso
  const usage = usageCache.get(mcpKeyData.id)
  if (!usage) {
    return { allowed: true }
  }

  const now = Date.now()
  const updatedUsage = updateUsageCounters(usage, now)

  // Verificar límites (en orden de severidad)
  if (updatedUsage.requestsThisMinute >= config.requestsPerMinute) {
    return {
      allowed: false,
      errorCode: MCP_ERROR_CODES.RATE_LIMIT_EXCEEDED,
      resetTime: updatedUsage.currentMinuteStart + 60000, // +1 minuto
      remainingRequests: 0,
      limitType: 'minute',
    }
  }

  if (updatedUsage.requestsThisHour >= config.requestsPerHour) {
    return {
      allowed: false,
      errorCode: MCP_ERROR_CODES.RATE_LIMIT_EXCEEDED,
      resetTime: updatedUsage.currentHourStart + 3600000, // +1 hora
      remainingRequests: 0,
      limitType: 'hour',
    }
  }

  if (updatedUsage.requestsThisDay >= config.requestsPerDay) {
    return {
      allowed: false,
      errorCode: MCP_ERROR_CODES.RATE_LIMIT_EXCEEDED,
      resetTime: updatedUsage.currentDayStart + 86400000, // +1 día
      remainingRequests: 0,
      limitType: 'day',
    }
  }

  return {
    allowed: true,
    remainingRequests: Math.min(
      config.requestsPerMinute - updatedUsage.requestsThisMinute,
      config.requestsPerHour - updatedUsage.requestsThisHour,
      config.requestsPerDay - updatedUsage.requestsThisDay,
    ),
  }
}

/**
 * Obtiene estadísticas de uso de una MCP Key
 * @param mcpKeyId - ID de la MCP Key
 * @returns Estadísticas de uso o null si no existe
 */
export function getMcpKeyUsageStats(mcpKeyId: string): McpKeyUsage | null {
  const usage = usageCache.get(mcpKeyId)
  if (!usage) {
    return null
  }

  const now = Date.now()
  return updateUsageCounters(usage, now)
}

/**
 * Obtiene estadísticas globales de uso del sistema
 * @returns Estadísticas agregadas
 */
export function getGlobalUsageStats(): {
  totalActiveKeys: number
  totalRequestsToday: number
  mostActiveKey: string | null
  mostUsedEndpoint: string | null
  averageRequestsPerKey: number
} {
  const allUsage = Array.from(usageCache.values())
  const now = Date.now()

  const stats = {
    totalActiveKeys: allUsage.length,
    totalRequestsToday: 0,
    mostActiveKey: null as string | null,
    mostUsedEndpoint: null as string | null,
    averageRequestsPerKey: 0,
  }

  if (allUsage.length === 0) {
    return stats
  }

  // Actualizar contadores y calcular estadísticas
  let maxRequests = 0
  const endpointTotals: Record<string, number> = {}

  for (const usage of allUsage) {
    const updated = updateUsageCounters(usage, now)
    stats.totalRequestsToday += updated.requestsThisDay

    if (updated.requestsThisDay > maxRequests) {
      maxRequests = updated.requestsThisDay
      stats.mostActiveKey = updated.mcpKeyId
    }

    // Agregar estadísticas por endpoint
    for (const [endpoint, count] of Object.entries(updated.endpointUsage)) {
      endpointTotals[endpoint] = (endpointTotals[endpoint] || 0) + count
    }
  }

  // Encontrar endpoint más usado
  const maxEndpointUsage = Math.max(...Object.values(endpointTotals))
  const mostUsed = Object.entries(endpointTotals).find(([_, count]) => count === maxEndpointUsage)
  if (mostUsed) {
    stats.mostUsedEndpoint = mostUsed[0]
  }

  stats.averageRequestsPerKey = stats.totalRequestsToday / allUsage.length

  return stats
}

// ============================================================================
// FUNCIONES HELPER INTERNAS
// ============================================================================

/**
 * Crea un nuevo registro de uso para una MCP Key
 */
function createNewUsageRecord(mcpKeyId: string, now: number): McpKeyUsage {
  const minuteStart = Math.floor(now / 60000) * 60000
  const hourStart = Math.floor(now / 3600000) * 3600000
  const dayStart = Math.floor(now / 86400000) * 86400000

  return {
    mcpKeyId,
    requestsThisMinute: 0,
    requestsThisHour: 0,
    requestsThisDay: 0,
    lastRequestTime: now,
    currentMinuteStart: minuteStart,
    currentHourStart: hourStart,
    currentDayStart: dayStart,
    mostUsedEndpoint: '',
    endpointUsage: {},
  }
}

/**
 * Actualiza los contadores de uso basado en ventanas de tiempo
 */
function updateUsageCounters(usage: McpKeyUsage, now: number): McpKeyUsage {
  const minuteStart = Math.floor(now / 60000) * 60000
  const hourStart = Math.floor(now / 3600000) * 3600000
  const dayStart = Math.floor(now / 86400000) * 86400000

  // Reset contadores si han pasado las ventanas de tiempo
  if (minuteStart > usage.currentMinuteStart) {
    usage.requestsThisMinute = 0
    usage.currentMinuteStart = minuteStart
  }

  if (hourStart > usage.currentHourStart) {
    usage.requestsThisHour = 0
    usage.currentHourStart = hourStart
  }

  if (dayStart > usage.currentDayStart) {
    usage.requestsThisDay = 0
    usage.currentDayStart = dayStart
    usage.endpointUsage = {} // Reset estadísticas diarias
  }

  return usage
}

/**
 * Limpia registros antiguos del cache (para evitar memory leaks)
 * Debería ejecutarse periódicamente en producción
 */
export function cleanupOldUsageRecords(): void {
  const now = Date.now()
  const oneDayAgo = now - 86400000 // 24 horas

  for (const [mcpKeyId, usage] of usageCache.entries()) {
    if (usage.lastRequestTime < oneDayAgo) {
      usageCache.delete(mcpKeyId)
    }
  }

  console.log('[MCP_RATE_LIMITER] Cleanup completed:', {
    remainingKeys: usageCache.size,
    timestamp: new Date().toISOString(),
  })
}

// ============================================================================
// CONFIGURACIÓN PARA ACTIVACIÓN FUTURA
// ============================================================================

/**
 * Habilita rate limiting para un endpoint específico
 * Para uso futuro cuando se quiera activar el sistema
 * @param endpoint - Endpoint a habilitar
 * @param config - Configuración opcional
 */
export function enableRateLimitingForEndpoint(
  endpoint: string,
  config?: Partial<RateLimitConfig>,
): void {
  if (config) {
    RATE_LIMITS[endpoint] = { ...RATE_LIMITS[endpoint], ...config, enabled: true }
  } else {
    RATE_LIMITS[endpoint].enabled = true
  }

  console.log('[MCP_RATE_LIMITER] Rate limiting enabled for endpoint:', {
    endpoint,
    config: RATE_LIMITS[endpoint],
  })
}

/**
 * Deshabilita rate limiting para un endpoint específico
 */
export function disableRateLimitingForEndpoint(endpoint: string): void {
  RATE_LIMITS[endpoint].enabled = false

  console.log('[MCP_RATE_LIMITER] Rate limiting disabled for endpoint:', endpoint)
}
