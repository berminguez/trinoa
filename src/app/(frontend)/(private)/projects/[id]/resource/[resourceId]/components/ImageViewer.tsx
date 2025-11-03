'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import useVisualizadorStore from '@/stores/visualizador-store'
import { MediaPasswordDialog } from '@/components/MediaPasswordDialog'
import { toast } from 'sonner'

interface ImageViewerProps {
  url: string
  alt?: string
}

export default function ImageViewer({ url, alt = 'Imagen' }: ImageViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const isProcessing = useVisualizadorStore((s) => s.isProcessing)
  
  // Estado para manejo de contraseña
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [authenticatedUrl, setAuthenticatedUrl] = useState<string | null>(null)
  const [password, setPassword] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Obtener contraseña guardada del sessionStorage
  useEffect(() => {
    const savedPassword = sessionStorage.getItem('media-password')
    if (savedPassword) {
      setPassword(savedPassword)
    }
  }, [])

  // Intentar cargar la imagen con autenticación
  useEffect(() => {
    let cancelled = false

    const loadImage = async () => {
      setIsLoading(true)
      
      try {
        // Intentar sin contraseña primero (usuario podría estar logueado)
        let response = await fetch(url, { credentials: 'include' })

        // Si falla con 401 y tenemos contraseña, intentar con ella
        if (!response.ok && response.status === 401 && password) {
          const credentials = btoa(`:${password}`)
          response = await fetch(url, {
            credentials: 'include',
            headers: {
              Authorization: `Basic ${credentials}`,
            },
          })
        }

        if (response.ok) {
          const blob = await response.blob()
          const objectUrl = URL.createObjectURL(blob)
          if (!cancelled) {
            setAuthenticatedUrl(objectUrl)
            setShowPasswordDialog(false)
            setIsLoading(false)
          }
        } else if (response.status === 401) {
          // Necesita contraseña
          if (!cancelled) {
            setShowPasswordDialog(true)
            setIsLoading(false)
          }
        } else {
          if (!cancelled) {
            toast.error('Error al cargar la imagen')
            setIsLoading(false)
          }
        }
      } catch (error) {
        console.error('Error loading image:', error)
        if (!cancelled) {
          toast.error('Error de conexión al cargar la imagen')
          setIsLoading(false)
        }
      }
    }

    loadImage()

    return () => {
      cancelled = true
      if (authenticatedUrl) {
        URL.revokeObjectURL(authenticatedUrl)
      }
    }
  }, [url, password])

  const handlePasswordSubmit = async (submittedPassword: string) => {
    setIsLoading(true)
    const credentials = btoa(`:${submittedPassword}`)

    try {
      const response = await fetch(url, {
        credentials: 'include',
        headers: {
          Authorization: `Basic ${credentials}`,
        },
      })

      if (response.ok) {
        const blob = await response.blob()
        const objectUrl = URL.createObjectURL(blob)
        setAuthenticatedUrl(objectUrl)
        setShowPasswordDialog(false)

        // Guardar contraseña para futuros accesos
        sessionStorage.setItem('media-password', submittedPassword)
        setPassword(submittedPassword)

        toast.success('Imagen desbloqueada correctamente')
      } else {
        toast.error('Contraseña incorrecta', {
          description: 'Por favor, verifica la contraseña e intenta de nuevo',
        })
      }
    } catch (error) {
      console.error('Error authenticating:', error)
      toast.error('Error al verificar la contraseña')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancelPassword = () => {
    setShowPasswordDialog(false)
    toast.info('Acceso cancelado')
  }

  // La barra de escaneo se ancla al contenedor visible, no al contenido.
  const displayUrl = authenticatedUrl || url

  return (
    <div className='flex h-full w-full flex-col'>
      <div className='flex items-center gap-2 border-b px-2 py-2'>
        <Button
          variant='outline'
          size='sm'
          onClick={() => setScale((s) => Math.max(0.25, s - 0.1))}
        >
          -
        </Button>
        <span className='text-xs'>{Math.round(scale * 100)}%</span>
        <Button variant='outline' size='sm' onClick={() => setScale((s) => Math.min(4, s + 0.1))}>
          +
        </Button>
        <div className='ml-auto text-xs text-muted-foreground truncate max-w-[40%]' title={url}>
          {url}
        </div>
      </div>
      <div
        ref={containerRef}
        className='relative flex flex-1 items-center justify-center overflow-auto p-4'
      >
        {isLoading ? (
          <div className='text-sm text-muted-foreground'>Cargando imagen...</div>
        ) : authenticatedUrl ? (
          <div style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }}>
            <Image
              src={displayUrl}
              alt={alt}
              width={1200}
              height={800}
              className='max-h-[80vh] w-auto rounded-md shadow'
              unoptimized
            />
          </div>
        ) : null}
        {isProcessing ? (
          <div className='pointer-events-none absolute inset-0 z-20 overflow-hidden'>
            <div
              className='absolute left-0 right-0 h-12'
              style={{ top: '-3rem', animation: 'vertical-scan 1.1s linear infinite' }}
            >
              <div className='h-full w-full bg-gradient-to-b from-transparent via-primary/50 to-transparent' />
            </div>
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
        ) : null}
      </div>
      
      {/* Diálogo de contraseña */}
      <MediaPasswordDialog
        open={showPasswordDialog}
        onPasswordSubmit={handlePasswordSubmit}
        onCancel={handleCancelPassword}
        fileName={alt || 'imagen'}
      />
    </div>
  )
}
