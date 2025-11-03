'use client'

import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import { useEffect, useRef, useState } from 'react'
import { Document, Page } from 'react-pdf'
import ensurePdfWorker from '@/lib/pdf'
import { Button } from '@/components/ui/button'
import useVisualizadorStore from '@/stores/visualizador-store'
import { MediaPasswordDialog } from '@/components/MediaPasswordDialog'
import { toast } from 'sonner'
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
  
  // Estado para manejo de contraseña
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [password, setPassword] = useState<string | null>(null)
  const [isLoadingWithPassword, setIsLoadingWithPassword] = useState(false)

  useEffect(() => {
    ensurePdfWorker()
  }, [])

  // Obtener contraseña guardada del sessionStorage
  useEffect(() => {
    const savedPassword = sessionStorage.getItem('media-password')
    if (savedPassword) {
      setPassword(savedPassword)
    }
  }, [])

  // Prefetch del PDF con manejo de autenticación
  useEffect(() => {
    let aborted = false
    setFileData(null)
    // Revocar blob anterior si existe
    setBlobUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
    setLoadError(null)
    setIsLoadingWithPassword(true)
    
    ;(async () => {
      try {
        // Intentar cargar sin contraseña primero (usuario podría estar logueado)
        let res = await fetch(url, { method: 'GET', credentials: 'include', mode: 'cors' })
        
        // Si falla con 401 y tenemos contraseña, intentar con ella
        if (!res.ok && res.status === 401 && password) {
          const credentials = btoa(`:${password}`)
          res = await fetch(url, {
            method: 'GET',
            credentials: 'include',
            mode: 'cors',
            headers: {
              Authorization: `Basic ${credentials}`,
            },
          })
        }
        
        if (!res.ok) {
          if (res.status === 401) {
            // Necesita contraseña - mostrar diálogo
            if (!aborted) {
              setShowPasswordDialog(true)
              setIsLoadingWithPassword(false)
            }
            return
          }
          throw new Error(`HTTP ${res.status} al descargar PDF`)
        }
        
        const buf = await res.arrayBuffer()
        if (!aborted) {
          const uint = new Uint8Array(buf)
          setFileData(uint)
          const blob = new Blob([uint], { type: 'application/pdf' })
          const objectUrl = URL.createObjectURL(blob)
          setBlobUrl(objectUrl)
          setIsLoadingWithPassword(false)
        }
      } catch (e) {
        console.error('Error predescargando PDF:', e)
        if (!aborted) {
          setLoadError(String((e as any)?.message || e))
          setIsLoadingWithPassword(false)
        }
      }
    })()
    return () => {
      aborted = true
      setBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return null
      })
    }
  }, [url, password])

  const handlePasswordSubmit = async (submittedPassword: string) => {
    setIsLoadingWithPassword(true)
    const credentials = btoa(`:${submittedPassword}`)

    try {
      const res = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        mode: 'cors',
        headers: {
          Authorization: `Basic ${credentials}`,
        },
      })

      if (res.ok) {
        const buf = await res.arrayBuffer()
        const uint = new Uint8Array(buf)
        setFileData(uint)
        const blob = new Blob([uint], { type: 'application/pdf' })
        const objectUrl = URL.createObjectURL(blob)
        setBlobUrl(objectUrl)
        setShowPasswordDialog(false)

        // Guardar contraseña para futuros accesos
        sessionStorage.setItem('media-password', submittedPassword)
        setPassword(submittedPassword)

        toast.success('PDF desbloqueado correctamente')
        setIsLoadingWithPassword(false)
      } else {
        toast.error('Contraseña incorrecta', {
          description: 'Por favor, verifica la contraseña e intenta de nuevo',
        })
        setIsLoadingWithPassword(false)
      }
    } catch (error) {
      console.error('Error authenticating:', error)
      toast.error('Error al verificar la contraseña')
      setIsLoadingWithPassword(false)
    }
  }

  const handleCancelPassword = () => {
    setShowPasswordDialog(false)
    toast.info('Acceso cancelado')
  }

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

  // La barra de escaneo se ancla al contenedor visible (scrollRef), no al contenido.

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
          className='relative flex-1 min-h-0 flex justify-center p-4 min-w-0 max-w-full overflow-auto select-text'
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
            <div className='pointer-events-none absolute inset-0 z-20 overflow-hidden'>
              <div
                className='absolute left-0 right-0 h-12'
                style={{ top: '-3rem', animation: 'vertical-scan 1.1s linear infinite' }}
              >
                <div className='h-full w-full bg-gradient-to-b from-transparent via-primary/50 to-transparent' />
              </div>
            </div>
          ) : null}
          <style jsx>{`
            @keyframes vertical-scan {
              0% {
                top: -3rem;
              }
              100% {
                top: calc(100% + 3rem);
              }
            }
          `}</style>
        </div>
      </div>
      
      {/* Diálogo de contraseña */}
      <MediaPasswordDialog
        open={showPasswordDialog}
        onPasswordSubmit={handlePasswordSubmit}
        onCancel={handleCancelPassword}
        fileName={filename || 'documento.pdf'}
      />
    </div>
  )
}
