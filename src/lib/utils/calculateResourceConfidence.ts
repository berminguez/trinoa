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

    // Si el campo es obligatorio y tiene confidence < threshold y no es manual, añadirlo a low confidence
    if (
      isRequired &&
      typeof confidence === 'number' &&
      confidence < thresholdDecimal &&
      !isManual
    ) {
      lowConfidenceFields.push(fieldName)
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

  // Si todos los campos que tenían baja confianza ahora tienen manual: true
  if (originalLowConfidenceFields.length > 0) {
    const allLowConfidenceFieldsAreManual = originalLowConfidenceFields.every((fieldName) => {
      const field = fields[fieldName]
      return field && field.manual === true
    })

    if (allLowConfidenceFieldsAreManual) {
      return 'verified'
    }
  }

  // Si todos los campos tienen confianza >= threshold (y no hay campos que requirieron corrección manual)
  return 'trusted'
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
