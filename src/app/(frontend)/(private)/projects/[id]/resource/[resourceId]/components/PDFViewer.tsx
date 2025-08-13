'use client'

import { useEffect, useRef, useState } from 'react'
import { Document, Page } from 'react-pdf'
import ensurePdfWorker from '@/lib/pdf'
import { Button } from '@/components/ui/button'
import useVisualizadorStore from '@/stores/visualizador-store'
import {
  IconZoomIn,
  IconZoomOut,
  IconDownload,
  IconChevronLeft,
  IconChevronRight,
  IconMaximize,
} from '@tabler/icons-react'

interface PDFViewerProps {
  url: string
  filename?: string | null
}

export default function PDFViewer({ url, filename }: PDFViewerProps) {
  const isProcessing = useVisualizadorStore((s) => s.isProcessing)
  const [numPages, setNumPages] = useState<number>(0)
  const [page, setPage] = useState<number>(1)
  const [scale, setScale] = useState<number>(1.0)
  const [loadError, setLoadError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState<number>(800)
  const [fileData, setFileData] = useState<Uint8Array | null>(null)
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    ensurePdfWorker()
  }, [])

  // Prefetch del PDF como ArrayBuffer para evitar problemas de CORS/range requests
  useEffect(() => {
    let aborted = false
    setFileData(null)
    // Revocar blob anterior si existe
    setBlobUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
    setLoadError(null)
    ;(async () => {
      try {
        const res = await fetch(url, { method: 'GET', credentials: 'omit', mode: 'cors' })
        if (!res.ok) throw new Error(`HTTP ${res.status} al descargar PDF`)
        const buf = await res.arrayBuffer()
        if (!aborted) {
          const uint = new Uint8Array(buf)
          setFileData(uint)
          const blob = new Blob([uint], { type: 'application/pdf' })
          const objectUrl = URL.createObjectURL(blob)
          setBlobUrl(objectUrl)
        }
      } catch (e) {
        console.error('Error predescargando PDF:', e)
        if (!aborted) setLoadError(String((e as any)?.message || e))
      }
    })()
    return () => {
      aborted = true
      setBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return null
      })
    }
  }, [url])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      const width = Math.max(320, el.clientWidth - 16)
      setContainerWidth(width)
    })
    ro.observe(el)
    const width = Math.max(320, el.clientWidth - 16)
    setContainerWidth(width)
    return () => ro.disconnect()
  }, [])

  // Ancho dinámico basado en el contenedor y el zoom. Permitimos que exceda el contenedor para scroll.
  const pageWidth = Math.max(280, Math.round(containerWidth * scale))

  const handleZoomIn = () => setScale((s) => Math.min(3, Math.round((s + 0.1) * 10) / 10))
  const handleZoomOut = () => setScale((s) => Math.max(0.5, Math.round((s - 0.1) * 10) / 10))
  const handleFitWidth = () => setScale(1)
  const handlePrev = () => setPage((p) => Math.max(1, p - 1))
  const handleNext = () => setPage((p) => Math.min(numPages || 1, p + 1))
  const handleDownload = () => {
    try {
      const href = blobUrl || url
      const a = document.createElement('a')
      a.href = href
      const defaultName = filename || 'documento.pdf'
      a.download = defaultName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch (e) {
      console.error('Error al descargar PDF:', e)
    }
  }

  return (
    <div className='flex h-full w-full'>
      <div
        ref={containerRef}
        className='flex h-full w-full min-w-0 max-w-full flex-col overflow-hidden'
      >
        <div className='sticky top-0 z-10 w-full bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b shrink-0'>
          <div className='flex items-center gap-2 px-3 py-2'>
            <Button variant='outline' size='sm' onClick={handlePrev} disabled={page <= 1}>
              <IconChevronLeft className='h-4 w-4' />
            </Button>
            <span className='text-xs text-muted-foreground'>
              {page} / {numPages || '—'}
            </span>
            <Button
              variant='outline'
              size='sm'
              onClick={handleNext}
              disabled={numPages === 0 || page >= numPages}
            >
              <IconChevronRight className='h-4 w-4' />
            </Button>
            <div className='mx-2 h-4 w-px bg-border' />
            <Button variant='outline' size='sm' onClick={handleZoomOut}>
              <IconZoomOut className='h-4 w-4' />
            </Button>
            <span className='text-xs w-12 text-center'>{Math.round(scale * 100)}%</span>
            <Button variant='outline' size='sm' onClick={handleZoomIn}>
              <IconZoomIn className='h-4 w-4' />
            </Button>
            <Button variant='outline' size='sm' onClick={handleFitWidth}>
              <IconMaximize className='h-4 w-4' />
            </Button>
            <div className='mx-2 h-4 w-px bg-border' />
            <Button
              variant='default'
              size='sm'
              onClick={handleDownload}
              disabled={!blobUrl && !url}
            >
              <IconDownload className='h-4 w-4' />
            </Button>
          </div>
        </div>
        <div
          ref={scrollRef}
          className='flex-1 min-h-0 flex justify-center p-4 min-w-0 max-w-full overflow-auto select-text'
        >
          {loadError ? (
            <div className='flex h-full w-full flex-col items-center justify-center gap-2 text-xs text-muted-foreground max-w-full'>
              <span>Fallo al cargar PDF. Intentando visor alternativo…</span>
              <iframe
                src={url}
                className='w-full h-[600px] max-w-full rounded border'
                style={{ display: 'block', width: '100%', maxWidth: '100%' }}
              />
            </div>
          ) : !blobUrl ? (
            <div className='text-xs text-muted-foreground'>Cargando PDF…</div>
          ) : (
            <Document
              file={blobUrl as string}
              onLoadSuccess={(info) => setNumPages(info.numPages)}
              onLoadError={(e) => {
                console.error('react-pdf onLoadError:', e)
                setLoadError(String((e as any)?.message || e))
              }}
              loading={<div className='text-xs text-muted-foreground'>Cargando PDF…</div>}
              className='max-w-full'
            >
              <Page
                pageNumber={page}
                width={pageWidth}
                renderAnnotationLayer
                renderTextLayer
                className='block'
              />
            </Document>
          )}
          {isProcessing ? (
            <div className='pointer-events-none absolute inset-0 z-20 flex items-start justify-center'>
              <div className='mt-16 h-1 w-full max-w-[1200px] overflow-hidden bg-black/5'>
                <div className='h-full w-40 animate-[scan_1.2s_linear_infinite] bg-primary/60' />
              </div>
              <style jsx>{`
                @keyframes scan {
                  0% {
                    transform: translateX(-25%);
                  }
                  100% {
                    transform: translateX(125%);
                  }
                }
              `}</style>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
