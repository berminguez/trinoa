'use client'

import * as React from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { IconCheck, IconPlus } from '@tabler/icons-react'
import { toast } from 'sonner'
import { useLocale, useTranslations } from 'next-intl'

import { updateResourceAction } from '@/actions/resources/updateResource'
import { useRouter } from 'next/navigation'

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
  const t = useTranslations('resources.analysis')
  const tForms = useTranslations('forms')
  const locale = useLocale()
  const router = useRouter()
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
  const [revealedIndices, setRevealedIndices] = React.useState<number[]>([])
  const draftsRef = React.useRef<Record<string, string>>({})
  const saveTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

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

  const persistPendingChanges = async () => {
    if (pendingKeysRef.current.size === 0) return
    try {
      setSaving(true)
      const merged: Fields = { ...fields }
      for (const k of pendingKeysRef.current) {
        const v = draftsRef.current[k]
        const cur = merged[k] || {}
        // Guardar valor actual y marcar como manual
        merged[k] = {
          ...cur,
          valueString: v ?? getValue(cur),
          content: v ?? getValue(cur),
          manual: true,
        }
      }
      const payload = { ...meta, fields: withTotalEnergia(merged) }
      const res = await updateResourceAction(
        projectId,
        resourceId,
        { analyzeResult: payload },
        { skipRevalidate: true },
      )
      if (!res.success) throw new Error(res.error || 'Error')

      const now = Date.now()
      const updates: Record<string, number> = {}
      for (const k of pendingKeysRef.current) updates[k] = now
      setSavedAt((prev) => ({ ...prev, ...updates }))
      setFields(payload.fields as Fields)
      for (const k of pendingKeysRef.current) delete draftsRef.current[k]
      pendingKeysRef.current.clear()
      setTimeout(() => {
        setSavedAt((prev) => {
          const copy = { ...prev }
          for (const [k, t] of Object.entries(copy)) {
            if (now === t) delete copy[k]
          }
          return copy
        })
      }, 1500)

      // Refrescar para que el estado de confianza se actualice sin recargar manualmente
      router.refresh()
    } catch (e) {
      toast.error(String(e))
    } finally {
      setSaving(false)
    }
  }

  const scheduleAutoSave = () => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    // 5 segundos
    saveTimeoutRef.current = setTimeout(() => {
      void persistPendingChanges()
    }, 5000)
  }

  const handleChange = (key: string, value: string) => {
    draftsRef.current[key] = value
    pendingKeysRef.current.add(key)
    scheduleAutoSave()
  }

  // Limpiar debounce al desmontar
  React.useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    }
  }, [])

  type Translation = { label: string; labelEn?: string; order?: number }
  const [translations, setTranslations] = React.useState<Record<string, Translation>>({})

  React.useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch('/api/field-translations?limit=1000&sort=order')
        const data = await res.json()
        const map: Record<string, Translation> = {}
        const docs = Array.isArray(data?.docs) ? data.docs : []
        for (const d of docs) {
          if (d?.key)
            map[d.key] = {
              label: d.label,
              labelEn: d.labelEn,
              order: typeof d.order === 'number' ? d.order : undefined,
            }
        }
        setTranslations(map)
      } catch {}
    })()
  }, [])

  const entries = React.useMemo(() => {
    const hasTotal = Boolean((fields as any).totalEnergia)
    const arr = Object.entries(fields).filter(([k]) => {
      // Excluir EnergiaP1..6 si hay totalEnergia
      if (hasTotal && /^EnergiaP[1-6]$/.test(k)) return false
      // Excluir EmpresaServicio1..12 e Importe1..12 (se renderizan en tabla propia)
      if (/^EmpresaServicio([1-9]|1[0-2])$/.test(k)) return false
      if (/^Importe([1-9]|1[0-2])$/.test(k)) return false
      // Excluir bloques de Combustibles 1..10 (se renderizan en tabla propia)
      if (/^NombreCombustible([1-9]|10)$/.test(k)) return false
      if (/^CantidadCombustible([1-9]|10)$/.test(k)) return false
      if (/^UnidadMedidaCombustible([1-9]|10)$/.test(k)) return false
      return true
    })
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

  // Construir filas EmpresaServicio/Importe 1..12
  const serviceImportRows = React.useMemo(() => {
    const rows: Array<{ index: number; empresa: string; importe: string }> = []
    for (let i = 1; i <= 12; i++) {
      const empresa = getValue((fields as any)[`EmpresaServicio${i}`])
      const importe = getValue((fields as any)[`Importe${i}`])
      rows.push({ index: i, empresa, importe })
    }
    return rows
  }, [fields])

  const baseVisibleIndices = React.useMemo(() => {
    return serviceImportRows.filter((r) => r.empresa || r.importe).map((r) => r.index)
  }, [serviceImportRows])

  const visibleIndices = React.useMemo(() => {
    const set = new Set<number>([...baseVisibleIndices, ...revealedIndices])
    return Array.from(set).sort((a, b) => a - b)
  }, [baseVisibleIndices, revealedIndices])

  const canRevealMore = visibleIndices.length < 12
  const hasEmpresaServicioBase = React.useMemo(() => {
    return Object.prototype.hasOwnProperty.call(fields, 'EmpresaServicio1')
  }, [fields])

  const revealNext = () => {
    for (let i = 1; i <= 12; i++) {
      if (!visibleIndices.includes(i)) {
        setRevealedIndices((prev) => [...prev, i])
        break
      }
    }
  }

  // Construir filas de Combustibles 1..10 (Nombre, Cantidad, Unidad)
  const combustibleRows = React.useMemo(() => {
    const rows: Array<{ index: number; nombre: string; cantidad: string; unidad: string }> = []
    for (let i = 1; i <= 10; i++) {
      const nombre = getValue((fields as any)[`NombreCombustible${i}`])
      const cantidad = getValue((fields as any)[`CantidadCombustible${i}`])
      const unidad = getValue((fields as any)[`UnidadMedidaCombustible${i}`])
      rows.push({ index: i, nombre, cantidad, unidad })
    }
    return rows
  }, [fields])

  const [combustibleRevealedIndices, setCombustibleRevealedIndices] = React.useState<number[]>([])

  const combustibleBaseVisible = React.useMemo(() => {
    return combustibleRows.filter((r) => r.nombre || r.cantidad || r.unidad).map((r) => r.index)
  }, [combustibleRows])

  const combustibleVisibleIndices = React.useMemo(() => {
    const set = new Set<number>([...combustibleBaseVisible, ...combustibleRevealedIndices])
    return Array.from(set).sort((a, b) => a - b)
  }, [combustibleBaseVisible, combustibleRevealedIndices])

  const combustibleCanRevealMore = combustibleVisibleIndices.length < 10
  const hasNombreCombustibleBase = React.useMemo(() => {
    return Object.prototype.hasOwnProperty.call(fields, 'NombreCombustible1')
  }, [fields])

  const revealNextCombustible = () => {
    for (let i = 1; i <= 10; i++) {
      if (!combustibleVisibleIndices.includes(i)) {
        setCombustibleRevealedIndices((prev) => [...prev, i])
        break
      }
    }
  }

  const confirmField = (key: string) => {
    setFields((prev) => {
      const cur = (prev as any)[key] || {}
      const value = getValue(cur)
      const next = {
        ...prev,
        [key]: {
          ...cur,
          valueString: value,
          content: value,
          manual: true,
          accepted: true,
        },
      }
      return withTotalEnergia(next)
    })
    pendingKeysRef.current.add(key)
    // Guardar inmediatamente al confirmar
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    void persistPendingChanges()
  }

  const ConfirmableInput = ({
    fieldKey,
    placeholder,
  }: {
    fieldKey: string
    placeholder?: string
  }) => {
    const val = (fields as any)[fieldKey]
    const conf = typeof (val as any)?.confidence === 'number' ? (val as any).confidence : undefined
    const isManual = Boolean((val as any)?.manual)
    const saved = Boolean(savedAt[fieldKey])
    const currentValue = draftsRef.current[fieldKey] ?? getValue(val) ?? ''
    const hasValue = Boolean(currentValue)
    const showConfirmButton = hasValue && !isManual && !(typeof conf === 'number' && conf >= 0.8)

    return (
      <div>
        <div className='relative'>
          <Input
            className='pr-10'
            defaultValue={currentValue}
            placeholder={placeholder}
            onChange={(e) => {
              const v = e.target.value
              handleChange(fieldKey, v)
            }}
            onBlur={() => {
              // Guardar al perder foco si hay cambios pendientes
              if (pendingKeysRef.current.has(fieldKey)) {
                if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
                void persistPendingChanges()
              }
            }}
          />
          <div className='absolute inset-y-0 right-1 flex items-center'>
            {saved ? (
              <IconCheck className='h-4 w-4 text-green-600 mr-2' />
            ) : showConfirmButton ? (
              <Button
                variant='ghost'
                size='icon'
                onClick={() => confirmField(fieldKey)}
                aria-label={t('confirm')}
              >
                <IconCheck className='h-4 w-4' />
              </Button>
            ) : null}
          </div>
        </div>
        {isManual ? (
          <div className='mt-1 text-[10px] text-green-600'>{t('manual')}</div>
        ) : conf !== undefined && currentValue ? (
          <div className={`mt-1 text-[10px] ${getColor(conf)}`}>
            {t('confidenceIndex')}: {Math.round(conf * 100)}%
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <div className='mt-4'>
      {/* IC global oculto */}

      {/* Tabla EmpresaServicio / Importe */}
      {(() => {
        return (
          <div className='mb-4'>
            <div className='mb-2 flex items-center justify-between'></div>
            {visibleIndices.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className='w-2/3'>{t('companyService')}</TableHead>
                    <TableHead className='w-1/3'>{t('amount')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleIndices.map((i) => {
                    const empresaKey = `EmpresaServicio${i}`
                    const importeKey = `Importe${i}`
                    return (
                      <TableRow key={i}>
                        <TableCell>
                          <ConfirmableInput fieldKey={empresaKey} placeholder={empresaKey} />
                        </TableCell>
                        <TableCell>
                          <ConfirmableInput fieldKey={importeKey} placeholder={importeKey} />
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            ) : null}
            {hasEmpresaServicioBase ? (
              <Button variant='outline' size='sm' onClick={revealNext} disabled={!canRevealMore}>
                <IconPlus className='h-4 w-4 mr-1' /> {t('addCompanyService')}
              </Button>
            ) : null}
          </div>
        )
      })()}

      {/* Tabla Combustibles: Nombre / Cantidad / Unidad */}
      {(() => {
        return (
          <div className='mb-4'>
            {combustibleVisibleIndices.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className='w-1/2'>{t('fuel')}</TableHead>
                    <TableHead className='w-1/4'>{t('quantity')}</TableHead>
                    <TableHead className='w-1/4'>{t('unit')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {combustibleVisibleIndices.map((i) => {
                    const nombreKey = `NombreCombustible${i}`
                    const cantidadKey = `CantidadCombustible${i}`
                    const unidadKey = `UnidadMedidaCombustible${i}`
                    return (
                      <TableRow key={`comb-${i}`}>
                        <TableCell>
                          <ConfirmableInput fieldKey={nombreKey} placeholder={nombreKey} />
                        </TableCell>
                        <TableCell>
                          <ConfirmableInput fieldKey={cantidadKey} placeholder={cantidadKey} />
                        </TableCell>
                        <TableCell>
                          <ConfirmableInput fieldKey={unidadKey} placeholder={unidadKey} />
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            ) : null}
            {hasNombreCombustibleBase ? (
              <Button
                variant='outline'
                size='sm'
                onClick={revealNextCombustible}
                disabled={!combustibleCanRevealMore}
              >
                <IconPlus className='h-4 w-4 mr-1' /> {t('addFuel')}
              </Button>
            ) : null}
          </div>
        )
      })()}

      <div className='mt-2 grid grid-cols-1 gap-3 md:grid-cols-2'>
        {!loading && entries.length === 0 ? (
          <div className='text-xs text-muted-foreground'>{t('noFields')}</div>
        ) : null}
        {entries.map(([key]) => {
          return (
            <div key={key} className='p-0'>
              <div className='mb-1 flex items-baseline justify-between'>
                <label className='text-xs font-semibold text-muted-foreground flex items-center gap-1'>
                  {locale?.startsWith('en')
                    ? translations[key]?.labelEn || key || translations[key]?.label
                    : translations[key]?.label || key}
                  {savedAt[key] ? <IconCheck size={12} className='text-green-600' /> : null}
                </label>
              </div>
              <ConfirmableInput fieldKey={key} />
            </div>
          )
        })}
      </div>
      {saving && <div className='mt-1 text-[10px] text-muted-foreground'>{tForms('saving')}</div>}
    </div>
  )
}
