'use client'
import * as React from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

export default function UploadProcessedDialog({ ids }: { ids: string[] }) {
  const [open, setOpen] = React.useState(false)
  const [file, setFile] = React.useState<File | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const parseFileToIds = async (file: File): Promise<string[]> => {
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (ext === 'csv') {
      const text = await file.text()
      return text
        .split(/\r?\n/)
        .map((l) => l.split(',')[0]?.trim())
        .filter(Boolean)
    } else if (ext === 'xlsx' || ext === 'xls') {
      const XLSX = await import('xlsx')
      const ab = await file.arrayBuffer()
      const wb = XLSX.read(ab, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const aoa = XLSX.utils.sheet_to_json<string[]>({ ...ws } as any, { header: 1 }) as any[]
      return (aoa || []).map((r: any[]) => String(r?.[0] || '').trim()).filter(Boolean)
    }
    return []
  }

  const onUpload = async () => {
    setError(null)
    if (!file) return
    setLoading(true)
    try {
      const uploadIds = await parseFileToIds(file)
      const fd = new FormData()
      fd.set('documentIds', JSON.stringify(uploadIds))
      const res = await fetch('/api/analytics/mark-processed', { method: 'POST', body: fd })
      if (!res.ok) throw new Error('upload_failed')
      toast.success('Procesados actualizados')
      setOpen(false)
      // Refrescar la tabla
      try {
        if (typeof window !== 'undefined') {
          const url = new URL(window.location.href)
          window.location.assign(url.toString())
        }
      } catch {}
    } catch (e: any) {
      setError('No se pudo procesar el fichero')
      toast.error('No se pudo procesar el fichero')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => setOpen(v)}>
      <DialogTrigger asChild>
        <Button variant='secondary'>Subir procesados</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Subir procesados</DialogTitle>
        </DialogHeader>
        <div className='space-y-2'>
          <Label>Fichero (CSV/XLSX/XLS). Primera columna: ID de documento</Label>
          <input
            type='file'
            accept='.csv,.xlsx,.xls'
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          {error ? <p className='text-sm text-red-600'>{error}</p> : null}
        </div>
        <div className='flex justify-end gap-2'>
          <Button variant='outline' onClick={() => setOpen(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={onUpload} disabled={!file || loading} aria-busy={loading}>
            {loading ? 'Procesando…' : 'Procesar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
