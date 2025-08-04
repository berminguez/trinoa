// ============================================================================
// RESPONSE VALIDATION UTILITIES
// ============================================================================

import { securityLogger, SecurityEventType, SecuritySeverity } from './securityLogger'

/**
 * Valida que una API Key nunca se exponga en texto plano en las respuestas
 */
export function validateApiKeyExposure(
  keyValue: string,
  context: string = 'unknown',
): {
  isSafe: boolean
  error?: string
} {
  // La API Key debe estar formateada como pcsk_****...****[últimos4]
  // y nunca debe ser una key completa en texto plano

  // Verificar si es una key completa en texto plano (empieza con pcsk_ y tiene 37 caracteres)
  if (keyValue.startsWith('pcsk_') && keyValue.length === 37 && !/\*/.test(keyValue)) {
    // ¡PELIGRO! Se está exponiendo una API key completa
    securityLogger.logEvent({
      type: SecurityEventType.DATA_ACCESS_VIOLATION,
      severity: SecuritySeverity.CRITICAL,
      timestamp: new Date(),
      message: `CRITICAL: Plain text API key detected in response at ${context}`,
      details: {
        context,
        keyFormat: 'plain_text_api_key',
        keyLength: keyValue.length,
        keyPrefix: keyValue.substring(0, 10) + '...',
        action: 'api_key_exposure_detected',
      },
    })

    return {
      isSafe: false,
      error: 'API Key exposure detected',
    }
  }

  // Verificar si es un hash SHA-256 (64 caracteres hexadecimales)
  if (/^[a-fA-F0-9]{64}$/.test(keyValue)) {
    // ¡PELIGRO! Se está exponiendo el hash completo de la API key
    securityLogger.logEvent({
      type: SecurityEventType.DATA_ACCESS_VIOLATION,
      severity: SecuritySeverity.HIGH,
      timestamp: new Date(),
      message: `HIGH: API key hash detected in response at ${context}`,
      details: {
        context,
        keyFormat: 'sha256_hash',
        keyLength: keyValue.length,
        action: 'api_key_hash_exposure_detected',
      },
    })

    return {
      isSafe: false,
      error: 'API Key hash exposure detected',
    }
  }

  // Verificar que tenga el formato correcto de display: pcsk_****...****[últimos4]
  const displayFormatRegex = /^pcsk_\*{4}\.\.\.\*{4}[a-zA-Z0-9]{4}$/
  if (!displayFormatRegex.test(keyValue)) {
    securityLogger.logEvent({
      type: SecurityEventType.DATA_ACCESS_VIOLATION,
      severity: SecuritySeverity.MEDIUM,
      timestamp: new Date(),
      message: `MEDIUM: Invalid API key format in response at ${context}`,
      details: {
        context,
        keyFormat: 'invalid_format',
        keyValue: keyValue.substring(0, 20) + '...',
        expectedFormat: 'pcsk_****...****[last4]',
        action: 'invalid_key_format_detected',
      },
    })

    return {
      isSafe: false,
      error: 'Invalid API Key format',
    }
  }

  return {
    isSafe: true,
  }
}

/**
 * Sanitiza un objeto de respuesta para asegurar que no contenga datos sensibles
 */
export function sanitizeApiResponse<T extends Record<string, any>>(
  response: T,
  context: string = 'api_response',
): T {
  const sanitized = { ...response }

  // Función recursiva para sanitizar objetos anidados
  function sanitizeRecursive(obj: any, path: string = ''): any {
    if (obj === null || obj === undefined) {
      return obj
    }

    if (Array.isArray(obj)) {
      return obj.map((item, index) => sanitizeRecursive(item, `${path}[${index}]`))
    }

    if (typeof obj === 'object') {
      const sanitizedObj: any = {}

      for (const [key, value] of Object.entries(obj)) {
        const currentPath = path ? `${path}.${key}` : key

        // Verificar si el campo contiene una API Key
        if (key === 'keyValue' && typeof value === 'string') {
          const validation = validateApiKeyExposure(value, `${context}:${currentPath}`)

          if (!validation.isSafe) {
            // Si no es seguro, reemplazar con formato de display seguro
            sanitizedObj[key] = 'pcsk_****...****[REDACTED]'

            console.error(`⚠️ API Key exposure prevented at ${context}:${currentPath}`)
          } else {
            sanitizedObj[key] = value
          }
        }
        // Verificar otros campos sensibles
        else if (
          (key.toLowerCase().includes('password') ||
            key.toLowerCase().includes('secret') ||
            key.toLowerCase().includes('token') ||
            key.toLowerCase().includes('hash')) &&
          typeof value === 'string'
        ) {
          // Redactar otros campos sensibles
          sanitizedObj[key] = '[REDACTED]'

          securityLogger.logEvent({
            type: SecurityEventType.DATA_ACCESS_VIOLATION,
            severity: SecuritySeverity.MEDIUM,
            timestamp: new Date(),
            message: `Sensitive field redacted in response at ${context}:${currentPath}`,
            details: {
              context,
              fieldName: key,
              fieldPath: currentPath,
              action: 'sensitive_field_redacted',
            },
          })
        } else {
          // Continuar sanitización recursiva
          sanitizedObj[key] = sanitizeRecursive(value, currentPath)
        }
      }

      return sanitizedObj
    }

    return obj
  }

  return sanitizeRecursive(sanitized, context)
}

/**
 * Valida que una respuesta de server action sea segura
 */
export function validateServerActionResponse<T>(
  response: T,
  actionName: string = 'unknown_action',
): T {
  if (typeof response === 'object' && response !== null) {
    return sanitizeApiResponse(response as any, `server_action:${actionName}`)
  }

  return response
}

/**
 * Middleware para validar respuestas de API endpoints
 */
export function createResponseValidator(endpointName: string) {
  return function validateResponse<T>(response: T): T {
    return validateServerActionResponse(response, `api_endpoint:${endpointName}`)
  }
}
