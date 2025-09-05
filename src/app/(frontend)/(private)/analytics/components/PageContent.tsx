import { getAnalytics } from '@/actions/analytics/getAnalytics'
import { getCurrentUser } from '@/actions/auth/getUser'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
// import { Input } from '@/components/ui/input'
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import Link from 'next/link'
import Filters from './Filters'
import AdminClientSelector from './AdminClientSelector'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { IconChevronLeft, IconChevronRight, IconArrowUp, IconArrowDown } from '@tabler/icons-react'
import { ConfidenceBadgeSimple } from '@/components/ui/confidence-badge'
import { getClients } from '@/actions/clients/getClients'

export default async function PageContent({
  searchParams,
}: {
  searchParams?: Record<string, string>
}) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const t = await getTranslations('analytics')

  const dateFrom = searchParams?.from || ''
  const dateTo = searchParams?.to || ''
  const invoiceDateFrom = searchParams?.invoiceFrom || ''
  const invoiceDateTo = searchParams?.invoiceTo || ''
  const tipo = searchParams?.tipo || ''
  const caso = searchParams?.caso || ''
  const clientId = user.role === 'admin' ? searchParams?.clientId || '' : ''
  const projectId = searchParams?.projectId || ''
  const provider = searchParams?.provider || ''
  const page = Number(searchParams?.page || '1')
  const sort = searchParams?.sort || '' // e.g. title, -createdAt

  const data = await getAnalytics({
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    invoiceDateFrom: invoiceDateFrom || undefined,
    invoiceDateTo: invoiceDateTo || undefined,
    tipo: tipo || undefined,
    caso: caso || undefined,
    clientId: clientId || undefined,
    projectId: projectId || undefined,
    provider: provider || undefined,
    page,
    limit: 10,
  })

  // Opciones desde server action (sin depender del filtrado actual)
  const tiposOptions = data.tipoOptions
  const casosOptions = data.casoOptions
  const projects = data.projects
  const providerOptions = data.providerOptions

  // Si admin, cargar lista de clientes vía server action
  const clients = await (async () => {
    if (user.role !== 'admin') return [] as { id: string; name: string }[]
    try {
      const res = await getClients({ limit: 1000, role: 'user' })
      if (!res.success || !res.data) return []
      return res.data.clients.map((c: any) => ({ id: String(c.id), name: c.name || c.email }))
    } catch {
      return [] as { id: string; name: string }[]
    }
  })()

  return (
    <div className='p-4 space-y-6'>
      <div className='flex items-center justify-between'>
        <h1 className='text-xl font-semibold'>{t('title')}</h1>
        <div className='flex gap-2'>
          <form action='/api/analytics/export' method='POST' className='inline'>
            <input type='hidden' name='documentIds' value={JSON.stringify(data.allDocumentIds)} />
            <input type='hidden' name='format' value='csv' />
            <Button type='submit' variant='outline'>
              Descargar CSV
            </Button>
          </form>
          <form action='/api/analytics/export' method='POST' className='inline'>
            <input type='hidden' name='documentIds' value={JSON.stringify(data.allDocumentIds)} />
            <input type='hidden' name='format' value='xlsx' />
            <Button type='submit'>{t('download')}</Button>
          </form>
        </div>
      </div>

      {/* Selector de cliente (solo admin) */}

      {user.role === 'admin' && (
        <Card>
          <CardHeader>
            <CardTitle>{t('client')}</CardTitle>
          </CardHeader>
          <CardContent>
            <AdminClientSelector clients={clients} value={clientId} />
          </CardContent>
        </Card>
      )}

      {/* Totales */}
      <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
        <Card>
          <CardHeader>
            <CardTitle>{t('accumulatedByType')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className='space-y-1'>
              {Object.entries(data.totalsByTipo).map(([k, v]) => (
                <li key={k} className='flex justify-between text-sm'>
                  <span>{k}</span>
                  <span>{v}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('accumulatedByCase')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className='space-y-1'>
              {Object.entries(data.totalsByCaso).map(([k, v]) => (
                <li key={k} className='flex justify-between text-sm'>
                  <span>{k}</span>
                  <span>{v}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('accumulatedByUnit')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className='space-y-1'>
              {Object.entries(data.totalsByUnit).map(([k, v]) => (
                <li key={k} className='flex justify-between text-sm'>
                  <span>{k}</span>
                  <span>{v}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>{t('filters')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Filters
            dateFrom={dateFrom}
            dateTo={dateTo}
            invoiceDateFrom={invoiceDateFrom}
            invoiceDateTo={invoiceDateTo}
            tipo={tipo}
            caso={caso}
            tiposOptions={tiposOptions}
            casosOptions={casosOptions}
            projects={projects}
            projectId={projectId}
            providerOptions={providerOptions}
            provider={provider}
          />
        </CardContent>
      </Card>

      {/* Tabla de documentos */}
      <Card>
        <CardHeader>
          <CardTitle>{t('title')} - Documentos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='overflow-x-auto'>
            <Table className='min-w-[820px]'>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Link
                      href={`/analytics?${(() => {
                        const p = new URLSearchParams()
                        Object.entries(searchParams || {}).forEach(([k, v]) => {
                          if (k !== 'sort' && typeof v === 'string' && v) p.set(k, v)
                        })
                        const next = sort === 'title' ? '-title' : 'title'
                        p.set('sort', next)
                        return p.toString()
                      })()}`}
                      className='inline-flex items-center gap-1'
                    >
                      Título{' '}
                      {sort === 'title' ? (
                        <IconArrowUp className='h-3 w-3' />
                      ) : sort === '-title' ? (
                        <IconArrowDown className='h-3 w-3' />
                      ) : null}
                    </Link>
                  </TableHead>
                  <TableHead>
                    <Link
                      href={`/analytics?${(() => {
                        const p = new URLSearchParams()
                        Object.entries(searchParams || {}).forEach(([k, v]) => {
                          if (k !== 'sort' && typeof v === 'string' && v) p.set(k, v)
                        })
                        const next = sort === 'tipo' ? '-tipo' : 'tipo'
                        p.set('sort', next)
                        return p.toString()
                      })()}`}
                      className='inline-flex items-center gap-1'
                    >
                      Tipo{' '}
                      {sort === 'tipo' ? (
                        <IconArrowUp className='h-3 w-3' />
                      ) : sort === '-tipo' ? (
                        <IconArrowDown className='h-3 w-3' />
                      ) : null}
                    </Link>
                  </TableHead>
                  <TableHead>
                    <Link
                      href={`/analytics?${(() => {
                        const p = new URLSearchParams()
                        Object.entries(searchParams || {}).forEach(([k, v]) => {
                          if (k !== 'sort' && typeof v === 'string' && v) p.set(k, v)
                        })
                        const next = sort === 'caso' ? '-caso' : 'caso'
                        p.set('sort', next)
                        return p.toString()
                      })()}`}
                      className='inline-flex items-center gap-1'
                    >
                      Caso{' '}
                      {sort === 'caso' ? (
                        <IconArrowUp className='h-3 w-3' />
                      ) : sort === '-caso' ? (
                        <IconArrowDown className='h-3 w-3' />
                      ) : null}
                    </Link>
                  </TableHead>
                  <TableHead>
                    <Link
                      href={`/analytics?${(() => {
                        const p = new URLSearchParams()
                        Object.entries(searchParams || {}).forEach(([k, v]) => {
                          if (k !== 'sort' && typeof v === 'string' && v) p.set(k, v)
                        })
                        const next = sort === 'providerName' ? '-providerName' : 'providerName'
                        p.set('sort', next)
                        return p.toString()
                      })()}`}
                      className='inline-flex items-center gap-1'
                    >
                      Proveedor{' '}
                      {sort === 'providerName' ? (
                        <IconArrowUp className='h-3 w-3' />
                      ) : sort === '-providerName' ? (
                        <IconArrowDown className='h-3 w-3' />
                      ) : null}
                    </Link>
                  </TableHead>
                  <TableHead>
                    <Link
                      href={`/analytics?${(() => {
                        const p = new URLSearchParams()
                        Object.entries(searchParams || {}).forEach(([k, v]) => {
                          if (k !== 'sort' && typeof v === 'string' && v) p.set(k, v)
                        })
                        const next = sort === 'createdAt' ? '-createdAt' : 'createdAt'
                        p.set('sort', next)
                        return p.toString()
                      })()}`}
                      className='inline-flex items-center gap-1'
                    >
                      Fecha subida{' '}
                      {sort === 'createdAt' ? (
                        <IconArrowUp className='h-3 w-3' />
                      ) : sort === '-createdAt' ? (
                        <IconArrowDown className='h-3 w-3' />
                      ) : null}
                    </Link>
                  </TableHead>
                  <TableHead>
                    <Link
                      href={`/analytics?${(() => {
                        const p = new URLSearchParams()
                        Object.entries(searchParams || {}).forEach(([k, v]) => {
                          if (k !== 'sort' && typeof v === 'string' && v) p.set(k, v)
                        })
                        const next = sort === 'invoiceDate' ? '-invoiceDate' : 'invoiceDate'
                        p.set('sort', next)
                        return p.toString()
                      })()}`}
                      className='inline-flex items-center gap-1'
                    >
                      Fecha factura{' '}
                      {sort === 'invoiceDate' ? (
                        <IconArrowUp className='h-3 w-3' />
                      ) : sort === '-invoiceDate' ? (
                        <IconArrowDown className='h-3 w-3' />
                      ) : null}
                    </Link>
                  </TableHead>
                  <TableHead>
                    <Link
                      href={`/analytics?${(() => {
                        const p = new URLSearchParams()
                        Object.entries(searchParams || {}).forEach(([k, v]) => {
                          if (k !== 'sort' && typeof v === 'string' && v) p.set(k, v)
                        })
                        const next = sort === 'confidence' ? '-confidence' : 'confidence'
                        p.set('sort', next)
                        return p.toString()
                      })()}`}
                      className='inline-flex items-center gap-1'
                    >
                      Confianza{' '}
                      {sort === 'confidence' ? (
                        <IconArrowUp className='h-3 w-3' />
                      ) : sort === '-confidence' ? (
                        <IconArrowDown className='h-3 w-3' />
                      ) : null}
                    </Link>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(() => {
                  const docs = [...data.documents]
                  const desc = sort.startsWith('-')
                  const key = desc ? sort.slice(1) : sort
                  const ord = desc ? -1 : 1
                  const confidenceOrder: Record<string, number> = {
                    empty: 0,
                    needs_revision: 1,
                    trusted: 2,
                    verified: 3,
                    wrong_document: 4,
                  }
                  docs.sort((a: any, b: any) => {
                    if (!key) return 0
                    let va: any = (a as any)[key]
                    let vb: any = (b as any)[key]
                    if (key === 'createdAt' || key === 'invoiceDate') {
                      va = va ? new Date(va).getTime() : 0
                      vb = vb ? new Date(vb).getTime() : 0
                    } else if (key === 'confidence') {
                      va = confidenceOrder[String(va) as keyof typeof confidenceOrder] ?? -1
                      vb = confidenceOrder[String(vb) as keyof typeof confidenceOrder] ?? -1
                    } else {
                      va = typeof va === 'string' ? va.toLowerCase() : (va ?? '')
                      vb = typeof vb === 'string' ? vb.toLowerCase() : (vb ?? '')
                    }
                    if (va < vb) return -1 * ord
                    if (va > vb) return 1 * ord
                    return 0
                  })
                  return docs
                })().map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className='max-w-[320px] truncate'>
                      <Link
                        href={`/projects/${encodeURIComponent(d.projectId || '')}/resource/${encodeURIComponent(d.id)}`}
                        className='text-primary hover:underline'
                        target='_blank'
                        rel='noopener noreferrer'
                      >
                        {d.title}
                      </Link>
                    </TableCell>
                    <TableCell>{d.tipo || ''}</TableCell>
                    <TableCell>{d.caso || ''}</TableCell>
                    <TableCell>{d.providerName || ''}</TableCell>
                    <TableCell>
                      {new Date(d.createdAt as any).toLocaleDateString('es-ES')}
                    </TableCell>
                    <TableCell>{d.invoiceDate || ''}</TableCell>
                    <TableCell>
                      <ConfidenceBadgeSimple
                        confidence={
                          (d as any).documentoErroneo
                            ? 'wrong_document'
                            : ((d as any).confidence as any)
                        }
                        size='sm'
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {/* Paginación simple via query param */}
          <div className='flex items-center justify-end gap-2 mt-4'>
            <Link
              href={`/analytics?${(() => {
                const p = new URLSearchParams()
                Object.entries(searchParams || {}).forEach(([k, v]) => {
                  if (k !== 'page' && typeof v === 'string' && v) p.set(k, v)
                })
                const prev = Math.max(1, Number((data as any).page) - 1)
                p.set('page', String(prev))
                return p.toString()
              })()}`}
              className='inline-flex'
            >
              <Button variant='outline' size='icon' disabled={(data as any).page <= 1}>
                <IconChevronLeft className='h-4 w-4' />
              </Button>
            </Link>
            <span className='text-sm'>
              Página {(data as any).page} de {(data as any).totalPages || 1}
            </span>
            <Link
              href={`/analytics?${(() => {
                const p = new URLSearchParams()
                Object.entries(searchParams || {}).forEach(([k, v]) => {
                  if (k !== 'page' && typeof v === 'string' && v) p.set(k, v)
                })
                const next = Math.min(
                  Number((data as any).totalPages || 1),
                  Number((data as any).page || 1) + 1,
                )
                p.set('page', String(next))
                return p.toString()
              })()}`}
              className='inline-flex'
            >
              <Button
                variant='outline'
                size='icon'
                disabled={(data as any).page >= ((data as any).totalPages || 1)}
              >
                <IconChevronRight className='h-4 w-4' />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
