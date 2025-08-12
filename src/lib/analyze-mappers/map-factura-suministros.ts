import type { Resource } from '@/payload-types'

type AzureField = {
  type?: string
  valueString?: string
  valueDate?: string
  content?: string
  [key: string]: unknown
}

// Valores que esperamos del ejemplo de agua (campos en analyzeResult.documents[0].fields)
interface AguaFieldsShape {
  VendorName?: AzureField
  CustomerName?: AzureField
  CustomerAddressRecipient?: AzureField
  ServiceStartDate?: AzureField
  ServiceEndDate?: AzureField
  invoiceDate?: AzureField
  unidadMedida?: AzureField
  ConsumoTotal?: AzureField
  importeFactura?: AzureField
  CUPS?: AzureField
  invoiceId?: AzureField
  [key: string]: AzureField | undefined
}

function getString(f?: AzureField): string | undefined {
  if (!f) return undefined
  if (typeof f.valueString === 'string' && f.valueString.trim()) return f.valueString.trim()
  if (typeof f.content === 'string' && f.content.trim()) return f.content.trim()
  return undefined
}

function getDateISO(f?: AzureField): string | undefined {
  if (!f) return undefined
  if (typeof f.valueDate === 'string' && f.valueDate) {
    // valueDate viene en formato YYYY-MM-DD según el ejemplo
    // Validar formato simple
    return /^\d{4}-\d{2}-\d{2}$/.test(f.valueDate) ? f.valueDate : undefined
  }
  // Si solo viene content tipo DD-MM-YYYY o DD-MM-YY, no forzamos parseo agresivo por ahora
  return undefined
}

function getNumberFromString(f?: AzureField): number | undefined {
  const s = getString(f)
  if (!s) return undefined
  // Normalizar coma decimal europea
  const normalized = s.replace(/\./g, '').replace(/,/g, '.')
  const n = Number(normalized)
  return Number.isFinite(n) ? n : undefined
}

/**
 * Mapea los campos de Azure (agua) a la estructura del grupo `factura_suministros` en Resource.
 */
export function mapFacturaSuministrosAguaFromFields(
  fields: Record<string, AzureField>,
): Partial<Resource> {
  const f = fields as AguaFieldsShape

  const proveedor = getString(f.VendorName)
  const cliente = getString(f.CustomerName)
  const codigoSuministro = getString(f.CUPS)
  const fechaInicio = getDateISO(f.ServiceStartDate)
  const fechaFin = getDateISO(f.ServiceEndDate)
  const fechaFactura = getString(f.invoiceDate)
  const unidad = getString(f.unidadMedida)
  const consumo = getNumberFromString(f.ConsumoTotal)
  const importe = getNumberFromString(f.importeFactura)
  const codigoFactura = getString(f.invoiceId)

  const updates: Partial<Resource> = {}

  // Campos globales opcionales
  if (cliente) updates.nombre_cliente = cliente

  // Caso/Tipo específicos y grupo `factura_suministros`
  updates.caso = 'factura_suministros'
  updates.tipo = 'agua'

  updates.factura_suministros = {
    ...(codigoSuministro ? { codigo_suministro: codigoSuministro } : {}),
    periodo_consumo: {
      ...(fechaInicio ? { fecha_inicio: fechaInicio } : {}),
      ...(fechaFin ? { fecha_fin: fechaFin } : {}),
    },
    // fecha_compra: no aplica para agua (solo combustibles)
    ...(typeof consumo === 'number' ? { volumen_consumido: consumo } : {}),
    ...(unidad ? { unidad_medida: unidad as any } : {}),
    ...(proveedor ? { proveedor_servicio: proveedor } : {}),
    ...(codigoFactura ? { codigo_factura: codigoFactura } : {}),
  } as any

  return updates
}
