'use client'

import { useEffect, useRef, useState } from 'react'
import { Document, Page } from 'react-pdf'
import ensurePdfWorker from '@/lib/pdf'
import { Button } from '@/components/ui/button'

interface PDFViewerProps {
  url: string
}

export default function PDFViewer({ url }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0)
  const [page, setPage] = useState<number>(1)
  const [scale, setScale] = useState<number>(1.0)
  const [loadError, setLoadError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState<number>(800)
  const [fileData, setFileData] = useState<Uint8Array | null>(null)
  const [blobUrl, setBlobUrl] = useState<string | null>(null)

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

  // Ajustar el ancho máximo basado en el contenedor y escala
  const maxWidth = Math.max(280, containerWidth - 32) // padding considerado
  const pageWidth = Math.min(maxWidth, Math.max(280, Math.round(containerWidth * scale)))

  return (
    <div className='flex'>
      <div ref={containerRef} className='flex-1 overflow-auto min-w-0 max-w-full'>
        <div className='flex justify-center p-4 min-w-0 max-w-full min-h-full'>
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
                renderAnnotationLayer={false}
                renderTextLayer={false}
                className='max-w-full block'
              />
            </Document>
          )}
        </div>
      </div>
    </div>
  )
}
