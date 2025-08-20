import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/actions/auth/getUser'
import { getPayload } from 'payload'
import config from '@payload-config'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const from = url.searchParams.get('from') || undefined
  const to = url.searchParams.get('to') || undefined
  const tipo = url.searchParams.get('tipo') || undefined
  const caso = url.searchParams.get('caso') || undefined
  const clientId = url.searchParams.get('clientId') || undefined
  const projectId = url.searchParams.get('projectId') || undefined
  const provider = url.searchParams.get('provider') || undefined
  const format = (url.searchParams.get('format') || 'csv').toLowerCase()

  // Buscar recursos directamente para exportar TODOS los campos
  const payload = await getPayload({ config })
  // Obtener proyectos del usuario o del cliente seleccionado (si admin)
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
    depth: 0,
    sort: '-createdAt',
  })

  let docs = resourcesRes.docs as any[]
  // Filtrar por proveedor si aplica (en memoria usando analyzeResult.fields.VendorName o legacy)
  if (provider) {
    docs = docs.filter((d) => {
      const fields = (d as any)?.analyzeResult?.fields
      const vendor = fields?.VendorName?.valueString || fields?.VendorName?.content
      const legacy = d?.factura_suministros?.proveedor_servicio
      const name = (vendor || legacy || '').toString().trim()
      return name && name === provider
    })
  }

  // Campos fijos + campos dinámicos desde analyzeResult.fields
  const fixedHeaders = ['Título', 'Cliente', 'Proyecto', 'Tipo', 'Caso', 'Confianza', 'Fecha']
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

  const getFieldValue = (field: any): string => {
    if (!field || typeof field !== 'object') return ''
    if (typeof field.valueString === 'string' && field.valueString.trim().length > 0)
      return field.valueString
    if (typeof field.content === 'string' && field.content.trim().length > 0) return field.content
    if (typeof field.value === 'string' || typeof field.value === 'number')
      return String(field.value)
    return ''
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
          d.title || '',
          d.nombre_cliente || '',
          projectIdToTitle.get(typeof d.project === 'object' ? d.project?.id : String(d.project)) ||
            '',
          d.tipo || '',
          d.caso || '',
          d.confidence || '',
          formatDate(d.createdAt),
        ]
        const fields = (d as any)?.analyzeResult?.fields || {}
        const values = dynamicFieldKeys.map((k) => getFieldValue(fields?.[k]))
        aoa.push([...base, ...values])
      }
      const ws = XLSX.utils.aoa_to_sheet(aoa)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Analytics')
      const buf: Buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
      return new NextResponse(buf, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename="analytics.xlsx"',
        },
      })
    } catch (e) {
      // Si no está instalada la dependencia, continúar con XLS
    }
  }
  if (format === 'xls' || format === 'excel') {
    // HTML table compatible con Excel (.xls). UTF-8
    const thead = `<tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr>`
    const tbody = docs
      .map((d) => {
        const base = [
          d.title || '',
          d.nombre_cliente || '',
          projectIdToTitle.get(typeof d.project === 'object' ? d.project?.id : String(d.project)) ||
            '',
          d.tipo || '',
          d.caso || '',
          d.confidence || '',
          formatDate(d.createdAt),
        ]
        const fields = (d as any)?.analyzeResult?.fields || {}
        const values = dynamicFieldKeys.map((k) => {
          const v = fields?.[k]
          const s = getFieldValue(v)
          return s
        })
        const row = [...base, ...values]
        return `<tr>${row
          .map((cell) =>
            String(cell ?? '')
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;'),
          )
          .map((s) => `<td>${s}</td>`)
          .join('')}</tr>`
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
      d.title || '',
      d.nombre_cliente || '',
      projectIdToTitle.get(typeof d.project === 'object' ? d.project?.id : String(d.project)) || '',
      d.tipo || '',
      d.caso || '',
      d.confidence || '',
      formatDate(d.createdAt),
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
