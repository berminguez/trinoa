'use client'

import * as React from 'react'
import { Input } from '@/components/ui/input'
import { IconCheck } from '@tabler/icons-react'
import { toast } from 'sonner'

import { updateResourceAction } from '@/actions/resources/updateResource'

type Fields = Record<string, any>

function getColor(conf?: number): string {
  if (typeof conf !== 'number') return 'text-muted-foreground'
  if (conf >= 0.8) return 'text-green-600'
  if (conf >= 0.7) return 'text-amber-600'
  return 'text-red-600'
}

function getValue(val: any): string {
  if (!val || typeof val !== 'object') return ''
  if (typeof val.valueString === 'string') return val.valueString
  if (typeof val.content === 'string') return val.content
  return ''
}

function getNumberFromField(val: any): number | undefined {
  const s = getValue(val)
  if (!s) return undefined
  const normalized = s.replace(/\./g, '').replace(/,/g, '.')
  const n = Number(normalized)
  return Number.isFinite(n) ? n : undefined
}

function withTotalEnergia(original: Fields): Fields {
  try {
    const copy: Fields = { ...original }
    if (
      copy.totalEnergia &&
      typeof copy.totalEnergia === 'object' &&
      (copy.totalEnergia as any).manual
    ) {
      return copy
    }
    let sum = 0
    let found = false
    let confSum = 0
    let confCount = 0
    for (let i = 1; i <= 6; i++) {
      const key = `EnergiaP${i}`
      if (Object.prototype.hasOwnProperty.call(copy, key)) {
        const num = getNumberFromField(copy[key])
        if (typeof num === 'number') {
          sum += num
          found = true
          const c = (copy[key] as any)?.confidence
          if (typeof c === 'number') {
            confSum += c
            confCount += 1
          }
        }
      }
    }
    if (found) {
      const str = String(Math.round(sum))
      const avgConf = confCount > 0 ? confSum / confCount : undefined
      const totalField: any = { content: str, valueString: str }
      if (typeof avgConf === 'number') totalField.confidence = avgConf
      copy.totalEnergia = totalField
    }
    return copy
  } catch {
    return original
  }
}

export default function AnalyzeFieldsPanel({
  projectId,
  resourceId,
}: {
  projectId: string
  resourceId: string
}) {
  const [loading, setLoading] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [fields, setFields] = React.useState<Fields>({})
  const [meta, setMeta] = React.useState<{
    apiVersion?: string
    content?: string
    confidence?: number
  }>({})
  const loadedRef = React.useRef(false)
  const pendingKeysRef = React.useRef<Set<string>>(new Set())
  const [savedAt, setSavedAt] = React.useState<Record<string, number>>({})

  React.useEffect(() => {
    ;(async () => {
      try {
        setLoading(true)
        const res = await fetch(`/api/resources/${resourceId}?depth=0`)
        const data = await res.json()
        const ar = (data?.analyzeResult || {}) as any
        const f = ar?.fields && typeof ar.fields === 'object' ? ar.fields : {}
        setFields(withTotalEnergia(f))
        setMeta({ apiVersion: ar?.apiVersion, content: ar?.content, confidence: ar?.confidence })
        loadedRef.current = true
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    })()
  }, [resourceId])

  const handleChange = (key: string, value: string) => {
    setFields((prev) => {
      const cur = prev[key] || {}
      const next = { ...prev, [key]: { ...cur, valueString: value, content: value, manual: true } }
      return withTotalEnergia(next)
    })
    pendingKeysRef.current.add(key)
  }

  React.useEffect(() => {
    if (!loadedRef.current) return
    const timer = setTimeout(async () => {
      try {
        setSaving(true)
        const payload = { ...meta, fields: withTotalEnergia(fields) }
        const res = await updateResourceAction(projectId, resourceId, { analyzeResult: payload })
        if (!res.success) throw new Error(res.error || 'Error')
        // marcar como guardados los keys pendientes
        if (pendingKeysRef.current.size > 0) {
          const now = Date.now()
          const updates: Record<string, number> = {}
          for (const k of pendingKeysRef.current) updates[k] = now
          setSavedAt((prev) => ({ ...prev, ...updates }))
          pendingKeysRef.current.clear()
          // limpiar los checks tras 1500ms
          setTimeout(() => {
            setSavedAt((prev) => {
              const copy = { ...prev }
              for (const [k, t] of Object.entries(copy)) {
                if (now === t) delete copy[k]
              }
              return copy
            })
          }, 1500)
        }
      } catch (e) {
        toast.error(String(e))
      } finally {
        setSaving(false)
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [fields, meta, projectId, resourceId])

  type Translation = { label: string; order?: number }
  const [translations, setTranslations] = React.useState<Record<string, Translation>>({})

  React.useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch('/api/field-translations?limit=1000&sort=order')
        const data = await res.json()
        const map: Record<string, Translation> = {}
        const docs = Array.isArray(data?.docs) ? data.docs : []
        for (const d of docs) {
          if (d?.key && d?.label)
            map[d.key] = {
              label: d.label,
              order: typeof d.order === 'number' ? d.order : undefined,
            }
        }
        setTranslations(map)
      } catch {}
    })()
  }, [])

  const entries = React.useMemo(() => {
    const hasTotal = Boolean((fields as any).totalEnergia)
    const arr = Object.entries(fields).filter(([k]) =>
      hasTotal ? !/^EnergiaP[1-6]$/.test(k) : true,
    )
    arr.sort((a, b) => {
      const oa = translations[a[0]]?.order
      const ob = translations[b[0]]?.order
      const na = typeof oa === 'number' ? oa : Number.POSITIVE_INFINITY
      const nb = typeof ob === 'number' ? ob : Number.POSITIVE_INFINITY
      if (na !== nb) return na - nb
      return a[0].localeCompare(b[0])
    })
    return arr
  }, [fields, translations])

  return (
    <div className='mt-4'>
      {/* IC global oculto */}

      <div className='mt-2 grid grid-cols-1 gap-3 md:grid-cols-2'>
        {!loading && entries.length === 0 ? (
          <div className='text-xs text-muted-foreground'>No hay campos disponibles</div>
        ) : null}
        {entries.map(([key, val]) => {
          const conf =
            typeof (val as any)?.confidence === 'number' ? (val as any).confidence : undefined
          return (
            <div key={key} className='p-0'>
              <div className='mb-1 flex items-baseline justify-between'>
                <label className='text-xs font-semibold text-muted-foreground flex items-center gap-1'>
                  {translations[key]?.label || key}
                  {savedAt[key] ? <IconCheck size={12} className='text-green-600' /> : null}
                </label>
                {(() => {
                  const manual = Boolean((val as any)?.manual)
                  const v = getValue(val)
                  if (manual) return <span className='text-[10px] text-green-600'>Manual</span>
                  if (!v) return null
                  if (typeof conf !== 'undefined') {
                    return (
                      <span className={`text-[10px] ${getColor(conf)}`}>
                        IC: {Math.round(conf * 100)}%
                      </span>
                    )
                  }
                  return null
                })()}
              </div>
              <Input
                defaultValue={getValue(val)}
                onChange={(e) => handleChange(key, e.target.value)}
              />
            </div>
          )
        })}
      </div>
      {saving && <div className='mt-1 text-[10px] text-muted-foreground'>Guardando…</div>}
    </div>
  )
}
