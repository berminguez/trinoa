'use client'
import * as React from 'react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { IconAlertTriangle } from '@tabler/icons-react'

export default function ConfirmBeforeDownload({
  ids,
  format,
  label,
  variant,
  transposed,
}: {
  ids: string[]
  format: 'csv' | 'xlsx' | 'xls' | 'excel'
  label: React.ReactNode
  variant?: 'outline' | 'default' | 'secondary' | 'destructive' | null
  transposed?: boolean
}) {
  const formRef = React.useRef<HTMLFormElement>(null)
  const [open, setOpen] = React.useState(false)
  const [needsCount, setNeedsCount] = React.useState<number>(0)

  const onClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    try {
      const fd = new FormData()
      fd.set('documentIds', JSON.stringify(ids || []))
      const res = await fetch('/api/analytics/check-needs-review', {
        method: 'POST',
        body: fd,
      })
      const json = await res.json()
      const count = Number(json?.needsReviewCount || 0)
      if (count > 0) {
        setNeedsCount(count)
        setOpen(true)
        return
      }
      formRef.current?.submit()
    } catch (_err) {
      // En caso de error en el check, permitir la descarga para no bloquear al usuario
      formRef.current?.submit()
    }
  }

  return (
    <>
      <form
        ref={formRef}
        action={transposed ? '/api/analytics/export-transposed' : '/api/analytics/export'}
        method='POST'
        className='inline'
      >
        <input type='hidden' name='documentIds' value={JSON.stringify(ids || [])} />
        <input type='hidden' name='format' value={format} />
        <Button type='button' variant={variant as any} onClick={onClick}>
          {label}
        </Button>
      </form>

      <AlertDialog open={open} onOpenChange={(v) => setOpen(v)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='flex items-center gap-2'>
              <IconAlertTriangle className='h-5 w-5 text-amber-500' />
              Documentos requieren revisión
            </AlertDialogTitle>
            <AlertDialogDescription>
              {`Hay ${needsCount} documento(s) con estado "necesita revisión".`}
              <br />
              Si continúas, se exportarán igualmente. Te recomendamos revisar esos documentos antes
              de compartir el archivo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setOpen(false)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setOpen(false)
                setTimeout(() => formRef.current?.submit(), 0)
              }}
            >
              Descargar de todos modos
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
