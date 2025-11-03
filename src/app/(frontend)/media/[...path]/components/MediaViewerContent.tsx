'use client'

import { ProtectedMediaViewer } from '@/components/ProtectedMediaViewer'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { IconArrowLeft, IconDownload, IconFileDescription } from '@tabler/icons-react'
import Link from 'next/link'

interface MediaViewerContentProps {
  path: string[]
}

export default function MediaViewerContent({ path }: MediaViewerContentProps) {
  const mediaKey = path.join('/')
  const fileName = path[path.length - 1] || 'archivo'
  const fileExtension = fileName.split('.').pop()?.toLowerCase() || ''
  
  // Detectar tipo de archivo
  const isPdf = fileExtension === 'pdf'
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(fileExtension)
  const fileType = isPdf ? 'pdf' : isImage ? 'image' : 'auto'

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon">
              <IconArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <IconFileDescription className="h-6 w-6" />
              {fileName}
            </h1>
            <p className="text-sm text-muted-foreground">Archivo protegido</p>
          </div>
        </div>
      </div>

      {/* Visor de archivo */}
      <Card>
        <CardContent className="p-0">
          <ProtectedMediaViewer
            mediaKey={mediaKey}
            type={fileType}
            className="w-full h-[calc(100vh-200px)] rounded-lg"
          >
            {({ src, isLoading }) => (
              <div className="relative w-full h-[calc(100vh-200px)]">
                {isLoading || !src ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                      <p className="text-sm text-muted-foreground">Cargando archivo...</p>
                    </div>
                  </div>
                ) : isPdf ? (
                  <div className="w-full h-full flex flex-col">
                    <div className="flex items-center justify-between p-4 border-b bg-gray-50">
                      <span className="text-sm font-medium">{fileName}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const a = document.createElement('a')
                          a.href = src
                          a.download = fileName
                          a.click()
                        }}
                      >
                        <IconDownload className="h-4 w-4 mr-2" />
                        Descargar
                      </Button>
                    </div>
                    <iframe
                      src={src}
                      className="w-full flex-1"
                      title={fileName}
                    />
                  </div>
                ) : isImage ? (
                  <div className="w-full h-full flex items-center justify-center bg-gray-50 p-4">
                    <img
                      src={src}
                      alt={fileName}
                      className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <IconFileDescription className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-sm text-muted-foreground mb-4">
                        Vista previa no disponible para este tipo de archivo
                      </p>
                      <Button
                        onClick={() => {
                          const a = document.createElement('a')
                          a.href = src
                          a.download = fileName
                          a.click()
                        }}
                      >
                        <IconDownload className="h-4 w-4 mr-2" />
                        Descargar {fileName}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </ProtectedMediaViewer>
        </CardContent>
      </Card>

      {/* Información adicional */}
      <div className="mt-4 text-center text-sm text-muted-foreground">
        <p>
          ¿Necesitas ayuda? Contacta con el administrador si no tienes acceso a este archivo.
        </p>
      </div>
    </div>
  )
}

