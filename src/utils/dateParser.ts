/**
 * Utilidad elegante para parsear fechas de múltiples formatos
 * Usa APIs nativas de JavaScript sin arrays hardcodeados de nombres de meses
 */

export function parseIntelligentDate(value: string | null | undefined): Date | null {
  if (!value || typeof value !== 'string') return null

  const cleanValue = value.trim()
  if (!cleanValue) return null

  // Estrategia 1: Parseo de formatos numéricos (más rápido y confiable)
  const parseNumericFormats = (dateStr: string): Date | null => {
    // Extraer fecha de strings como "Fecha:09.05.2024" o "Fecha 09.05.2024"
    const extractedDate = dateStr.match(/.*?(\d{1,2}[\.\/\-]\d{1,2}[\.\/\-]\d{4})/)
    const cleanDateStr = extractedDate ? extractedDate[1] : dateStr

    // dd/mm/yyyy, dd-mm-yyyy, dd.mm.yyyy (formato europeo)
    const ddmmyyyy = cleanDateStr.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/)
    if (ddmmyyyy) {
      const [, day, month, year] = ddmmyyyy
      // Validar que sea un formato válido (día <= 31, mes <= 12)
      const dayNum = parseInt(day)
      const monthNum = parseInt(month)
      if (dayNum <= 31 && monthNum <= 12) {
        const date = new Date(parseInt(year), monthNum - 1, dayNum)
        if (!isNaN(date.getTime())) return date
      }
    }

    // yyyy/mm/dd, yyyy-mm-dd (formato ISO)
    const yyyymmdd = cleanDateStr.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/)
    if (yyyymmdd) {
      const [, year, month, day] = yyyymmdd
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
      if (!isNaN(date.getTime())) return date
    }

    // dd.mm sin año (asumir año actual)
    const ddmm = cleanDateStr.match(/^(\d{1,2})\.(\d{1,2})$/)
    if (ddmm) {
      const [, day, month] = ddmm
      const currentYear = new Date().getFullYear()
      const date = new Date(currentYear, parseInt(month) - 1, parseInt(day))
      if (!isNaN(date.getTime())) return date
    }

    return null
  }

  // Estrategia 2: Usar mapeo automático de meses con Intl
  const parseWithAutoMonthMapping = (dateStr: string): Date | null => {
    // Generar nombres de meses automáticamente usando Intl
    const getMonthNames = (locale: string) => {
      const months: Record<string, number> = {}
      for (let i = 0; i < 12; i++) {
        const date = new Date(2023, i, 1)
        const monthLong = date.toLocaleDateString(locale, { month: 'long' }).toLowerCase()
        const monthShort = date.toLocaleDateString(locale, { month: 'short' }).toLowerCase()
        months[monthLong] = i
        months[monthShort] = i
      }
      return months
    }

    const locales = ['es-ES', 'en-US', 'de-DE', 'en-GB', 'fr-FR']

    for (const locale of locales) {
      try {
        const monthNames = getMonthNames(locale)

        // Buscar patrón: número + palabra + año
        const patterns = [
          /(\d{1,2})[\s\.]*de[\s\.]*(\w+)[\s\.]*de[\s\.]*(\d{4})/i, // español: "19 de diciembre de 2023"
          /(\d{1,2})[\s\.]*(\w+)[\s\.]*(\d{4})/i, // general: "19 diciembre 2023" o "13. Oktober 2023"
        ]

        for (const pattern of patterns) {
          const match = dateStr.match(pattern)
          if (match) {
            const [, day, monthWord, year] = match
            const monthIndex = monthNames[monthWord.toLowerCase()]

            if (monthIndex !== undefined) {
              const date = new Date(parseInt(year), monthIndex, parseInt(day))
              if (!isNaN(date.getTime())) return date
            }
          }
        }
      } catch (_e) {
        continue
      }
    }

    return null
  }

  // Estrategia 3: Normalización inteligente y parseo nativo
  const parseWithNormalization = (dateStr: string): Date | null => {
    // Normalizar diferentes separadores y formatos
    const normalizations = [
      dateStr, // original
      dateStr.replace(/(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})/gi, '$1 $2 $3'), // español
      dateStr.replace(/(\d{1,2})\.(\s*\w+)\s+(\d{4})/gi, '$1 $2 $3'), // alemán con punto
      dateStr.replace(/(\d{1,2})\/(\d{1,2})\/(\d{4})/, '$3-$2-$1'), // dd/mm/yyyy -> yyyy-mm-dd
      dateStr.replace(/(\d{4})\/(\d{1,2})\/(\d{1,2})/, '$1-$2-$3'), // yyyy/mm/dd -> yyyy-mm-dd
      // Manejar casos como "Fecha 09.05.2024" (asumir DD.MM.YYYY para formato europeo)
      dateStr.replace(/.*?(\d{1,2})[\.\/\-](\d{1,2})[\.\/\-](\d{4}).*/, '$3-$2-$1'),
      // Manejar casos como "2024/11/29"
      dateStr.replace(/.*?(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2}).*/, '$1-$2-$3'),
    ]

    for (const normalized of normalizations) {
      try {
        const parsed = new Date(normalized)
        if (
          !isNaN(parsed.getTime()) &&
          parsed.getFullYear() > 1900 &&
          parsed.getFullYear() < 2100
        ) {
          return parsed
        }
      } catch (_e) {
        continue
      }
    }

    return null
  }

  // Aplicar estrategias en orden de eficiencia
  let parsedDate: Date | null = null

  // 1. Formatos numéricos (más rápido)
  parsedDate = parseNumericFormats(cleanValue)
  if (parsedDate) return parsedDate

  // 2. Mapeo automático de meses
  parsedDate = parseWithAutoMonthMapping(cleanValue)
  if (parsedDate) return parsedDate

  // 3. Normalización y parseo nativo
  parsedDate = parseWithNormalization(cleanValue)
  if (parsedDate) return parsedDate

  return null
}

export function formatDateToDDMMYYYY(date: Date | null): string {
  if (!date || isNaN(date.getTime())) return ''

  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const yyyy = date.getFullYear()

  return `${dd}/${mm}/${yyyy}`
}

/**
 * Función principal que combina parseo inteligente y formateo
 */
export function parseAndFormatDate(value: string | null | undefined): string {
  if (!value || typeof value !== 'string' || !value.trim()) {
    return ''
  }

  const parsedDate = parseIntelligentDate(value)
  return formatDateToDDMMYYYY(parsedDate)
}
