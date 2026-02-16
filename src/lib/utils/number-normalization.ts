/**
 * Normaliza una cadena numérica a un formato estándar con punto decimal.
 * Maneja separadores de miles y decimales de forma robusta tanto para formato europeo como inglés.
 *
 * Ejemplos:
 * - "10.603,382" -> "10603.382"
 * - "10,603.382" -> "10603.382"
 * - "1.234,56"   -> "1234.56"
 * - "1,234.56"   -> "1234.56"
 * - "10603,382"  -> "10603.382"
 *
 * @param orig - Cadena original a normalizar
 * @returns Cadena normalizada en formato "1234.56" o "1234"
 */
export const normalizeNumericString = (orig: any): string => {
  if (orig === null || orig === undefined) return ''
  if (typeof orig === 'number') return String(orig)
  if (typeof orig !== 'string') return ''

  let s = orig.trim().replace(/[\s€$£¥₹₽₩₦₴₱₪₫฿]/g, '')
  let sign = ''

  if (s.startsWith('-')) {
    sign = '-'
    s = s.slice(1)
  }

  const hasComma = s.includes(',')
  const hasDot = s.includes('.')

  if (hasComma && hasDot) {
    // Determinar cuál es el separador decimal (el último)
    const lastCommaPos = s.lastIndexOf(',')
    const lastDotPos = s.lastIndexOf('.')
    const decPos = Math.max(lastCommaPos, lastDotPos)

    const intPart = s
      .slice(0, decPos)
      .replace(/[\.,]/g, '')
      .replace(/[^0-9]/g, '')

    const fracPart = s
      .slice(decPos + 1)
      .replace(/[\.,]/g, '')
      .replace(/[^0-9]/g, '')

    return sign + intPart + (fracPart ? '.' + fracPart : '')
  } else if (hasComma) {
    // Si solo hay comas, la última es decimal si hay 1-3 dígitos después (probablemente europeo)
    // EXCEPCIÓN: Si tiene más de una coma, son separadores de miles
    const parts = s.split(',')
    if (parts.length === 2 && parts[1].length <= 3) {
      // Formato: 1234,56 (coma decimal) -> convertir a punto
      const intPart = parts[0].replace(/[^0-9]/g, '')
      const fracPart = parts[1].replace(/[^0-9]/g, '')
      return sign + intPart + (fracPart ? '.' + fracPart : '')
    } else {
      // Formato: 1,234,567 (comas como separadores de miles)
      const intPart = parts.join('').replace(/[^0-9]/g, '')
      return sign + intPart
    }
  } else if (hasDot) {
    // Si solo hay puntos, el último es decimal si hay 1-3 dígitos después
    const parts = s.split('.')
    const lastPart = parts[parts.length - 1]
    if (parts.length === 2 && lastPart.length <= 3) {
      // Formato: 1234.56 (punto decimal) -> mantener punto
      const intPart = parts[0].replace(/[^0-9]/g, '')
      const fracPart = lastPart.replace(/[^0-9]/g, '')
      return sign + intPart + (fracPart ? '.' + fracPart : '')
    } else {
      // Formato: 1.234.567 (puntos como separadores de miles)
      const intPart = parts.join('').replace(/[^0-9]/g, '')
      return sign + intPart
    }
  } else {
    const digits = s.replace(/[^0-9]/g, '')
    return sign + digits
  }
}

/**
 * Convierte una cadena a número de forma segura tras normalizarla.
 */
export const parseNormalizedFloat = (input: string | number | null | undefined): number => {
  if (typeof input === 'number') return input
  const normalized = normalizeNumericString(input)
  if (!normalized) return 0
  const n = parseFloat(normalized)
  return isNaN(n) ? 0 : n
}
