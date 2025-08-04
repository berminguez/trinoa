// ============================================================================
// INPUT SANITIZATION UTILITIES
// ============================================================================

/**
 * Sanitiza strings básicos eliminando caracteres peligrosos
 */
export function sanitizeBasicString(input: string | null | undefined): string {
  if (!input || typeof input !== 'string') {
    return ''
  }

  return (
    input
      .trim()
      // Eliminar caracteres de control
      .replace(/[\x00-\x1F\x7F]/g, '')
      // Eliminar caracteres HTML peligrosos
      .replace(/[<>'"&]/g, (char) => {
        const htmlEntities: Record<string, string> = {
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#x27;',
          '&': '&amp;',
        }
        return htmlEntities[char] || char
      })
      // Eliminar espacios múltiples
      .replace(/\s+/g, ' ')
  )
}

/**
 * Sanitiza nombres de API Keys con validación adicional
 */
export function sanitizeApiKeyName(input: string | null | undefined): {
  sanitized: string
  isValid: boolean
  error?: string
} {
  const sanitized = sanitizeBasicString(input)

  // Validaciones específicas para nombres de API Keys
  if (!sanitized) {
    return {
      sanitized: '',
      isValid: false,
      error: 'El nombre es requerido',
    }
  }

  if (sanitized.length < 3) {
    return {
      sanitized,
      isValid: false,
      error: 'El nombre debe tener al menos 3 caracteres',
    }
  }

  if (sanitized.length > 50) {
    return {
      sanitized: sanitized.substring(0, 50),
      isValid: false,
      error: 'El nombre no puede exceder 50 caracteres',
    }
  }

  // Verificar que no contiene solo caracteres especiales
  if (!/[a-zA-Z0-9]/.test(sanitized)) {
    return {
      sanitized,
      isValid: false,
      error: 'El nombre debe contener al menos un carácter alfanumérico',
    }
  }

  return {
    sanitized,
    isValid: true,
  }
}

/**
 * Sanitiza y valida arrays de IDs de proyectos
 */
export function sanitizeProjectIds(input: string[] | null | undefined): {
  sanitized: string[]
  isValid: boolean
  error?: string
} {
  if (!input || !Array.isArray(input)) {
    return {
      sanitized: [],
      isValid: true, // Array vacío es válido
    }
  }

  const sanitized: string[] = []

  for (const id of input) {
    if (typeof id !== 'string') {
      return {
        sanitized: [],
        isValid: false,
        error: 'IDs de proyecto inválidos',
      }
    }

    const sanitizedId = id.trim()

    // Validar formato de ID (ObjectId de MongoDB)
    if (!/^[a-fA-F0-9]{24}$/.test(sanitizedId)) {
      return {
        sanitized: [],
        isValid: false,
        error: 'Formato de ID de proyecto inválido',
      }
    }

    sanitized.push(sanitizedId)
  }

  // Eliminar duplicados
  const uniqueIds = [...new Set(sanitized)]

  // Validar límite razonable de proyectos
  if (uniqueIds.length > 50) {
    return {
      sanitized: uniqueIds.slice(0, 50),
      isValid: false,
      error: 'No se pueden seleccionar más de 50 proyectos',
    }
  }

  return {
    sanitized: uniqueIds,
    isValid: true,
  }
}

/**
 * Sanitiza parámetros de paginación y límites
 */
export function sanitizePaginationParams(
  limit?: number | string | null,
  offset?: number | string | null,
): {
  limit: number
  offset: number
  isValid: boolean
  error?: string
} {
  let sanitizedLimit = 50 // Default
  let sanitizedOffset = 0 // Default

  // Sanitizar limit
  if (limit !== null && limit !== undefined) {
    const parsedLimit = typeof limit === 'string' ? parseInt(limit, 10) : limit

    if (isNaN(parsedLimit) || parsedLimit < 1) {
      return {
        limit: sanitizedLimit,
        offset: sanitizedOffset,
        isValid: false,
        error: 'Límite inválido',
      }
    }

    if (parsedLimit > 100) {
      sanitizedLimit = 100 // Máximo permitido
    } else {
      sanitizedLimit = parsedLimit
    }
  }

  // Sanitizar offset
  if (offset !== null && offset !== undefined) {
    const parsedOffset = typeof offset === 'string' ? parseInt(offset, 10) : offset

    if (isNaN(parsedOffset) || parsedOffset < 0) {
      return {
        limit: sanitizedLimit,
        offset: sanitizedOffset,
        isValid: false,
        error: 'Offset inválido',
      }
    }

    sanitizedOffset = parsedOffset
  }

  return {
    limit: sanitizedLimit,
    offset: sanitizedOffset,
    isValid: true,
  }
}

/**
 * Valida que un string no contenga inyecciones de código peligrosas
 */
export function detectDangerousPatterns(input: string): {
  isSafe: boolean
  detectedPattern?: string
} {
  const dangerousPatterns = [
    /script/i,
    /javascript:/i,
    /vbscript:/i,
    /on\w+\s*=/i,
    /expression\s*\(/i,
    /import\s+/i,
    /require\s*\(/i,
    /eval\s*\(/i,
    /function\s*\(/i,
    /\$\{.*\}/,
    /<%.*%>/,
    /{{.*}}/,
  ]

  for (const pattern of dangerousPatterns) {
    if (pattern.test(input)) {
      return {
        isSafe: false,
        detectedPattern: pattern.toString(),
      }
    }
  }

  return {
    isSafe: true,
  }
}
