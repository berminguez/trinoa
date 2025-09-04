import { getPayload } from 'payload'
import config from '@payload-config'
import { getCurrentUser } from '@/actions/auth/getUser'
import type { Resource, Project } from '@/payload-types'
import { parseAndFormatDate } from '../../utils/dateParser'

export interface AnalyticsFilters {
  dateFrom?: string
  dateTo?: string
  invoiceDateFrom?: string
  invoiceDateTo?: string
  tipo?: string
  caso?: string
  clientId?: string
  projectId?: string
  provider?: string
  page?: number
  limit?: number
}

export interface AnalyticsResult {
  totalsByTipo: Record<string, number>
  totalsByCaso: Record<string, number>
  totalsByUnit: Record<string, number>
  documents: Array<
    Pick<Resource, 'id' | 'title' | 'createdAt'> & {
      tipo?: string | null
      caso?: string | null
      unit?: string | null
      value?: number | null
      projectId?: string | null
      providerName?: string | null
      invoiceDate?: string | null
      confidence?: Resource['confidence']
      documentoErroneo?: boolean | null
    }
  >
  allDocumentIds: string[] // IDs de todos los documentos filtrados (sin paginar)
  projects: Array<{ id: string; title: string }>
  tipoOptions: string[]
  casoOptions: string[]
  providerOptions: string[]
  totalDocs: number
  totalPages: number
  page: number
}

function extractUnitAndValue(res: any): { unit: string | null; value: number | null } {
  // Intentar extraer unidad/valor según el caso
  const data = res || {}
  const caso: string | undefined = data.caso
  if (caso === 'factura_suministros') {
    const unit = data?.factura_suministros?.unidad_medida || data?.unidad_medida || null
    const value =
      typeof data?.factura_suministros?.volumen_consumido === 'number'
        ? data.factura_suministros.volumen_consumido
        : null
    return { unit, value }
  }
  if (caso === 'desplazamientos') {
    const unit = data?.desplazamientos?.unidad_medida || data?.unidad_medida || null
    const value =
      typeof data?.desplazamientos?.cantidad_consumida === 'number'
        ? data.desplazamientos.cantidad_consumida
        : null
    return { unit, value }
  }
  if (caso === 'viajes_tipo_1' || caso === 'viajes_tipo_2') {
    const unit = 'km'
    const value = typeof data?.[caso]?.distancia === 'number' ? data[caso].distancia : null
    return { unit, value }
  }
  if (caso === 'residuos') {
    const unit = data?.residuos?.unidad_medida || data?.residuos?.unidad || null
    const value =
      typeof data?.residuos?.cantidad_residuo === 'number' ? data.residuos.cantidad_residuo : null
    return { unit, value }
  }
  // Fallback: intentar leer analyzeResult (si existiese una normalización futura)
  return { unit: null, value: null }
}

function extractProviderName(res: any): string | null {
  const fields = (res?.analyzeResult as any)?.fields
  const vendor = fields?.VendorName?.valueString || fields?.VendorName?.content
  if (typeof vendor === 'string' && vendor.trim()) return vendor.trim()
  const legacy = res?.factura_suministros?.proveedor_servicio
  if (typeof legacy === 'string' && legacy.trim()) return legacy.trim()
  return null
}

function normalizeDateToISO(input: string | undefined | null): string | null {
  if (!input || typeof input !== 'string') return null
  const s = input.trim()
  // yyyy-mm-dd or yyyy-mm-ddTHH:MM:SSZ
  const iso = s.match(/^\d{4}-\d{2}-\d{2}/) ? s.substring(0, 10) : null
  if (iso) return iso
  // dd/mm/yyyy or dd-mm-yyyy -> yyyy-mm-dd
  const m = s.match(/^(\d{2})[\/\-.](\d{2})[\/\-.](\d{4})$/)
  if (m) {
    const [, dd, mm, yyyy] = m
    return `${yyyy}-${mm}-${dd}`
  }
  // dd/mm/yy or dd-mm-yy -> 20yy-mm-dd (asunción siglo 2000)
  const m2 = s.match(/^(\d{2})[\/\-.](\d{2})[\/\-.](\d{2})$/)
  if (m2) {
    const [, dd, mm, yy] = m2
    const yyyy = `20${yy}`
    return `${yyyy}-${mm}-${dd}`
  }
  return null
}

function extractInvoiceDate(res: any): string | null {
  const fields = (res?.analyzeResult as any)?.fields

  // Función auxiliar para extraer valores de campos
  const getFieldValue = (field: any): string | null => {
    if (!field) return null
    return field?.valueDate || field?.content || field?.valueString || null
  }

  // Lista de campos a verificar en orden de prioridad
  const fieldPriority = [
    // 1) Fecha de factura directa
    () => getFieldValue(fields?.InvoiceDate || fields?.invoiceDate),

    // 2) Fecha de inicio de servicio
    () =>
      getFieldValue(
        fields?.ServiceStartDate ||
          fields?.serviceStartDate ||
          fields?.StartDate ||
          fields?.startDate,
      ),

    // 3) Campos en español
    () => getFieldValue(fields?.FechaInicio || fields?.fechaInicio),

    // 4) Legacy: periodo de consumo
    () => res?.factura_suministros?.periodo_consumo?.fecha_inicio,

    // 5) Como último recurso, fecha fin
    () =>
      res?.factura_suministros?.periodo_consumo?.fecha_fin ||
      getFieldValue(fields?.FechaFin || fields?.fechaFin),
  ]

  // Intentar extraer fecha usando la nueva utilidad inteligente
  for (const getFieldFn of fieldPriority) {
    const value = getFieldFn()
    if (value) {
      const formattedDate = parseAndFormatDate(String(value))
      if (formattedDate) return formattedDate
    }
  }

  return null
}

export async function getAnalytics(filters: AnalyticsFilters = {}): Promise<AnalyticsResult> {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('Unauthorized')
  }
  const payload = await getPayload({ config })

  // Obtener proyectos del usuario
  const createdById = user.role === 'admin' && filters.clientId ? filters.clientId : user.id

  const projectsRes = await payload.find({
    collection: 'projects' as any,
    where: { createdBy: { equals: createdById } },
    limit: 1000,
    depth: 0,
  })
  const projectIds = projectsRes.docs.map((p: any) => p.id)
  const projects = (projectsRes.docs as any[]).map((p) => ({
    id: String(p.id),
    title: String(p.title),
  }))

  // Base para opciones y documentos (sin tipo/caso para opciones)
  const whereBase: any = {
    project: { in: projectIds },
  }
  if (filters.projectId) whereBase.project = { equals: filters.projectId }
  if (filters.dateFrom || filters.dateTo) {
    whereBase.createdAt = {}
    if (filters.dateFrom) whereBase.createdAt.greater_than_equal = filters.dateFrom
    if (filters.dateTo) whereBase.createdAt.less_than_equal = filters.dateTo
  }

  // Consulta para opciones (sin tipo/caso)
  const optionsRes = await payload.find({
    collection: 'resources' as any,
    where: whereBase,
    limit: 1000,
    depth: 0,
    sort: '-createdAt',
  })

  // Construir filtro de documentos (con tipo/caso)
  const whereDocs: any = { ...whereBase }
  if (filters.tipo) whereDocs.tipo = { equals: filters.tipo }
  if (filters.caso) whereDocs.caso = { equals: filters.caso }

  const resourcesRes = await payload.find({
    collection: 'resources' as any,
    where: whereDocs,
    limit: 1000,
    depth: 0,
    sort: '-createdAt',
  })

  const totalsByTipo: Record<string, number> = {}
  const totalsByCaso: Record<string, number> = {}
  const totalsByUnit: Record<string, number> = {}
  const documents: AnalyticsResult['documents'] = []
  const tipoSet = new Set<string>()
  const casoSet = new Set<string>()
  const providerSet = new Set<string>()

  // Opciones desde optionsRes (no afectan filtros cruzados)
  for (const r of optionsRes.docs as any[]) {
    const t = (r as any).tipo
    const c = (r as any).caso
    if (typeof t === 'string' && t) tipoSet.add(t)
    if (typeof c === 'string' && c) casoSet.add(c)
    const pn = extractProviderName(r)
    if (typeof pn === 'string' && pn.trim()) providerSet.add(pn.trim())
  }

  for (const r of resourcesRes.docs as any[]) {
    const tipo = (r as any).tipo || null
    const caso = (r as any).caso || null
    const providerName = extractProviderName(r)
    if (filters.provider && (!providerName || providerName !== filters.provider)) {
      continue
    }
    if (tipo) totalsByTipo[tipo] = (totalsByTipo[tipo] || 0) + 1
    if (caso) totalsByCaso[caso] = (totalsByCaso[caso] || 0) + 1

    const { unit, value } = extractUnitAndValue(r)
    if (unit && typeof value === 'number') {
      totalsByUnit[unit] = (totalsByUnit[unit] || 0) + value
    }

    documents.push({
      id: r.id,
      title: r.title,
      createdAt: r.createdAt,
      tipo,
      caso,
      unit: unit || null,
      value: typeof value === 'number' ? value : null,
      projectId: typeof r.project === 'string' ? r.project : r.project?.id || null,
      providerName: providerName || null,
      invoiceDate: extractInvoiceDate(r),
      confidence: (r as any).confidence,
      documentoErroneo: (r as any).documentoErroneo,
    })
  }

  // Filtrar por fecha de factura en memoria
  let filteredDocuments = documents
  if (filters.invoiceDateFrom || filters.invoiceDateTo) {
    filteredDocuments = documents.filter((doc) => {
      if (!doc.invoiceDate) return false

      // Convertir dd/mm/yyyy a Date
      const dateParts = doc.invoiceDate.split('/')
      if (dateParts.length !== 3) return false

      const invoiceDate = new Date(
        parseInt(dateParts[2]),
        parseInt(dateParts[1]) - 1,
        parseInt(dateParts[0]),
      )
      if (isNaN(invoiceDate.getTime())) return false

      if (filters.invoiceDateFrom) {
        const fromDate = new Date(filters.invoiceDateFrom)
        if (invoiceDate < fromDate) return false
      }

      if (filters.invoiceDateTo) {
        const toDate = new Date(filters.invoiceDateTo)
        if (invoiceDate > toDate) return false
      }

      return true
    })
  }

  // Paginación en memoria de documents
  const page = Math.max(1, Number(filters.page) || 1)
  const limit = Math.min(100, Math.max(5, Number(filters.limit) || 10))
  const totalDocs = filteredDocuments.length
  const totalPages = Math.max(1, Math.ceil(totalDocs / limit))
  const start = (page - 1) * limit
  const paginated = filteredDocuments.slice(start, start + limit)

  return {
    totalsByTipo,
    totalsByCaso,
    totalsByUnit,
    documents: paginated,
    allDocumentIds: filteredDocuments.map((d) => d.id), // Todos los IDs filtrados para exportación
    projects,
    tipoOptions: Array.from(tipoSet),
    casoOptions: Array.from(casoSet),
    providerOptions: Array.from(providerSet),
    totalDocs,
    totalPages,
    page,
  }
}
