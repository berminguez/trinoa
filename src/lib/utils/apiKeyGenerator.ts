import crypto from 'crypto'

/**
 * Genera una nueva MCP Key con formato pcsk_ + 32 caracteres aleatorios
 * @returns API Key en formato pcsk_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
 */
export function generateApiKey(): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = 'pcsk_'

  for (let i = 0; i < 32; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length))
  }

  return result
}

/**
 * Hashea una API Key usando SHA-256
 * @param plainKey - API Key en texto plano
 * @returns Hash SHA-256 de la API Key
 */
export function hashApiKey(plainKey: string): string {
  return crypto.createHash('sha256').update(plainKey).digest('hex')
}

/**
 * Verifica si una API Key coincide con su hash
 * @param plainKey - API Key en texto plano
 * @param hashedKey - Hash almacenado en base de datos
 * @returns true si la key coincide con el hash
 */
export function verifyApiKey(plainKey: string, hashedKey: string): boolean {
  const computedHash = hashApiKey(plainKey)
  return computedHash === hashedKey
}

/**
 * Formatea una API Key para mostrar solo los últimos 4 caracteres
 * @param lastFour - Últimos 4 caracteres de la API Key
 * @returns API Key formateada para display (pcsk_****...****1234)
 */
export function formatApiKeyForDisplay(lastFour: string): string {
  return `pcsk_****...****${lastFour}`
}

/**
 * Valida si una cadena tiene el formato correcto de API Key
 * @param apiKey - Cadena a validar
 * @returns true si tiene formato válido (pcsk_ + 32 caracteres alfanuméricos)
 */
export function isValidApiKeyFormat(apiKey: string): boolean {
  // Debe empezar con 'pcsk_'
  if (!apiKey.startsWith('pcsk_')) {
    return false
  }

  // Debe tener exactamente 37 caracteres (pcsk_ + 32)
  if (apiKey.length !== 37) {
    return false
  }

  // Los 32 caracteres después del prefijo deben ser alfanuméricos
  const keyPart = apiKey.substring(5)
  return /^[A-Za-z0-9]+$/.test(keyPart)
}

/**
 * Extrae los últimos 4 caracteres de una API Key
 * @param apiKey - API Key completa
 * @returns Últimos 4 caracteres
 */
export function getLastFourChars(apiKey: string): string {
  return apiKey.slice(-4)
}

/**
 * Datos completos de una nueva API Key generada
 */
export interface GeneratedApiKeyData {
  /** API Key en texto plano (solo disponible al momento de creación) */
  plainKey: string
  /** Hash SHA-256 de la API Key (para almacenar en base de datos) */
  hashedKey: string
  /** Últimos 4 caracteres (para mostrar en UI) */
  lastFour: string
  /** Formato para display inmediato */
  displayKey: string
}

/**
 * Genera una API Key completa con todos los datos necesarios
 * @returns Objeto con todos los datos de la API Key generada
 */
export function generateCompleteApiKey(): GeneratedApiKeyData {
  const plainKey = generateApiKey()
  const hashedKey = hashApiKey(plainKey)
  const lastFour = getLastFourChars(plainKey)
  const displayKey = formatApiKeyForDisplay(lastFour)

  return {
    plainKey,
    hashedKey,
    lastFour,
    displayKey,
  }
}
