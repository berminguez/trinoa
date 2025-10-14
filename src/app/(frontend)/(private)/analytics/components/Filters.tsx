'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useMemo, useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
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
  downloaded?: 'yes' | 'no' | 'todos'
  processed?: 'yes' | 'no' | 'todos'
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
  downloaded,
  processed,
}: FiltersProps) {
  const t = useTranslations('analytics.filters')
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
  const [downloadedValue, setDownloadedValue] = useState<string>(downloaded || 'todos')
  const [processedValue, setProcessedValue] = useState<string>(processed || 'todos')

  useEffect(() => setFromValue(dateFrom || ''), [dateFrom])
  useEffect(() => setToValue(dateTo || ''), [dateTo])
  useEffect(() => setInvoiceFromValue(invoiceDateFrom || ''), [invoiceDateFrom])
  useEffect(() => setInvoiceToValue(invoiceDateTo || ''), [invoiceDateTo])
  useEffect(() => setTipoValue(tipo || 'todos'), [tipo])
  useEffect(() => setCasoValue(caso || 'todos'), [caso])
  useEffect(() => setProjectValue(projectId || 'todos'), [projectId])
  useEffect(() => setProviderValue(provider || 'todos'), [provider])
  useEffect(() => setDownloadedValue(downloaded || 'todos'), [downloaded])
  useEffect(() => setProcessedValue(processed || 'todos'), [processed])

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
    <div className='grid grid-cols-1 gap-3'>
      {/* Fila única: Fechas (creación e invoice) */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3'>
        <div className='flex flex-col gap-1'>
          <Label htmlFor='from'>{t('from')}</Label>
          <Input
            id='from'
            type='date'
            value={fromValue}
            onChange={(e) => setFromValue(e.target.value)}
            className='w-full'
          />
        </div>
        <div className='flex flex-col gap-1'>
          <Label htmlFor='to'>{t('to')}</Label>
          <Input
            id='to'
            type='date'
            value={toValue}
            onChange={(e) => setToValue(e.target.value)}
            className='w-full'
          />
        </div>
        <div className='flex flex-col gap-1'>
          <Label htmlFor='invoiceFrom'>{t('invoiceFrom')}</Label>
          <Input
            id='invoiceFrom'
            type='date'
            value={invoiceFromValue}
            onChange={(e) => setInvoiceFromValue(e.target.value)}
            className='w-full'
          />
        </div>
        <div className='flex flex-col gap-1'>
          <Label htmlFor='invoiceTo'>{t('invoiceTo')}</Label>
          <Input
            id='invoiceTo'
            type='date'
            value={invoiceToValue}
            onChange={(e) => setInvoiceToValue(e.target.value)}
            className='w-full'
          />
        </div>
      </div>

      {/* Fila: Resto de filtros */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 items-end'>
        <div className='flex flex-col gap-1'>
          <Label>{t('type')}</Label>
          <Select value={tipoValue} onValueChange={(v) => setTipoValue(v)}>
            <SelectTrigger className='w-full'>
              <SelectValue placeholder={t('type')} />
            </SelectTrigger>
            <SelectContent>
              {tipos.map((tipo) => (
                <SelectItem key={tipo} value={tipo}>
                  {tipo === 'todos' ? t('all') : tipo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className='flex flex-col gap-1'>
          <Label>{t('case')}</Label>
          <Select value={casoValue} onValueChange={(v) => setCasoValue(v)}>
            <SelectTrigger className='w-full'>
              <SelectValue placeholder={t('case')} />
            </SelectTrigger>
            <SelectContent>
              {casos.map((caso) => (
                <SelectItem key={caso} value={caso}>
                  {caso === 'todos' ? t('all') : caso}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className='flex flex-col gap-1'>
          <Label>{t('project')}</Label>
          <Select value={projectValue} onValueChange={(v) => setProjectValue(v)}>
            <SelectTrigger className='w-full'>
              <SelectValue placeholder={t('project')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='todos'>{t('all')}</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className='flex flex-col gap-1'>
          <Label>{t('provider')}</Label>
          <Select value={providerValue} onValueChange={(v) => setProviderValue(v)}>
            <SelectTrigger className='w-full'>
              <SelectValue placeholder={t('provider')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='todos'>{t('all')}</SelectItem>
              {Array.from(new Set(providerOptions)).map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className='flex flex-col gap-1'>
          <Label>{t('downloaded')}</Label>
          <Select value={downloadedValue} onValueChange={(v) => setDownloadedValue(v)}>
            <SelectTrigger className='w-full'>
              <SelectValue placeholder={t('downloaded')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='todos'>{t('all')}</SelectItem>
              <SelectItem value='yes'>{t('downloaded_yes')}</SelectItem>
              <SelectItem value='no'>{t('downloaded_no')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className='flex flex-col gap-1'>
          <Label>{t('processed')}</Label>
          <Select value={processedValue} onValueChange={(v) => setProcessedValue(v)}>
            <SelectTrigger className='w-full'>
              <SelectValue placeholder={t('processed')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='todos'>{t('all')}</SelectItem>
              <SelectItem value='yes'>{t('downloaded_yes')}</SelectItem>
              <SelectItem value='no'>{t('downloaded_no')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className='flex gap-2 items-center justify-center col-span-1 md:col-span-2 lg:col-span-3 xl:col-span-6'>
          <Button
            variant='default'
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
                downloaded: downloadedValue === 'todos' ? undefined : (downloadedValue as any),
                processed: processedValue === 'todos' ? undefined : (processedValue as any),
              })
            }
          >
            <IconFilter className='h-4 w-4 mr-2' /> {t('apply')}
          </Button>
          <Button variant='ghost' size='icon' onClick={clearAll} aria-label={t('clear')}>
            <IconX className='h-4 w-4' />
          </Button>
        </div>
      </div>
    </div>
  )
}
