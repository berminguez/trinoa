// ============================================================================
// TRINOA - DOCUMENT UPLOADER (List View)
// ============================================================================

'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  IconAlertCircle,
  IconCheck,
  IconFileText,
  IconLoader2,
  IconPhoto,
  IconTrash,
} from '@tabler/icons-react'
import type { UploadFile } from '@/hooks/useProjectUpload'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

interface DocumentUploaderProps {
  files: UploadFile[]
  isUploading?: boolean
  onRemove?: (fileId: string) => void
  estimatePages?: boolean
  onToggleMultiInvoice?: (fileId: string, value: boolean) => void
  showHeader?: boolean
}

// Estimación de páginas para PDFs (mejor esfuerzo). Si falla, se omite sin romper la UI.
async function estimatePdfPages(file: File): Promise<number | null> {
  try {
    const { getDocument } = await import('pdfjs-dist')
    const buffer = await file.arrayBuffer()
    const task = getDocument({ data: buffer })
    const doc = await task.promise
    const num = doc.numPages
    await doc.destroy()
    return typeof num === 'number' && num > 0 ? num : null
  } catch {
    return null
  }
}

export function DocumentUploader({
  files,
  isUploading = false,
  onRemove,
  estimatePages = true,
  onToggleMultiInvoice,
  showHeader = true,
}: DocumentUploaderProps) {
  const [pagesById, setPagesById] = useState<Record<string, number | null>>({})

  const pdfFilesNeedingEstimate = useMemo(
    () =>
      files.filter(
        (f) =>
          f.type?.includes('pdf') &&
          (typeof f.pages !== 'number' || f.pages <= 0) &&
          pagesById[f.id] === undefined,
      ),
    [files, pagesById],
  )

  useEffect(() => {
    if (!estimatePages) return
    if (pdfFilesNeedingEstimate.length === 0) return

    let isCancelled = false

    ;(async () => {
      for (const f of pdfFilesNeedingEstimate) {
        const original = (f as any)._originalFile as File | undefined
        const fileToRead = original || (f as unknown as File)
        const pages = await estimatePdfPages(fileToRead).catch(() => null)
        if (!isCancelled) {
          setPagesById((prev) => ({ ...prev, [f.id]: pages }))
        }
      }
    })()

    return () => {
      isCancelled = true
    }
  }, [estimatePages, pdfFilesNeedingEstimate])

  if (!files || files.length === 0) return null

  return (
    <div className='space-y-2'>
      {showHeader && (
        <div className='flex items-center justify-between'>
          <h4 className='text-sm font-medium'>Archivos seleccionados ({files.length})</h4>
        </div>
      )}

      <div className='max-h-48 overflow-y-auto space-y-2'>
        {files.map((file) => {
          const isPdf = file.type?.includes('pdf')
          const pagesValue =
            typeof file.pages === 'number' && file.pages > 0 ? file.pages : pagesById[file.id]

          return (
            <div
              key={file.id}
              className={`flex items-center justify-between p-3 rounded-lg ${
                file.status === 'error' ? 'bg-red-50 border border-red-200' : 'bg-muted/50'
              }`}
            >
              <div className='flex items-center gap-3 flex-1 min-w-0'>
                {file.status === 'validating' ? (
                  <IconLoader2 className='h-5 w-5 text-blue-500 flex-shrink-0 animate-spin' />
                ) : file.status === 'uploading' ? (
                  <IconLoader2 className='h-5 w-5 text-orange-500 flex-shrink-0 animate-spin' />
                ) : file.status === 'error' ? (
                  <IconAlertCircle className='h-5 w-5 text-red-500 flex-shrink-0' />
                ) : file.validationComplete ? (
                  <IconCheck className='h-5 w-5 text-green-500 flex-shrink-0' />
                ) : isPdf ? (
                  <IconFileText className='h-5 w-5 text-primary flex-shrink-0' />
                ) : (
                  <IconPhoto className='h-5 w-5 text-primary flex-shrink-0' />
                )}

                <div className='flex-1 min-w-0'>
                  <p className='text-sm font-medium truncate flex items-center gap-2'>
                    {file.name}
                    {file.isMultiInvoice && <Badge variant='outline'>Multi‑factura</Badge>}
                  </p>
                  <div className='text-xs text-muted-foreground space-y-1'>
                    <p>{(file.size / (1024 * 1024)).toFixed(1)} MB</p>
                    {isPdf && (
                      <p>
                        Páginas:{' '}
                        {pagesValue === undefined
                          ? 'estimando…'
                          : pagesValue === null
                            ? '—'
                            : pagesValue}
                      </p>
                    )}
                    {/* Switch por archivo: Documento con varias facturas */}
                    {isPdf && (
                      <div className='flex items-center gap-2'>
                        <Switch
                          id={`multi-${file.id}`}
                          checked={!!file.isMultiInvoice}
                          onCheckedChange={(val) => onToggleMultiInvoice?.(file.id, !!val)}
                          disabled={file.status !== 'pending'}
                        />
                        <Label htmlFor={`multi-${file.id}`}>Documento con varias facturas</Label>
                      </div>
                    )}
                    {file.status === 'uploading' && (
                      <div className='space-y-1'>
                        <p className='text-orange-600'>
                          {file.isMultiInvoice
                            ? `Procesando división… ${file.progress}%`
                            : `Subiendo… ${file.progress}%`}
                        </p>
                        <Progress value={file.progress} className='h-1' />
                      </div>
                    )}
                    {file.status === 'error' && file.error && (
                      <p className='text-red-600'>{file.error}</p>
                    )}
                  </div>
                </div>
              </div>

              {!isUploading && onRemove && (
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => onRemove(file.id)}
                  className='h-8 w-8 p-0 text-muted-foreground hover:text-red-600'
                  disabled={file.status === 'uploading'}
                >
                  <IconTrash className='h-4 w-4' />
                </Button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
