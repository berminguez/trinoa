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

// Valores esperados para electricidad (según ejemplo facilitado)
interface ElectricidadFieldsShape {
  VendorName?: AzureField
  VendorTaxId?: AzureField
  CustomerName?: AzureField
  CustomerAddressRecipient?: AzureField
  InvoiceId?: AzureField
  InvoiceDate?: AzureField
  ServiceStartDate?: AzureField
  ServiceEndDate?: AzureField
  InvoiceTotal?: AzureField
  CUPS?: AzureField
  UnidadMedida?: AzureField
  EnergiaP1?: AzureField
  EnergiaP2?: AzureField
  EnergiaP3?: AzureField
  EnergiaP4?: AzureField
  EnergiaP5?: AzureField
  EnergiaP6?: AzureField
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

/**
 * Mapea los campos de Azure (electricidad) a la estructura del grupo `factura_suministros` en Resource.
 */
export function mapFacturaSuministrosElectricidadFromFields(
  fields: Record<string, AzureField>,
): Partial<Resource> {
  const f = fields as ElectricidadFieldsShape

  const proveedorServicio = getString(f.VendorName)
  const cliente = getString(f.CustomerName)
  const codigoSuministro = getString(f.CUPS)
  const fechaInicio = getDateISO(f.ServiceStartDate)
  const fechaFin = getDateISO(f.ServiceEndDate)
  const codigoFactura = getString(f.InvoiceId)
  const unidad = getString(f.UnidadMedida)

  // Sumar energías por periodo si están disponibles (kWh)
  const energiaValores: Array<number | undefined> = [
    getNumberFromString(f.EnergiaP1),
    getNumberFromString(f.EnergiaP2),
    getNumberFromString(f.EnergiaP3),
    getNumberFromString(f.EnergiaP4),
    getNumberFromString(f.EnergiaP5),
    getNumberFromString(f.EnergiaP6),
  ]
  const energiaFiltrada = energiaValores.filter(
    (v): v is number => typeof v === 'number' && Number.isFinite(v),
  )
  const volumenTotal =
    energiaFiltrada.length > 0 ? energiaFiltrada.reduce((acc, n) => acc + n, 0) : undefined

  const updates: Partial<Resource> = {}

  if (cliente) updates.nombre_cliente = cliente

  updates.caso = 'factura_suministros'
  updates.tipo = 'electricidad'

  updates.factura_suministros = {
    ...(codigoSuministro ? { codigo_suministro: codigoSuministro } : {}),
    periodo_consumo: {
      ...(fechaInicio ? { fecha_inicio: fechaInicio } : {}),
      ...(fechaFin ? { fecha_fin: fechaFin } : {}),
    },
    ...(typeof volumenTotal === 'number' ? { volumen_consumido: volumenTotal } : {}),
    ...(unidad ? { unidad_medida: unidad as any } : {}),
    ...(proveedorServicio ? { proveedor_servicio: proveedorServicio } : {}),
    ...(codigoFactura ? { codigo_factura: codigoFactura } : {}),
  } as any

  return updates
}
