import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/actions/auth/getUser'
import { getPayload } from 'payload'
import config from '@payload-config'
import { parseAndFormatDate } from '@/utils/dateParser'
import { getSafeMediaUrl } from '@/lib/utils/fileUtils'

// GET para compatibilidad legacy (enlaces antiguos)
export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  return handleLegacyExport(req, user)
}

// POST para exportación optimizada (método principal)
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const documentIdsJson = formData.get('documentIds') as string
  const format = ((formData.get('format') as string) || 'csv').toLowerCase()

  // Parse JSON array of document IDs
  try {
    if (documentIdsJson) {
      const idsArray = JSON.parse(documentIdsJson)
      if (Array.isArray(idsArray) && idsArray.length > 0) {
        return handleOptimizedExport(idsArray, format, user)
      }
    }
  } catch (_e) {
    return NextResponse.json({ error: 'Invalid document IDs format' }, { status: 400 })
  }

  return NextResponse.json({ error: 'No document IDs provided' }, { status: 400 })
}

// ✅ MODO OPTIMIZADO: Usar solo IDs específicos
async function handleOptimizedExport(documentIds: string[], format: string, _user: any) {
  const payload = await getPayload({ config })

  // Obtener solo documentos específicos con relación a media
  const resourcesRes = await payload.find({
    collection: 'resources' as any,
    where: { id: { in: documentIds } },
    limit: 1000,
    depth: 1, // Incluir relación con media
    sort: '-createdAt',
  })

  const docs = resourcesRes.docs as any[]

  // Obtener títulos de proyectos solo para estos documentos
  const projectIds = [
    ...new Set(
      docs
        .map((d: any) => (typeof d.project === 'object' ? d.project?.id : String(d.project)))
        .filter(Boolean),
    ),
  ]
  const projectIdToTitle = new Map<string, string>()

  if (projectIds.length > 0) {
    const projects = await payload.find({
      collection: 'projects' as any,
      where: { id: { in: projectIds } },
      limit: 1000,
      depth: 0,
    })
    projects.docs.forEach((p: any) => {
      projectIdToTitle.set(String(p.id), p.title || '')
    })
  }

  return generateExport(docs, projectIdToTitle, format)
}

// ⚠️ MODO LEGACY: Lógica original completa para GET
async function handleLegacyExport(req: NextRequest, user: any) {
  const url = new URL(req.url)
  const from = url.searchParams.get('from') || undefined
  const to = url.searchParams.get('to') || undefined
  const invoiceFrom = url.searchParams.get('invoiceFrom') || undefined
  const invoiceTo = url.searchParams.get('invoiceTo') || undefined
  const tipo = url.searchParams.get('tipo') || undefined
  const caso = url.searchParams.get('caso') || undefined
  const clientId = url.searchParams.get('clientId') || undefined
  const projectId = url.searchParams.get('projectId') || undefined
  const provider = url.searchParams.get('provider') || undefined
  const format = (url.searchParams.get('format') || 'csv').toLowerCase()

  const payload = await getPayload({ config })

  const createdById = user.role === 'admin' && clientId ? clientId : user.id
  const projects = await payload.find({
    collection: 'projects' as any,
    where: { createdBy: { equals: createdById } },
    limit: 1000,
    depth: 0,
  })
  const projectIds = projects.docs.map((p: any) => p.id)
  const projectIdToTitle = new Map<string, string>(
    projects.docs.map((p: any) => [String(p.id), p.title || '']),
  )

  const where: any = { project: { in: projectIds } }
  if (projectId) where.project = { equals: projectId }
  if (tipo) where.tipo = { equals: tipo }
  if (caso) where.caso = { equals: caso }
  if (from || to) {
    where.createdAt = {}
    if (from) where.createdAt.greater_than_equal = from
    if (to) where.createdAt.less_than_equal = to
  }

  const resourcesRes = await payload.find({
    collection: 'resources' as any,
    where,
    limit: 1000,
    depth: 1, // Incluir relación con media
    sort: '-createdAt',
  })

  let docs = resourcesRes.docs as any[]

  // Filtrar por proveedor si aplica
  if (provider) {
    docs = docs.filter((d) => {
      const fields = (d as any)?.analyzeResult?.fields
      const vendor = fields?.VendorName?.valueString || fields?.VendorName?.content
      const legacy = d?.factura_suministros?.proveedor_servicio
      const name = (vendor || legacy || '').toString().trim()
      return name && name === provider
    })
  }

  // Filtrar por fecha de factura si aplica
  if (invoiceFrom || invoiceTo) {
    docs = docs.filter((d) => {
      const invoiceDateStr = extractInvoiceDate(d)
      if (!invoiceDateStr) return false

      const dateParts = invoiceDateStr.split('/')
      if (dateParts.length !== 3) return false

      const invoiceDate = new Date(
        parseInt(dateParts[2]),
        parseInt(dateParts[1]) - 1,
        parseInt(dateParts[0]),
      )
      if (isNaN(invoiceDate.getTime())) return false

      if (invoiceFrom) {
        const fromDate = new Date(invoiceFrom)
        if (invoiceDate < fromDate) return false
      }

      if (invoiceTo) {
        const toDate = new Date(invoiceTo)
        if (invoiceDate > toDate) return false
      }

      return true
    })
  }

  return generateExport(docs, projectIdToTitle, format)
}

// 📊 FUNCIÓN ÚNICA DE EXPORTACIÓN
async function generateExport(docs: any[], projectIdToTitle: Map<string, string>, format: string) {
  const payload = await getPayload({ config })

  // Función para generar URL del documento
  const generateDocumentUrl = async (resource: any): Promise<string> => {
    if (!resource?.file) return ''

    try {
      // Si el file es un objeto (depth=1), usar directamente
      const media = typeof resource.file === 'object' ? resource.file : null
      if (!media) return ''

      // Generar URL segura usando el helper de fileUtils
      const documentUrl = await getSafeMediaUrl(media)
      if (!documentUrl) return ''

      // Si la URL es relativa, convertirla a absoluta
      if (documentUrl.startsWith('/')) {
        const baseUrl =
          process.env.PAYLOAD_PUBLIC_SERVER_URL ||
          process.env.NEXT_PUBLIC_SERVER_URL ||
          'https://trinoa.com'
        return `${baseUrl}${documentUrl}`
      }

      return documentUrl
    } catch (error) {
      console.warn('Error generating document URL:', error)
      return ''
    }
  }

  // Campos fijos + campos dinámicos desde analyzeResult.fields
  const fixedHeaders = [
    'ID',
    'Código',
    'Título',
    'Enlace al Documento',
    'Cliente',
    'Proyecto',
    'Tipo',
    'Caso',
    'Confianza',
    'Fecha Subida',
    'Fecha Factura',
    'Documento Erróneo',
  ]
  const fieldSet = new Set<string>()

  for (const d of docs) {
    const fields = (d as any)?.analyzeResult?.fields
    if (fields && typeof fields === 'object') {
      for (const k of Object.keys(fields)) fieldSet.add(k)
    }
  }

  // Cargar traducciones para renombrar columnas dinámicas
  let translations: Record<string, string> = {}
  try {
    const tr = await payload.find({
      collection: 'field-translations' as any,
      limit: 1000,
      depth: 0,
    } as any)
    const arr = Array.isArray((tr as any)?.docs) ? (tr as any).docs : []
    translations = arr.reduce((acc: Record<string, string>, t: any) => {
      if (t?.key) acc[String(t.key)] = String(t.label || t.key)
      return acc
    }, {})
  } catch {}

  const dynamicFieldKeys = Array.from(fieldSet)
  const dynamicFieldHeaders = dynamicFieldKeys.map((k) => translations[k] || k)
  const headers = [...fixedHeaders, ...dynamicFieldHeaders]

  // Pre-generar URLs de documentos para todos los recursos
  const documentUrls = new Map<string, string>()
  for (const doc of docs) {
    const url = await generateDocumentUrl(doc)
    documentUrls.set(doc.id, url)
  }

  // Función auxiliar para detectar si un valor parece una fecha
  const looksLikeDate = (value: string): boolean => {
    if (!value || typeof value !== 'string') return false
    const datePatterns = [
      /^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4}$/,
      /^\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}$/,
      /^\d{1,2}\s+(?:de\s+)?\w+\s+(?:de\s+)?\d{4}$/i,
      /^\d{1,2}\.\s*\w+\s+\d{4}$/i,
      /^\d{1,2}\s+\w+\s+\d{4}$/i,
      /^Fecha:\d{1,2}\.\d{1,2}\.\d{4}$/,
    ]
    return datePatterns.some((pattern) => pattern.test(value.trim()))
  }

  const getFieldValue = (field: any): string => {
    if (!field || typeof field !== 'object') return ''

    let value = ''
    if (typeof field.valueString === 'string' && field.valueString.trim().length > 0) {
      value = field.valueString
    } else if (typeof field.content === 'string' && field.content.trim().length > 0) {
      value = field.content
    } else if (typeof field.value === 'string' || typeof field.value === 'number') {
      value = String(field.value)
    } else {
      return ''
    }

    // Si el valor parece una fecha, intentar formatearlo
    if (looksLikeDate(value)) {
      const formattedDate = parseAndFormatDate(value)
      if (formattedDate) return formattedDate
    }

    return value
  }

  const formatDate = (val: any): string => {
    if (!val) return ''
    const d = new Date(val)
    if (isNaN(d.getTime())) return ''
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const yyyy = d.getFullYear()
    return `${dd}/${mm}/${yyyy}`
  }

  // Generar salida según formato
  if (format === 'xlsx') {
    try {
      const XLSX: any = await import('xlsx')
      const aoa: (string | number)[][] = []
      aoa.push(headers)
      for (const d of docs) {
        const base = [
          String(d.id || ''),
          String(d.codigo || ''),
          d.title || '',
          documentUrls.get(d.id) || '',
          d.nombre_cliente || '',
          projectIdToTitle.get(typeof d.project === 'object' ? d.project?.id : String(d.project)) ||
            '',
          d.tipo || '',
          d.caso || '',
          (d as any).documentoErroneo ? 'Documento erróneo' : d.confidence || '',
          formatDate(d.createdAt),
          extractInvoiceDate(d),
          (d as any).documentoErroneo ? 'Sí' : 'No',
        ]
        const fields = (d as any)?.analyzeResult?.fields || {}
        const values = dynamicFieldKeys.map((k) => getFieldValue(fields?.[k]))
        aoa.push([...base, ...values])
      }
      const ws = XLSX.utils.aoa_to_sheet(aoa)

      // Agregar hipervínculos para la columna de documentos
      const documentColumnIndex = fixedHeaders.indexOf('Enlace al Documento')
      for (let rowIndex = 1; rowIndex < aoa.length; rowIndex++) {
        // Empezar desde 1 para omitir headers
        const docUrl = aoa[rowIndex][documentColumnIndex]
        if (docUrl && typeof docUrl === 'string' && docUrl.trim()) {
          const cellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: documentColumnIndex })
          if (!ws[cellAddress]) ws[cellAddress] = {}
          ws[cellAddress].l = { Target: docUrl, Tooltip: 'Abrir documento' }
          ws[cellAddress].v = 'Ver documento'
        }
      }

      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Analytics')
      const ab: ArrayBuffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
      const u8 = new Uint8Array(ab)
      return new NextResponse(u8, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename="analytics.xlsx"',
        },
      })
    } catch (_e) {
      // Si no está instalada la dependencia, continúar con XLS
    }
  }

  if (format === 'xls' || format === 'excel') {
    // HTML table compatible con Excel (.xls). UTF-8
    const thead = `<tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr>`
    const tbody = docs
      .map((d) => {
        const base = [
          String(d.id || ''),
          String(d.codigo || ''),
          d.title || '',
          documentUrls.get(d.id) || '',
          d.nombre_cliente || '',
          projectIdToTitle.get(typeof d.project === 'object' ? d.project?.id : String(d.project)) ||
            '',
          d.tipo || '',
          d.caso || '',
          (d as any).documentoErroneo ? 'Documento erróneo' : d.confidence || '',
          formatDate(d.createdAt),
          extractInvoiceDate(d),
          (d as any).documentoErroneo ? 'Sí' : 'No',
        ]
        const fields = (d as any)?.analyzeResult?.fields || {}
        const values = dynamicFieldKeys.map((k) => {
          const v = fields?.[k]
          const s = getFieldValue(v)
          return s
        })
        const row = [...base, ...values]

        // Procesar cada celda, convirtiendo URLs en enlaces clickables
        const processedCells = row.map((cell, index) => {
          const cellStr = String(cell ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')

          // Si es la columna de documento y hay URL, crear enlace
          const documentColumnIndex = fixedHeaders.indexOf('Enlace al Documento')
          if (index === documentColumnIndex && cellStr.trim()) {
            return `<a href="${cellStr}" target="_blank" rel="noopener noreferrer">Ver documento</a>`
          }

          return cellStr
        })

        return `<tr>${processedCells.map((s) => `<td>${s}</td>`).join('')}</tr>`
      })
      .join('')
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8" /></head><body><table>${thead}${tbody}</table></body></html>`

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'application/vnd.ms-excel; charset=utf-8',
        'Content-Disposition': 'attachment; filename="analytics.xls"',
      },
    })
  }

  // CSV por defecto (UTF-8 con BOM)
  const rows = docs.map((d) => {
    const base = [
      String(d.id || ''),
      String(d.codigo || ''),
      d.title || '',
      documentUrls.get(d.id) || '',
      d.nombre_cliente || '',
      projectIdToTitle.get(typeof d.project === 'object' ? d.project?.id : String(d.project)) || '',
      d.tipo || '',
      d.caso || '',
      (d as any).documentoErroneo ? 'Documento erróneo' : d.confidence || '',
      formatDate(d.createdAt),
      extractInvoiceDate(d),
      (d as any).documentoErroneo ? 'Sí' : 'No',
    ]
    const fields = (d as any)?.analyzeResult?.fields || {}
    const values = dynamicFieldKeys.map((k) => getFieldValue(fields?.[k]))
    return [...base, ...values]
  })
  const csvBody = [headers, ...rows]
    .map((r) =>
      r
        .map((c) => (typeof c === 'string' ? `"${c.replace(/"/g, '""')}"` : String(c ?? '')))
        .join(','),
    )
    .join('\n')
  const BOM = '\ufeff' // BOM para UTF-8 (Excel)
  return new NextResponse(BOM + csvBody, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="analytics.csv"',
    },
  })
}

// 📅 FUNCIÓN DE EXTRACCIÓN DE FECHA DE FACTURA
function extractInvoiceDate(res: any): string {
  const fields = res?.analyzeResult?.fields

  // Función auxiliar para extraer valores de campos
  const getFieldValue = (field: any): string | null => {
    if (!field) return null
    return field?.valueDate || field?.content || field?.valueString || null
  }

  // Lista de campos a verificar en orden de prioridad (IGUAL QUE ANALYTICS)
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

    // 3) Campos en español - ¡ESTE ERA EL QUE FALTABA!
    () => getFieldValue(fields?.FechaInicio || fields?.fechaInicio),

    // 4) Legacy: periodo de consumo
    () => res?.factura_suministros?.periodo_consumo?.fecha_inicio,

    // 5) Como último recurso, fecha fin
    () =>
      res?.factura_suministros?.periodo_consumo?.fecha_fin ||
      getFieldValue(fields?.FechaFin || fields?.fechaFin),
  ]

  // Intentar extraer fecha usando la misma lógica que analytics
  for (const getFieldFn of fieldPriority) {
    const value = getFieldFn()
    if (value) {
      const formattedDate = parseAndFormatDate(String(value))
      if (formattedDate) return formattedDate
    }
  }

  return ''
}
