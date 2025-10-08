'use client'

import * as React from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { IconCheck, IconPlus, IconChevronDown } from '@tabler/icons-react'
import { toast } from 'sonner'
import { useLocale, useTranslations } from 'next-intl'
import { getCurrencySelectOptions } from '@/lib/utils/currency-normalization'

import { updateResourceAction } from '@/actions/resources/updateResource'
import { useRouter } from 'next/navigation'
import useResourceVerificationStore from '@/stores/resource-verification-store'

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
  const checkCanVerify = useResourceVerificationStore((s) => s.checkCanVerify)
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

      // Recalcular estado de verificación
      await checkCanVerify(resourceId)
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

  type Translation = { label: string; labelEn?: string; order?: number; isRequired?: boolean }
  const [translations, setTranslations] = React.useState<Record<string, Translation>>({})
  const [requiredFields, setRequiredFields] = React.useState<Set<string>>(new Set())
  const [currencyFields, setCurrencyFields] = React.useState<Set<string>>(new Set())
  const [confidenceThreshold, setConfidenceThreshold] = React.useState<number>(70)

  React.useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch('/api/field-translations?limit=1000&sort=order')
        const data = await res.json()
        const map: Record<string, Translation> = {}
        const requiredSet = new Set<string>()
        const currencySet = new Set<string>()
        const docs = Array.isArray(data?.docs) ? data.docs : []
        for (const d of docs) {
          if (d?.key) {
            map[d.key] = {
              label: d.label,
              labelEn: d.labelEn,
              order: typeof d.order === 'number' ? d.order : undefined,
              isRequired: Boolean(d.isRequired),
            }
            if (d.isRequired) {
              requiredSet.add(d.key)
            }
            // Detectar campos de moneda por etiqueta
            if (typeof d.label === 'string' && d.label.trim().toLowerCase() === 'moneda') {
              currencySet.add(d.key)
            }
          }
        }
        setTranslations(map)
        setRequiredFields(requiredSet)
        setCurrencyFields(currencySet)
      } catch {}
    })()
  }, [])

  // Cargar el umbral de confianza desde la configuración
  React.useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch('/api/globals/configuracion')
        const data = await res.json()
        const threshold = data?.confidenceSettings?.confidenceThreshold ?? 70
        setConfidenceThreshold(threshold)
      } catch (e) {
        console.warn('Error loading confidence threshold:', e)
      }
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

  const confirmField = async (key: string) => {
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
    await persistPendingChanges()
  }

  // Función para determinar si un campo obligatorio necesita revisión
  const isRequiredFieldNeedsRevision = (fieldKey: string): boolean => {
    if (!requiredFields.has(fieldKey)) return false

    const field = (fields as any)[fieldKey]
    if (!field) return false

    const isManual = Boolean(field.manual)
    const confidence = field.confidence
    const thresholdDecimal = confidenceThreshold / 100

    // Si es manual, no necesita revisión
    if (isManual) return false

    // Si no tiene confianza o está por debajo del umbral, necesita revisión
    return typeof confidence !== 'number' || confidence < thresholdDecimal
  }

  const CurrencySelector = ({ fieldKey }: { fieldKey: string }) => {
    const val = (fields as any)[fieldKey]
    const conf = typeof (val as any)?.confidence === 'number' ? (val as any).confidence : undefined
    const isManual = Boolean((val as any)?.manual)
    const saved = Boolean(savedAt[fieldKey])
    const currentValue = draftsRef.current[fieldKey] ?? getValue(val) ?? ''

    const isRequired = requiredFields.has(fieldKey)
    const needsRevision = isRequiredFieldNeedsRevision(fieldKey)

    const [open, setOpen] = React.useState(false)
    const currencyOptions = React.useMemo(() => getCurrencySelectOptions(), [])

    const selectedOption = currencyOptions.find((option) => option.value === currentValue)

    return (
      <div>
        <div className='relative'>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant='outline'
                role='combobox'
                aria-expanded={open}
                className={`w-full justify-between ${
                  needsRevision
                    ? 'border-red-300 ring-red-200 focus:border-red-500 focus:ring-red-500 bg-red-50'
                    : ''
                }`}
              >
                {selectedOption ? (
                  <span className='flex items-center gap-2'>
                    {selectedOption.symbol && (
                      <span className='text-muted-foreground'>{selectedOption.symbol}</span>
                    )}
                    {locale?.startsWith('en') ? selectedOption.labelEn : selectedOption.label}
                  </span>
                ) : (
                  'Seleccionar moneda...'
                )}
                <IconChevronDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
              </Button>
            </PopoverTrigger>
            <PopoverContent className='w-full p-0' align='start'>
              <Command>
                <CommandInput placeholder='Buscar moneda...' />
                <CommandList>
                  <CommandEmpty>No se encontró ninguna moneda.</CommandEmpty>
                  <CommandGroup>
                    {currencyOptions.map((option) => (
                      <CommandItem
                        key={option.value}
                        value={option.searchTerms}
                        onSelect={() => {
                          const newValue = option.value
                          handleChange(fieldKey, newValue)
                          setOpen(false)
                          // Auto-guardar después de seleccionar
                          setTimeout(() => {
                            if (pendingKeysRef.current.has(fieldKey)) {
                              if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
                              void persistPendingChanges()
                            }
                          }, 100)
                        }}
                      >
                        <div className='flex items-center gap-2 w-full'>
                          {option.symbol && (
                            <span className='text-muted-foreground w-6'>{option.symbol}</span>
                          )}
                          <span className='flex-1'>
                            {locale?.startsWith('en') ? option.labelEn : option.label}
                          </span>
                          <IconCheck
                            className={`ml-auto h-4 w-4 ${
                              currentValue === option.value ? 'opacity-100' : 'opacity-0'
                            }`}
                          />
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <div className='absolute inset-y-0 right-8 flex items-center pointer-events-none'>
            {saved && <IconCheck className='h-4 w-4 text-green-600' />}
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

    const isRequired = requiredFields.has(fieldKey)
    const needsRevision = isRequiredFieldNeedsRevision(fieldKey)

    return (
      <div>
        <div className='relative'>
          <Input
            className={`pr-10 ${needsRevision ? 'border-red-300 ring-red-200 focus:border-red-500 focus:ring-red-500 bg-red-50' : ''}`}
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
                onClick={() => void confirmField(fieldKey)}
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
                    const empresaRequired = requiredFields.has(empresaKey)
                    const importeRequired = requiredFields.has(importeKey)
                    return (
                      <TableRow key={i}>
                        <TableCell>
                          <div className='space-y-1'>
                            {empresaRequired && (
                              <div className='text-xs text-muted-foreground flex items-center gap-1'>
                                {t('companyService')} <span className='text-red-500'>*</span>
                              </div>
                            )}
                            <ConfirmableInput fieldKey={empresaKey} placeholder={empresaKey} />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className='space-y-1'>
                            {importeRequired && (
                              <div className='text-xs text-muted-foreground flex items-center gap-1'>
                                {t('amount')} <span className='text-red-500'>*</span>
                              </div>
                            )}
                            <ConfirmableInput fieldKey={importeKey} placeholder={importeKey} />
                          </div>
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
                    const nombreRequired = requiredFields.has(nombreKey)
                    const cantidadRequired = requiredFields.has(cantidadKey)
                    const unidadRequired = requiredFields.has(unidadKey)
                    return (
                      <TableRow key={`comb-${i}`}>
                        <TableCell>
                          <div className='space-y-1'>
                            {nombreRequired && (
                              <div className='text-xs text-muted-foreground flex items-center gap-1'>
                                {t('fuel')} <span className='text-red-500'>*</span>
                              </div>
                            )}
                            <ConfirmableInput fieldKey={nombreKey} placeholder={nombreKey} />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className='space-y-1'>
                            {cantidadRequired && (
                              <div className='text-xs text-muted-foreground flex items-center gap-1'>
                                {t('quantity')} <span className='text-red-500'>*</span>
                              </div>
                            )}
                            <ConfirmableInput fieldKey={cantidadKey} placeholder={cantidadKey} />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className='space-y-1'>
                            {unidadRequired && (
                              <div className='text-xs text-muted-foreground flex items-center gap-1'>
                                {t('unit')} <span className='text-red-500'>*</span>
                              </div>
                            )}
                            <ConfirmableInput fieldKey={unidadKey} placeholder={unidadKey} />
                          </div>
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
          const isRequired = requiredFields.has(key)
          return (
            <div key={key} className='p-0'>
              <div className='mb-1 flex items-baseline justify-between'>
                <label className='text-xs font-semibold text-muted-foreground flex items-center gap-1'>
                  {locale?.startsWith('en')
                    ? translations[key]?.labelEn || key || translations[key]?.label
                    : translations[key]?.label || key}
                  {isRequired && <span className='text-red-500 text-sm'>*</span>}
                  {savedAt[key] ? <IconCheck size={12} className='text-green-600' /> : null}
                </label>
              </div>
              {currencyFields.has(key) ? (
                <CurrencySelector fieldKey={key} />
              ) : (
                <ConfirmableInput fieldKey={key} />
              )}
            </div>
          )
        })}
      </div>
      {saving && <div className='mt-1 text-[10px] text-muted-foreground'>{tForms('saving')}</div>}
    </div>
  )
}
