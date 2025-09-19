import type { Resource } from '@/payload-types'

/**
 * Calcula el estado de confianza de un recurso basándose en los campos analizados
 *
 * @param resource - El recurso a evaluar
 * @param threshold - Umbral de confianza en porcentaje (0-100)
 * @returns El estado de confianza del recurso
 */
export function calculateResourceConfidence(
  resource: any, // Resource type con analyzeResult
  threshold: number,
  options?: { requiredFieldNames?: Set<string> | string[] },
): 'empty' | 'needs_revision' | 'trusted' | 'verified' {
  // Convertir threshold de porcentaje (0-100) a decimal (0-1)
  const thresholdDecimal = threshold / 100

  // Si no existe analyzeResult o no tiene fields, estado = empty
  const analyzeResult = resource.analyzeResult
  if (!analyzeResult || !analyzeResult.fields || typeof analyzeResult.fields !== 'object') {
    return 'empty'
  }

  const fields = analyzeResult.fields
  const fieldNames = Object.keys(fields)

  // Si no hay campos, estado = empty
  if (fieldNames.length === 0) {
    return 'empty'
  }

  // Clasificar campos por su estado
  const lowConfidenceFields: string[] = []
  const manualFields: string[] = []

  const requiredSet: Set<string> | null = Array.isArray(options?.requiredFieldNames)
    ? new Set(options?.requiredFieldNames as string[])
    : options?.requiredFieldNames instanceof Set
      ? (options?.requiredFieldNames as Set<string>)
      : null

  for (const fieldName of fieldNames) {
    const field = fields[fieldName]

    // Verificar que el campo tenga estructura válida
    if (!field || typeof field !== 'object') {
      continue
    }

    const isRequired = requiredSet ? requiredSet.has(fieldName) : true
    const confidence = field.confidence
    const isManual = field.manual === true

    // Si el campo fue marcado como manual, añadirlo a la lista
    if (isManual) {
      manualFields.push(fieldName)
    }

    // Si el campo es obligatorio y (no tiene confidence o tiene confidence < threshold) y no es manual
    if (isRequired && !isManual) {
      if (typeof confidence !== 'number' || confidence < thresholdDecimal) {
        lowConfidenceFields.push(fieldName)
      }
    }
  }

  // Campos que originalmente tenían baja confianza (incluyendo los que ahora son manuales)
  const originalLowConfidenceFields: string[] = []

  for (const fieldName of fieldNames) {
    const field = fields[fieldName]
    if (!field || typeof field !== 'object') {
      continue
    }

    const isRequired = requiredSet ? requiredSet.has(fieldName) : true
    const confidence = field.confidence
    if (isRequired && typeof confidence === 'number' && confidence < thresholdDecimal) {
      originalLowConfidenceFields.push(fieldName)
    }
  }

  // Lógica de determinación de estado:

  // Si hay campos con baja confianza que NO han sido corregidos manualmente
  if (lowConfidenceFields.length > 0) {
    return 'needs_revision'
  }

  // Si todos los campos tienen confianza >= threshold (incluyendo los corregidos manualmente)
  // NOTA: 'verified' ahora solo se asigna manualmente por el usuario mediante doble aceptación
  return 'trusted'
}

/**
 * Valida si todos los campos obligatorios tienen confianza suficiente para permitir verificación
 * @param resource - Recurso con analyzeResult
 * @param threshold - Umbral de confianza (0-100)
 * @param options - Opciones con nombres de campos obligatorios
 * @returns true si todos los campos obligatorios tienen confianza >= threshold o son manuales
 */
export function canBeVerified(
  resource: any,
  threshold: number,
  options?: { requiredFieldNames?: Set<string> | string[] },
): boolean {
  if (!resource?.analyzeResult?.fields) {
    return false
  }

  const fields = resource.analyzeResult.fields
  const fieldNames = Object.keys(fields)
  const thresholdDecimal = threshold / 100

  // Convertir a Set si es necesario
  const requiredSet: Set<string> | null =
    options?.requiredFieldNames instanceof Set
      ? options.requiredFieldNames
      : Array.isArray(options?.requiredFieldNames)
        ? new Set(options.requiredFieldNames)
        : options?.requiredFieldNames
          ? (options?.requiredFieldNames as Set<string>)
          : null

  for (const fieldName of fieldNames) {
    const field = fields[fieldName]

    // Verificar que el campo tenga estructura válida
    if (!field || typeof field !== 'object') {
      continue
    }

    const isRequired = requiredSet ? requiredSet.has(fieldName) : true
    if (!isRequired) {
      continue
    }

    const confidence = field.confidence
    const isManual = field.manual === true

    // Si el campo es obligatorio y no es manual y tiene confidence < threshold
    if (typeof confidence === 'number' && confidence < thresholdDecimal && !isManual) {
      return false
    }

    // Si el campo es obligatorio y no tiene confidence y no es manual
    if (typeof confidence !== 'number' && !isManual) {
      return false
    }
  }

  return true
}

/**
 * Función helper para obtener el threshold de la configuración global
 * TODO: Implementar cache para evitar consultas repetidas
 */
export async function getConfidenceThreshold(payload: any): Promise<number> {
  try {
    const config = await payload.findGlobal({
      slug: 'configuracion',
    })

    return config?.confidenceSettings?.confidenceThreshold ?? 70
  } catch (error) {
    console.warn('Error obteniendo threshold de configuración:', error)
    // Valor por defecto si hay error
    return 70
  }
}
