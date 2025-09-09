'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useMemo, useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { IconX, IconFilter } from '@tabler/icons-react'

interface FiltersProps {
  dateFrom?: string
  dateTo?: string
  invoiceDateFrom?: string
  invoiceDateTo?: string
  tipo?: string
  caso?: string
  tiposOptions?: string[]
  casosOptions?: string[]
  projects?: { id: string; title: string }[]
  projectId?: string
  providerOptions?: string[]
  provider?: string
}

export default function Filters({
  dateFrom,
  dateTo,
  invoiceDateFrom,
  invoiceDateTo,
  tipo,
  caso,
  tiposOptions = [],
  casosOptions = [],
  projects = [],
  projectId,
  providerOptions = [],
  provider,
}: FiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [fromValue, setFromValue] = useState<string>(dateFrom || '')
  const [toValue, setToValue] = useState<string>(dateTo || '')
  const [invoiceFromValue, setInvoiceFromValue] = useState<string>(invoiceDateFrom || '')
  const [invoiceToValue, setInvoiceToValue] = useState<string>(invoiceDateTo || '')
  const [tipoValue, setTipoValue] = useState<string>(tipo || 'todos')
  const [casoValue, setCasoValue] = useState<string>(caso || 'todos')
  const [projectValue, setProjectValue] = useState<string>(projectId || 'todos')
  const [providerValue, setProviderValue] = useState<string>(provider || 'todos')

  useEffect(() => setFromValue(dateFrom || ''), [dateFrom])
  useEffect(() => setToValue(dateTo || ''), [dateTo])
  useEffect(() => setInvoiceFromValue(invoiceDateFrom || ''), [invoiceDateFrom])
  useEffect(() => setInvoiceToValue(invoiceDateTo || ''), [invoiceDateTo])
  useEffect(() => setTipoValue(tipo || 'todos'), [tipo])
  useEffect(() => setCasoValue(caso || 'todos'), [caso])
  useEffect(() => setProjectValue(projectId || 'todos'), [projectId])
  useEffect(() => setProviderValue(provider || 'todos'), [provider])

  const pushWith = useCallback(
    (patch: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams?.toString() || '')
      for (const [k, v] of Object.entries(patch)) {
        if (!v) params.delete(k)
        else params.set(k, v)
      }
      const qs = params.toString()
      router.push(`/analytics${qs ? `?${qs}` : ''}`)
    },
    [router, searchParams],
  )

  const clearAll = useCallback(() => {
    router.push('/analytics')
  }, [router])

  const tipos = useMemo(() => ['todos', ...Array.from(new Set(tiposOptions))], [tiposOptions])
  const casos = useMemo(() => ['todos', ...Array.from(new Set(casosOptions))], [casosOptions])

  return (
    <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-9 gap-3'>
      {/* Calendarios nativos */}
      <div className='flex flex-col gap-1'>
        <Label htmlFor='from'>Desde</Label>
        <Input
          id='from'
          type='date'
          value={fromValue}
          onChange={(e) => setFromValue(e.target.value)}
          className='w-full'
        />
      </div>
      <div className='flex flex-col gap-1'>
        <Label htmlFor='to'>Hasta</Label>
        <Input
          id='to'
          type='date'
          value={toValue}
          onChange={(e) => setToValue(e.target.value)}
          className='w-full'
        />
      </div>

      {/* Fechas de factura */}
      <div className='flex flex-col gap-1'>
        <Label htmlFor='invoiceFrom'>Fecha factura desde</Label>
        <Input
          id='invoiceFrom'
          type='date'
          value={invoiceFromValue}
          onChange={(e) => setInvoiceFromValue(e.target.value)}
          className='w-full'
        />
      </div>
      <div className='flex flex-col gap-1'>
        <Label htmlFor='invoiceTo'>Fecha factura hasta</Label>
        <Input
          id='invoiceTo'
          type='date'
          value={invoiceToValue}
          onChange={(e) => setInvoiceToValue(e.target.value)}
          className='w-full'
        />
      </div>

      {/* Select Tipo */}
      <div className='flex flex-col gap-1'>
        <Label>Tipo</Label>
        <Select value={tipoValue} onValueChange={(v) => setTipoValue(v)}>
          <SelectTrigger className='w-full'>
            <SelectValue placeholder='Tipo' />
          </SelectTrigger>
          <SelectContent>
            {tipos.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Select Caso */}
      <div className='flex flex-col gap-1'>
        <Label>Caso</Label>
        <Select value={casoValue} onValueChange={(v) => setCasoValue(v)}>
          <SelectTrigger className='w-full'>
            <SelectValue placeholder='Caso' />
          </SelectTrigger>
          <SelectContent>
            {casos.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Selector de cliente solo admin */}
      {/* Proyecto */}
      <div className='flex flex-col gap-1'>
        <Label>Proyecto</Label>
        <Select value={projectValue} onValueChange={(v) => setProjectValue(v)}>
          <SelectTrigger className='w-full'>
            <SelectValue placeholder='Proyecto' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='todos'>todos</SelectItem>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Proveedor */}
      <div className='flex flex-col gap-1'>
        <Label>Proveedor</Label>
        <Select value={providerValue} onValueChange={(v) => setProviderValue(v)}>
          <SelectTrigger className='w-full'>
            <SelectValue placeholder='Proveedor' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='todos'>todos</SelectItem>
            {Array.from(new Set(providerOptions)).map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className='flex gap-2 items-center justify-end'>
        <Button
          variant='ghost'
          onClick={() =>
            pushWith({
              from: fromValue || undefined,
              to: toValue || undefined,
              invoiceFrom: invoiceFromValue || undefined,
              invoiceTo: invoiceToValue || undefined,
              tipo: tipoValue === 'todos' ? undefined : tipoValue,
              caso: casoValue === 'todos' ? undefined : casoValue,
              projectId: projectValue === 'todos' ? undefined : projectValue,
              provider: providerValue === 'todos' ? undefined : providerValue,
            })
          }
          className='hidden md:inline-flex'
        >
          <IconFilter className='h-4 w-4 mr-2' /> Aplicar
        </Button>
        <Button variant='ghost' size='icon' onClick={clearAll} aria-label='Limpiar filtros'>
          <IconX className='h-4 w-4' />
        </Button>
      </div>
    </div>
  )
}
