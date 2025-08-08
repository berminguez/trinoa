'use client'

import { useState } from 'react'
import { useDropzone } from 'react-dropzone'
import {
  IconUpload,
  IconX,
  IconFileText,
  IconPhoto,
  IconTrash,
  IconLoader2,
  IconAlertCircle,
  IconCheck,
  IconLink,
  IconFile,
} from '@tabler/icons-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useProjectUpload, type UploadFile } from '@/hooks/useProjectUpload'
import { uploadFromUrls } from '@/actions/documents/uploadFromUrls'
import type { Project } from '@/payload-types'

interface DocumentUploadModalProps {
  project: Project
  trigger?: React.ReactNode
  onUploadComplete?: () => void
  onResourceUploaded?: (resource: any) => void
  onResourceUploadFailed?: (tempResourceId: string) => void
}

export function DocumentUploadModal({
  project,
  trigger,
  onUploadComplete,
  onResourceUploaded,
  onResourceUploadFailed,
}: DocumentUploadModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [uploadMethod, setUploadMethod] = useState<'files' | 'urls'>('files')
  const [urlsText, setUrlsText] = useState('')
  const [isUrlUploading, setIsUrlUploading] = useState(false)
  const [urlResults, setUrlResults] = useState<Array<{
    url: string
    success: boolean
    error?: string
  }> | null>(null)

  // Log del project recibido para debugging
  console.log('🏗️ [MODAL] Project data received:', {
    projectId: project.id,
    projectTitle: project.title,
    projectIdType: typeof project.id,
    projectCreatedBy: project.createdBy,
    projectObject: project,
  })

  // Usar el hook personalizado para manejar toda la lógica de upload
  const { files, isUploading, addFiles, removeFile, clearFiles, uploadFiles } = useProjectUpload({
    projectId: project.id,
    onUploadComplete: () => {
      if (onUploadComplete) {
        onUploadComplete()
      }
      // Auto-cerrar modal tras éxito total si no hay errores
      setTimeout(() => {
        const hasErrors = files.some((f) => f.status === 'error')
        if (!hasErrors) {
          clearFiles()
          setIsOpen(false)
        }
      }, 1500)
    },
    onResourceUploaded,
    onResourceUploadFailed,
  })

  // Configuración de react-dropzone
  const { getRootProps, getInputProps, isDragActive, isDragReject, fileRejections } = useDropzone({
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
    },
    multiple: true,
    maxSize: 100 * 1024 * 1024, // 100MB
    onDrop: addFiles, // Usar la función del hook
    disabled: isUploading,
  })

  const handleClose = () => {
    if (!isUploading && !isUrlUploading) {
      setIsOpen(false)
      clearFiles() // Usar la función del hook
      setUrlsText('')
      setUrlResults(null)

      // Reset states si es necesario
      console.log('🔒 [MODAL] Modal closed, states reset')
    }
  }

  const handleUrlUpload = async () => {
    if (!urlsText.trim()) return

    setIsUrlUploading(true)
    setUrlResults(null)

    try {
      const urls = urlsText
        .split('\n')
        .map((url) => url.trim())
        .filter((url) => url.length > 0)

      console.log('🔗 [MODAL] Uploading from URLs:', urls)

      const result = await uploadFromUrls({
        urls,
        projectId: project.id,
      })

      console.log('📊 [MODAL] URL upload result:', result)

      if (result.success && result.data) {
        setUrlResults(result.data)

        // Notificar recursos subidos exitosamente
        const successfulResources = result.data
          .filter((r) => r.success && r.resource)
          .map((r) => r.resource)

        successfulResources.forEach((resource) => {
          if (onResourceUploaded) {
            onResourceUploaded(resource)
          }
        })

        if (successfulResources.length > 0) {
          if (onUploadComplete) {
            onUploadComplete()
          }

          // Cerrar modal y limpiar después de subida exitosa
          setTimeout(() => {
            handleClose()
            // Limpiar URL text y resultados
            setUrlsText('')
            setUrlResults(null)
          }, 2000) // Esperar 2 segundos para mostrar resultados
        }
      } else {
        console.error('❌ [MODAL] URL upload failed:', result.error)
      }
    } catch (error) {
      console.error('❌ [MODAL] Error uploading from URLs:', error)
    } finally {
      setIsUrlUploading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className='gap-2'>
            <IconUpload className='h-4 w-4' />
            Subir Documentos
          </Button>
        )}
      </DialogTrigger>

      <DialogContent
        className='sm:max-w-2xl'
        onInteractOutside={(e) => {
          // Prevenir cerrar el modal si se está subiendo
          if (isUploading || isUrlUploading) {
            e.preventDefault()
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>Subir Documentos a {project.title}</DialogTitle>
          <DialogDescription>
            Añade documentos e imágenes a tu proyecto. Formatos soportados: PDF, JPG, PNG, WebP
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={uploadMethod}
          onValueChange={(value) => setUploadMethod(value as 'files' | 'urls')}
        >
          <TabsList className='grid w-full grid-cols-2'>
            <TabsTrigger value='files' className='flex items-center gap-2'>
              <IconFile className='h-4 w-4' />
              Subir Archivos
            </TabsTrigger>
            <TabsTrigger value='urls' className='flex items-center gap-2'>
              <IconLink className='h-4 w-4' />
              Desde URLs
            </TabsTrigger>
          </TabsList>

          <TabsContent value='files' className='space-y-6'>
            {/* Área de drag-and-drop con react-dropzone */}
            <div
              {...getRootProps()}
              className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${
                isDragActive && !isDragReject
                  ? 'border-primary bg-primary/5 border-solid'
                  : isDragReject
                    ? 'border-red-500 bg-red-50'
                    : 'border-muted-foreground/25 hover:border-muted-foreground/50'
              }
              ${isUploading ? 'cursor-not-allowed opacity-50' : ''}
            `}
            >
              <input {...getInputProps()} />

              <IconUpload
                className={`mx-auto h-12 w-12 mb-4 ${
                  isDragActive && !isDragReject
                    ? 'text-primary'
                    : isDragReject
                      ? 'text-red-500'
                      : 'text-muted-foreground'
                }`}
              />

              <h3 className='text-lg font-semibold mb-2'>
                {isDragActive
                  ? isDragReject
                    ? 'Tipo de archivo inválido'
                    : 'Suelta documentos aquí'
                  : 'Arrastra documentos o explora archivos'}
              </h3>

              <p className='text-sm text-muted-foreground mb-4'>
                {isDragActive && !isDragReject
                  ? 'Suelta para añadir documentos'
                  : 'Elige archivos o arrástralos aquí'}
              </p>

              {/* Información de límites */}
              <div className='text-xs text-muted-foreground space-y-1'>
                <p>
                  <strong>Tamaño de archivo:</strong> ≤100MB por documento |{' '}
                  <strong>Páginas PDF:</strong> ≤500 páginas
                </p>
                <p>
                  <strong>Formatos:</strong> PDF, JPG, JPEG, PNG, WebP
                </p>
                <p className='text-orange-600'>
                  Los archivos se validarán automáticamente después de la selección
                </p>
              </div>

              {/* Mostrar errores de archivos rechazados */}
              {fileRejections.length > 0 && (
                <div className='mt-4 text-xs text-red-600'>
                  <p>Algunos archivos fueron rechazados:</p>
                  {fileRejections.map(({ file, errors }) => (
                    <p key={file.name}>
                      {file.name}: {errors.map((e) => e.message).join(', ')}
                    </p>
                  ))}
                </div>
              )}

              {!isDragActive && (
                <Button variant='outline' className='mt-4' disabled={isUploading} type='button'>
                  Explorar Archivos
                </Button>
              )}
            </div>

            {/* Lista de archivos seleccionados */}
            {files.length > 0 && (
              <div className='space-y-2'>
                <div className='flex items-center justify-between'>
                  <h4 className='text-sm font-medium'>Selected Files ({files.length})</h4>
                  {!isUploading && (
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={clearFiles}
                      className='text-xs text-muted-foreground hover:text-foreground'
                    >
                      Clear All
                    </Button>
                  )}
                </div>

                {/* Estado de validación y subida */}
                {(() => {
                  const validatingCount = files.filter((f) => f.status === 'validating').length
                  const uploadingCount = files.filter((f) => f.status === 'uploading').length
                  const completedCount = files.filter((f) => f.status === 'completed').length
                  const errorCount = files.filter((f) => f.status === 'error').length
                  const validCount = files.filter(
                    (f) => f.status === 'pending' && f.validationComplete,
                  ).length

                  return (
                    <div className='text-xs space-y-1'>
                      {validatingCount > 0 && (
                        <p className='text-blue-600 flex items-center gap-1'>
                          <IconLoader2 className='h-3 w-3 animate-spin' />
                          Validating {validatingCount} file{validatingCount !== 1 ? 's' : ''}...
                        </p>
                      )}
                      {uploadingCount > 0 && (
                        <p className='text-orange-600 flex items-center gap-1'>
                          <IconLoader2 className='h-3 w-3 animate-spin' />
                          Uploading {uploadingCount} file{uploadingCount !== 1 ? 's' : ''}...
                        </p>
                      )}
                      {completedCount > 0 && (
                        <p className='text-green-600 flex items-center gap-1'>
                          <IconCheck className='h-3 w-3' />
                          {completedCount} file{completedCount !== 1 ? 's' : ''} uploaded
                          successfully
                        </p>
                      )}
                      {errorCount > 0 && (
                        <p className='text-red-600 flex items-center gap-1'>
                          <IconAlertCircle className='h-3 w-3' />
                          {errorCount} file{errorCount !== 1 ? 's' : ''} failed
                        </p>
                      )}
                      {validCount > 0 &&
                        validatingCount === 0 &&
                        uploadingCount === 0 &&
                        errorCount === 0 &&
                        completedCount === 0 && (
                          <p className='text-green-600 flex items-center gap-1'>
                            <IconCheck className='h-3 w-3' />
                            All files validated and ready for upload
                          </p>
                        )}
                    </div>
                  )
                })()}

                <div className='max-h-48 overflow-y-auto space-y-2'>
                  {files.map((file) => (
                    <div
                      key={file.id}
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        file.status === 'error' ? 'bg-red-50 border border-red-200' : 'bg-muted/50'
                      }`}
                    >
                      <div className='flex items-center gap-3 flex-1 min-w-0'>
                        {/* Icono con estado */}
                        {file.status === 'validating' ? (
                          <IconLoader2 className='h-5 w-5 text-blue-500 flex-shrink-0 animate-spin' />
                        ) : file.status === 'uploading' ? (
                          <IconLoader2 className='h-5 w-5 text-orange-500 flex-shrink-0 animate-spin' />
                        ) : file.status === 'error' ? (
                          <IconAlertCircle className='h-5 w-5 text-red-500 flex-shrink-0' />
                        ) : file.status === 'completed' ? (
                          <IconCheck className='h-5 w-5 text-green-500 flex-shrink-0' />
                        ) : file.validationComplete ? (
                          <IconCheck className='h-5 w-5 text-green-500 flex-shrink-0' />
                        ) : file.type?.includes('pdf') ? (
                          <IconFileText className='h-5 w-5 text-primary flex-shrink-0' />
                        ) : (
                          <IconPhoto className='h-5 w-5 text-primary flex-shrink-0' />
                        )}

                        <div className='flex-1 min-w-0'>
                          <p className='text-sm font-medium truncate'>{file.name}</p>
                          <div className='text-xs text-muted-foreground space-y-1'>
                            <p>{(file.size / (1024 * 1024)).toFixed(1)} MB</p>

                            {/* Mostrar tipo de archivo */}
                            {file.type && (
                              <p>Type: {file.type.includes('pdf') ? 'PDF Document' : 'Image'}</p>
                            )}

                            {/* Mostrar estado de validación */}
                            {file.status === 'validating' && (
                              <p className='text-blue-600'>Validating...</p>
                            )}

                            {/* Mostrar estado de subida */}
                            {file.status === 'uploading' && (
                              <div className='space-y-1'>
                                <p className='text-orange-600'>Uploading... {file.progress}%</p>
                                <Progress value={file.progress} className='h-1' />
                              </div>
                            )}

                            {/* Mostrar estado completado */}
                            {file.status === 'completed' && (
                              <p className='text-green-600'>Upload completed successfully</p>
                            )}

                            {/* Mostrar errores de validación o subida */}
                            {file.status === 'error' && file.error && (
                              <p className='text-red-600'>{file.error}</p>
                            )}
                          </div>
                        </div>
                      </div>

                      {!isUploading && (
                        <Button
                          variant='ghost'
                          size='sm'
                          onClick={() => removeFile(file.id)}
                          className='h-8 w-8 p-0 text-muted-foreground hover:text-red-600'
                          disabled={file.status === 'uploading'}
                        >
                          <IconTrash className='h-4 w-4' />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Botones de acción para FILES */}
            <div className='flex justify-end gap-2'>
              <Button
                variant='outline'
                onClick={handleClose}
                disabled={isUploading || isUrlUploading}
              >
                Cancelar
              </Button>
              <Button
                disabled={
                  files.length === 0 ||
                  isUploading ||
                  files.some((f) => f.status === 'validating' || f.status === 'error') ||
                  !files.every((f) => f.validationComplete)
                }
                onClick={() => {
                  console.log('🔥 [MODAL] Upload button clicked!')
                  console.log('🔥 [MODAL] Files state:', files)
                  console.log('🔥 [MODAL] uploadFiles function:', uploadFiles)
                  uploadFiles()
                }}
                className='gap-2'
              >
                {isUploading ? (
                  <IconLoader2 className='h-4 w-4 animate-spin' />
                ) : (
                  <IconUpload className='h-4 w-4' />
                )}
                {isUploading ? 'Subiendo...' : 'Subir Documentos'}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value='urls' className='space-y-6'>
            {/* Interfaz para URLs */}
            <div className='space-y-4'>
              <div>
                <label className='text-sm font-medium mb-2 block'>
                  URLs de Documentos (una por línea)
                </label>
                <Textarea
                  placeholder={`https://example.com/document.pdf
https://example.com/image.jpg
https://example.com/another-doc.pdf`}
                  value={urlsText}
                  onChange={(e) => setUrlsText(e.target.value)}
                  rows={6}
                  className='resize-none text-sm break-all'
                  disabled={isUrlUploading}
                />
                <div className='text-xs text-muted-foreground mt-2 space-y-1'>
                  <p>
                    Introduce una URL por línea. Formatos soportados: PDF, JPG, PNG, WebP (máximo
                    100MB por archivo)
                  </p>
                  <p className='text-orange-600'>
                    💡 Consejo: Las URLs largas se procesarán automáticamente
                  </p>
                </div>
              </div>

              {/* Resultados de URLs */}
              {urlResults && (
                <div className='space-y-2'>
                  <h4 className='text-sm font-medium'>Resultados de Subida:</h4>
                  <div className='max-h-40 overflow-y-auto space-y-2'>
                    {urlResults.map((result, index) => (
                      <div
                        key={index}
                        className={`flex items-start gap-2 p-3 rounded text-sm overflow-hidden ${
                          result.success
                            ? 'bg-green-50 text-green-800 border border-green-200'
                            : 'bg-red-50 text-red-800 border border-red-200'
                        }`}
                      >
                        {result.success ? (
                          <IconCheck className='h-4 w-4 flex-shrink-0 mt-0.5' />
                        ) : (
                          <IconAlertCircle className='h-4 w-4 flex-shrink-0 mt-0.5' />
                        )}
                        <div className='flex-1 min-w-0 space-y-1'>
                          <div className='w-full overflow-hidden'>
                            <p
                              className='text-xs font-mono break-all leading-tight'
                              title={result.url}
                            >
                              {result.url}
                            </p>
                          </div>
                          {result.error && (
                            <div className='w-full overflow-hidden'>
                              <p
                                className='text-xs opacity-75 break-words leading-tight'
                                title={result.error}
                              >
                                {result.error}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Botones de acción para URLs */}
            <div className='flex justify-end gap-2'>
              <Button variant='outline' onClick={handleClose} disabled={isUrlUploading}>
                Cancelar
              </Button>
              <Button
                disabled={!urlsText.trim() || isUrlUploading}
                onClick={handleUrlUpload}
                className='gap-2'
              >
                {isUrlUploading ? (
                  <>
                    <IconLoader2 className='h-4 w-4 animate-spin' />
                    Descargando...
                  </>
                ) : (
                  <>
                    <IconLink className='h-4 w-4' />
                    Recuperar y subir documentos
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
