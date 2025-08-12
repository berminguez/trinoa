'use client'

import Image from 'next/image'
import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'

interface ImageViewerProps {
  url: string
  alt?: string
}

export default function ImageViewer({ url, alt = 'Imagen' }: ImageViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

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
      <div ref={containerRef} className='flex flex-1 items-center justify-center overflow-auto p-4'>
        <div style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }}>
          <Image
            src={url}
            alt={alt}
            width={1200}
            height={800}
            className='max-h-[80vh] w-auto rounded-md shadow'
          />
        </div>
      </div>
    </div>
  )
}
