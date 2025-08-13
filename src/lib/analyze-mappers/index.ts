import type { Resource } from '@/payload-types'

import {
  mapFacturaSuministrosAguaFromFields,
  mapFacturaSuministrosElectricidadFromFields,
  mapFacturaSuministrosGasFromFields,
} from './map-factura-suministros'

type AzureField = {
  type?: string
  valueString?: string
  valueDate?: string
  content?: string
  // Otros campos posibles de Azure, que no necesitamos tipar estrictamente
  [key: string]: unknown
}

type AzureDocument = {
  fields?: Record<string, AzureField>
  [key: string]: unknown
}

interface AnalyzeResultLike {
  modelId?: string
  documents?: AzureDocument[]
  [key: string]: unknown
}

export interface MapAnalyzeOptions {
  caso?: Resource['caso'] | string | null
  tipo?: Resource['tipo'] | string | null
  modelId?: string | null
}

/**
 * Punto de entrada de mapeo. Recibe el analyzeResult crudo y devuelve
 * un objeto Partial<Resource> listo para hacer update en Payload.
 */
export function mapAnalyzeResultToResource(
  analyzeResult: unknown,
  { caso, tipo, modelId }: MapAnalyzeOptions = {},
): Partial<Resource> {
  const ar = (analyzeResult || {}) as AnalyzeResultLike
  const resolvedModel = (modelId || ar.modelId || '').toString().toLowerCase()
  const resolvedCaso = (caso || '')?.toString()
  const resolvedTipo = (tipo || '')?.toString().toLowerCase()

  // Intentar localizar fields en varias formas posibles
  const firstDoc: AzureDocument | undefined = Array.isArray(ar.documents)
    ? ar.documents[0]
    : (ar.documents as unknown as AzureDocument | undefined)
  let fields = firstDoc?.fields as Record<string, AzureField> | undefined
  if (!fields && (ar as unknown as { fields?: Record<string, AzureField> }).fields) {
    fields = (ar as unknown as { fields?: Record<string, AzureField> }).fields
  }
  console.log('[ANALYZE_MAPPER] Resolved params:', {
    resolvedCaso,
    resolvedTipo,
    resolvedModel,
    hasDocuments: Array.isArray(ar.documents) ? ar.documents.length : Boolean(ar.documents),
    hasFields: Boolean(fields),
    fieldKeys: fields ? Object.keys(fields) : undefined,
  })
  if (!fields) return {}

  // Caso: Factura de suministros - Agua
  if (
    (resolvedCaso === 'factura_suministros' || !resolvedCaso) &&
    (resolvedTipo === 'agua' || resolvedModel === 'agua')
  ) {
    console.log('[ANALYZE_MAPPER] Applying mapping: factura_suministros -> agua')
    return mapFacturaSuministrosAguaFromFields(fields)
  }

  // Caso: Factura de suministros - Electricidad
  if (
    (resolvedCaso === 'factura_suministros' || !resolvedCaso) &&
    (resolvedTipo === 'electricidad' || resolvedModel === 'electricidad')
  ) {
    console.log('[ANALYZE_MAPPER] Applying mapping: factura_suministros -> electricidad')
    return mapFacturaSuministrosElectricidadFromFields(fields)
  }

  // Caso: Factura de suministros - Gas
  if (
    (resolvedCaso === 'factura_suministros' || !resolvedCaso) &&
    (resolvedTipo === 'gas' || resolvedModel === 'gas')
  ) {
    console.log('[ANALYZE_MAPPER] Applying mapping: factura_suministros -> gas')
    return mapFacturaSuministrosGasFromFields(fields)
  }

  // Si no hay mapeo definido, devolver objeto vacío (ningún cambio adicional)
  console.log('[ANALYZE_MAPPER] No mapping applied for given parameters')
  return {}
}
