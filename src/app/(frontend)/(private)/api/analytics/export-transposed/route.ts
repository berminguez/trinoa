import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getCurrentUser } from '@/actions/auth/getUser'
import { getSafeMediaUrl } from '@/lib/utils/fileUtils'
import { parseAndFormatDate } from '@/utils/dateParser'

function formatDateFlexible(input: any): string {
  if (!input) return ''
  const raw = String(input).trim()
  const formatted = parseAndFormatDate(raw)
  return formatted || raw
}

function formatMax2Decimals(input: string): string {
  if (input == null) return ''
  const s = String(input).replace(/,/g, '.')
  const n = Number(s)
  if (isNaN(n)) return String(input)
  const fixed = n.toFixed(2)
  return fixed.replace(/\.00$/, '').replace(/\.(\d)0$/, '.$1')
}

function extractProviderName(res: any): string {
  const fields = (res?.analyzeResult as any)?.fields
  const vendor = fields?.VendorName?.valueString || fields?.VendorName?.content
  if (typeof vendor === 'string' && vendor.trim()) return vendor.trim()
  const fromData = res?.data?.proveedor_servicio
  if (typeof fromData === 'string' && fromData.trim()) return fromData.trim()
  const legacy = res?.factura_suministros?.proveedor_servicio
  if (typeof legacy === 'string' && legacy.trim()) return legacy.trim()
  return ''
}

function extractUnidad(res: any): string {
  const fields = (res?.analyzeResult as any)?.fields || {}
  const u = fields?.unidadMedida || fields?.UnidadMedida
  const val = u?.valueString || u?.content
  if (typeof val === 'string' && val.trim()) return val.trim()
  const data = (res?.data as any) || {}
  const dv = data?.unidadMedida || data?.UnidadMedida
  if (typeof dv === 'string' && dv.trim()) return dv.trim()
  // Fallback legacy
  const legacy = res?.factura_suministros?.unidad_medida || res?.unidad_medida
  return typeof legacy === 'string' ? legacy : ''
}

function extractCantidadConsumida(res: any, tipoSuministro?: string): string {
  const fields = (res?.analyzeResult as any)?.fields || {}
  const data = (res?.data as any) || {}
  const pools: any[] = [fields, data, data?.factura_suministros, data?.desplazamientos].filter(
    Boolean,
  )
  // Electricidad: sumar EnergiaP1..P6
  if (tipoSuministro === 'Electricidad') {
    let sumE = 0
    let foundE = false
    for (const pool of pools) {
      for (const key of Object.keys(pool)) {
        const m = key.match(/^EnergiaP([1-6])$/i)
        if (m) {
          const f = (pool as any)[key]
          const v =
            (f && (f.value ?? f.valueString ?? f.content)) ??
            (typeof f === 'number' || typeof f === 'string' ? f : undefined)
          const num =
            typeof v === 'string' ? parseFloat((v as string).replace(/,/g, '.')) : Number(v)
          if (!isNaN(num)) {
            sumE += num
            foundE = true
          }
        }
      }
    }
    if (foundE) return String(sumE)
  }
  const pick = (...keys: string[]): string => {
    for (const k of keys) {
      for (const pool of pools) {
        const f = (pool as any)?.[k]
        const v = f?.value ?? f?.valueString ?? f?.content ?? f
        if ((typeof v === 'number' && !isNaN(v)) || (typeof v === 'string' && String(v).trim()))
          return String(v)
      }
    }
    return ''
  }
  const direct = pick('totalEnergia', 'cantidadVTC')
  if (direct) return direct
  let sum = 0
  let found = false
  for (const pool of pools) {
    for (const key of Object.keys(pool)) {
      if (/^CantidadCombustible\d+$/i.test(key)) {
        const f = (pool as any)[key]
        const v = f?.value ?? f?.valueString ?? f?.content ?? f
        const num = typeof v === 'string' ? parseFloat((v as string).replace(/,/g, '.')) : Number(v)
        if (!isNaN(num)) {
          sum += num
          found = true
        }
      }
    }
  }
  if (found) return String(sum)
  const rest = pick('cantidad', 'Consumo', 'ConsumoTotal')
  if (rest) return rest
  const legacy =
    res?.data?.factura_suministros?.volumen_consumido ??
    res?.data?.desplazamientos?.cantidad_consumida ??
    res?.factura_suministros?.volumen_consumido ??
    res?.desplazamientos?.cantidad_consumida ??
    null
  return legacy != null ? String(legacy) : ''
}

function extractPeriodoConsumo(res: any): { inicio: string; fin: string } {
  const fields = (res?.analyzeResult as any)?.fields
  const inicioField =
    fields?.ServiceStartDate || fields?.serviceStartDate || fields?.StartDate || fields?.startDate
  const finField =
    fields?.ServiceEndDate || fields?.serviceEndDate || fields?.EndDate || fields?.endDate
  const inicioLegacy = res?.factura_suministros?.periodo_consumo?.fecha_inicio
  const finLegacy = res?.factura_suministros?.periodo_consumo?.fecha_fin
  let inicio =
    inicioField?.valueString ||
    inicioField?.content ||
    inicioField?.value ||
    inicioField?.valueDate ||
    inicioLegacy ||
    null
  let fin =
    finField?.valueString ||
    finField?.content ||
    finField?.value ||
    finField?.valueDate ||
    finLegacy ||
    null
  // Fallbacks en analyzeResult.fields: primero FechaInicio/FechaFin (valueString/content), luego InvoiceDate
  if (!inicio)
    inicio =
      fields?.FechaInicio?.valueString ||
      fields?.fechaInicio?.valueString ||
      fields?.FechaInicio?.content ||
      fields?.fechaInicio?.content ||
      fields?.FechaInicio?.valueDate ||
      fields?.fechaInicio?.valueDate ||
      null
  if (!inicio)
    inicio =
      fields?.InvoiceDate?.valueString ||
      fields?.invoiceDate?.valueString ||
      fields?.InvoiceDate?.content ||
      fields?.invoiceDate?.content ||
      fields?.InvoiceDate?.valueDate ||
      fields?.invoiceDate?.valueDate ||
      null
  if (!fin)
    fin =
      fields?.FechaFin?.valueString ||
      fields?.fechaFin?.valueString ||
      fields?.FechaFin?.content ||
      fields?.fechaFin?.content ||
      fields?.FechaFin?.valueDate ||
      fields?.fechaFin?.valueDate ||
      null
  return { inicio: formatDateFlexible(inicio), fin: formatDateFlexible(fin) }
}

function extractTipoSuministro(res: any, acceptLang?: string | null): string {
  const txt =
    `${res?.tipo || ''} ${res?.caso || ''} ${res?.data?.tipo || ''} ${res?.data?.caso || ''}`.toLowerCase()
  let base: 'electricity' | 'water' | 'gas' | 'taxi_vtc' | 'other' | '' = ''
  if (/(electr|electric)/.test(txt)) base = 'electricity'
  else if (/agua|water/.test(txt)) base = 'water'
  else if (/gas/.test(txt)) base = 'gas'
  else if (/taxi|vtc|uber|cabify/.test(txt)) base = 'taxi_vtc'
  else base = 'other'
  const isEn = !!(acceptLang && acceptLang.toLowerCase().startsWith('en'))
  if (isEn) {
    if (base === 'electricity') return 'Electricity'
    if (base === 'water') return 'Water'
    if (base === 'gas') return 'Gas'
    if (base === 'taxi_vtc') return 'Taxi / VTC'
    if (base === 'other') return 'Others'
  }
  if (base === 'electricity') return 'Electricidad'
  if (base === 'water') return 'Agua'
  if (base === 'gas') return 'Gas'
  if (base === 'taxi_vtc') return 'Taxi / VTC'
  if (base === 'other') return 'Otros'
  return 'Otros'
}

function extractTipoProductoLista(res: any): string[] {
  const fields = (res?.analyzeResult as any)?.fields || {}
  // Buscar NombreCombustibleX o EmpresaServicioX
  const resultados: string[] = []
  for (const key of Object.keys(fields)) {
    if (/^NombreCombustible\d+$/i.test(key)) {
      const f = (fields as any)[key]
      const v = f?.valueString || f?.content
      if (typeof v === 'string' && v.trim()) resultados.push(v.trim())
    }
  }
  for (const key of Object.keys(fields)) {
    if (/^EmpresaServicio\d+$/i.test(key)) {
      const f = (fields as any)[key]
      const v = f?.valueString || f?.content
      if (typeof v === 'string' && v.trim()) resultados.push(v.trim())
    }
  }
  const combustible = res?.factura_suministros?.combustible || res?.combustible
  if (typeof combustible === 'string' && combustible.trim()) resultados.push(combustible.trim())
  return Array.from(new Set(resultados))
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const form = await req.formData()
  let ids: string[] = []
  const rawIds = form.getAll('ids') as string[]
  if (rawIds && rawIds.length) {
    ids = rawIds.filter(Boolean)
  } else {
    // Fallback: leer campo documentIds con JSON igual que el endpoint original
    const list = form.get('documentIds') as string | undefined
    if (list) {
      try {
        const parsed = JSON.parse(list)
        if (Array.isArray(parsed)) ids = parsed.filter(Boolean)
      } catch {}
    }
  }
  const format = String(form.get('format') || 'csv').toLowerCase()

  if (!ids.length) return NextResponse.json({ error: 'No IDs' }, { status: 400 })

  const payload = await getPayload({ config })
  const docsRes = await payload.find({
    collection: 'resources' as any,
    where: { id: { in: ids } },
    limit: ids.length,
    depth: 1,
  })

  // Precargar proyectos para nombre de cliente/filial (usamos título de proyecto)
  const projectIds = Array.from(
    new Set(
      (docsRes.docs as any[])
        .map((r) => (typeof r.project === 'string' ? r.project : r.project?.id))
        .filter(Boolean),
    ),
  ) as string[]
  const projectsMap = new Map<string, string>()
  if (projectIds.length) {
    const pr = await payload.find({
      collection: 'projects' as any,
      where: { id: { in: projectIds } },
      limit: 1000,
      depth: 0,
    })
    ;(pr.docs as any[]).forEach((p) => projectsMap.set(String(p.id), String(p.title || '')))
  }

  // Construir datos horizontal: cabecera + filas; apilar productos detectados
  const lines: string[] = []
  const sep = ','
  const esc = (s: string) => {
    const v = s ?? ''
    if (v.includes('"') || v.includes(',') || v.includes('\n'))
      return '"' + v.replace(/"/g, '""') + '"'
    return v
  }
  // Cabecera
  lines.push(
    [
      'Nombre de cliente o filial',
      'Tipo de suministro',
      'Tipo de producto',
      'Proveedor',
      'Fecha Inicio de consumo',
      'Fecha Fin consumo',
      'Cantidad consumida',
      'Unidad de consumo',
      'link a la factura',
    ]
      .map(esc)
      .join(sep),
  )

  // Pre-generar URL de documento como en export original
  const generateDocumentUrl = async (resource: any): Promise<string> => {
    if (!resource?.file) return ''
    try {
      const media = typeof resource.file === 'object' ? resource.file : null
      if (!media) return ''
      const documentUrl = await getSafeMediaUrl(media)
      if (!documentUrl) return ''
      if (documentUrl.startsWith('/')) {
        const baseUrl =
          process.env.PAYLOAD_PUBLIC_SERVER_URL ||
          process.env.NEXT_PUBLIC_SERVER_URL ||
          'https://trinoa.com'
        return `${baseUrl}${documentUrl}`
      }
      return documentUrl
    } catch {
      return ''
    }
  }

  const rows: string[][] = []
  const acceptLang = req.headers.get('accept-language')
  for (const r of docsRes.docs as any[]) {
    const projectId = typeof r.project === 'string' ? r.project : r.project?.id
    const cliente = projectsMap.get(String(projectId)) || ''
    const tipoSuministro = extractTipoSuministro(r, acceptLang)
    let tipoProductos = extractTipoProductoLista(r)
    if (['Electricidad', 'Agua', 'Gas'].includes(tipoSuministro)) {
      tipoProductos = [tipoSuministro]
    }
    // Fallback para casos como Taxi / VTC u otros sin campos específicos
    if (!tipoProductos.length) {
      const raw = `${r?.tipo || ''} ${r?.caso || ''}`.toLowerCase()
      if (/taxi|vtc/.test(raw) || /viajes/.test(raw)) {
        tipoProductos = ['Taxi / VTC']
      } else if (/desplaz/.test(raw)) {
        tipoProductos = ['Desplazamientos']
      } else if (r?.tipo) {
        tipoProductos = [String(r.tipo)]
      } else if (r?.caso) {
        tipoProductos = [String(r.caso)]
      } else {
        tipoProductos = ['']
      }
    }
    const proveedor = extractProviderName(r)
    const { inicio, fin } = extractPeriodoConsumo(r)
    const unidad = extractUnidad(r)
    const cantidad = formatMax2Decimals(extractCantidadConsumida(r, tipoSuministro))
    const link = await generateDocumentUrl(r)
    const list = tipoProductos.length ? tipoProductos : ['']
    for (const tp of list) {
      const row = [cliente, tipoSuministro, tp, proveedor, inicio, fin, cantidad, unidad, link]
      rows.push(row)
    }
  }
  if (format === 'xlsx' || format === 'excel') {
    try {
      const XLSX: any = await import('xlsx')
      const aoa: (string | number)[][] = []
      aoa.push([
        'Nombre de cliente o filial',
        'Tipo de suministro',
        'Tipo de producto',
        'Proveedor',
        'Fecha Inicio de consumo',
        'Fecha Fin consumo',
        'Cantidad consumida',
        'Unidad de consumo',
        'link a la factura',
      ])
      rows.forEach((r) => aoa.push(r))
      const ws = XLSX.utils.aoa_to_sheet(aoa)
      const linkCol = 8
      for (let i = 1; i < aoa.length; i++) {
        const addr = XLSX.utils.encode_cell({ r: i, c: linkCol })
        const url = aoa[i][linkCol]
        if (typeof url === 'string' && url.trim()) {
          if (!ws[addr]) ws[addr] = {}
          ws[addr].l = { Target: url, Tooltip: 'Abrir documento' }
          ws[addr].v = 'Ver documento'
        }
      }
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, '')
      // Usar ArrayBuffer para cumplir tipos del runtime y linter
      const ab: ArrayBuffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
      const u8 = new Uint8Array(ab)
      return new NextResponse(u8, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename="analytics_cliente.xlsx"',
        },
      })
    } catch {}
  }

  const csv = [lines[0], ...rows.map((r) => r.map(esc).join(sep))].join('\n')
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="analitica_cliente.csv"',
    },
  })
}
