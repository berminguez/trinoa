'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import useVisualizadorStore from '@/stores/visualizador-store'

interface ImageViewerProps {
  url: string
  alt?: string
}

export default function ImageViewer({ url, alt = 'Imagen' }: ImageViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  const isProcessing = useVisualizadorStore((s) => s.isProcessing)
  // La barra de escaneo se ancla al contenedor visible, no al contenido.

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
        <div style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }}>
          <Image
            src={url}
            alt={alt}
            width={1200}
            height={800}
            className='max-h-[80vh] w-auto rounded-md shadow'
          />
        </div>
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
    </div>
  )
}
