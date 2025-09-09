'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
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
import { revalidateProjectPages } from '@/actions/projects/revalidateProjectPages'
import type { Project } from '@/payload-types'
import { DocumentUploader } from '@/components'
import type { DocumentTableContainerRef } from './VideoTableContainer'

interface DocumentUploadModalProps {
  project: Project
  trigger?: React.ReactNode
  onUploadComplete?: () => void
  onResourceUploaded?: (resource: any) => void
  onResourceUploadFailed?: (tempResourceId: string) => void
  onMultiInvoiceUploadStarted?: (fileName: string) => void
  documentTableRef?: React.RefObject<DocumentTableContainerRef | null>
}

export function DocumentUploadModal({
  project,
  trigger,
  onUploadComplete,
  onResourceUploaded,
  onResourceUploadFailed,
  onMultiInvoiceUploadStarted,
  documentTableRef,
}: DocumentUploadModalProps) {
  const t = useTranslations('documents')
  const tModal = useTranslations('documents.uploadModal')
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
    projectId: project?.id,
    projectTitle: project?.title,
    projectIdType: typeof project?.id,
    projectCreatedBy: project?.createdBy,
    projectObject: project,
  })

  // Usar el hook personalizado para manejar toda la lógica de upload
  const { files, isUploading, addFiles, removeFile, clearFiles, uploadFiles, toggleMultiInvoice } =
    useProjectUpload({
      projectId: project?.id,
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
      onMultiInvoiceUploadStarted,
      onPreResourceCreated: (preResource) => {
        // Cuando se crea un pre-resource exitosamente, agregarlo al DocumentTable
        console.log('✅ [MODAL] Pre-resource created, adding to DocumentTable:', preResource)
        console.log('🔍 [MODAL] DocumentTable ref status:', {
          refExists: !!documentTableRef,
          currentExists: !!documentTableRef?.current,
          addPreResourceExists: !!documentTableRef?.current?.addPreResource,
        })

        if (documentTableRef?.current?.addPreResource) {
          console.log('📋 [MODAL] Calling documentTableRef.current.addPreResource...')
          documentTableRef.current.addPreResource(preResource)
          console.log('✅ [MODAL] addPreResource called successfully')
        } else {
          console.error('❌ [MODAL] DocumentTable ref or addPreResource method not available:', {
            refExists: !!documentTableRef,
            currentExists: !!documentTableRef?.current,
            addPreResourceExists: !!documentTableRef?.current?.addPreResource,
          })
        }
      },
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

    if (!project?.id) {
      console.error('❌ [MODAL] Project ID is missing. Cannot upload from URLs.')
      return
    }

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

        // Notificar recursos subidos exitosamente - agregar inmediatamente a la tabla
        const successfulResources = result.data
          .filter((r) => r.success && r.resource)
          .map((r) => r.resource)

        console.log(
          '🎯 [MODAL] Resources created from URLs, adding to table immediately:',
          successfulResources,
        )

        successfulResources.forEach((resource) => {
          if (onResourceUploaded) {
            onResourceUploaded(resource)
          }
        })

        if (successfulResources.length > 0) {
          // Revalidar páginas del proyecto para actualizar la tabla
          try {
            console.log('[MODAL] Revalidating project pages after URL upload...')
            const revalidationResult = await revalidateProjectPages(project.id)
            if (revalidationResult.success) {
              console.log('[MODAL] Project pages revalidated successfully')
            } else {
              console.error('[MODAL] Failed to revalidate project pages:', revalidationResult.error)
            }
          } catch (revalidationError) {
            console.error('[MODAL] Error during revalidation:', revalidationError)
            // No fallar por esto - los uploads fueron exitosos
          }

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
          <Button className='gap-2 w-full sm:w-auto'>
            <IconUpload className='h-4 w-4' />
            {t('uploadDocuments', { default: t('upload') })}
          </Button>
        )}
      </DialogTrigger>

      <DialogContent
        className='max-w-[95vw] sm:max-w-2xl'
        onInteractOutside={(e) => {
          // Prevenir cerrar el modal si se está subiendo
          if (isUploading || isUrlUploading) {
            e.preventDefault()
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>
            {project?.title
              ? tModal('title', { projectTitle: project.title })
              : tModal('titleDefault')}
          </DialogTitle>
          <DialogDescription>{tModal('description')}</DialogDescription>
        </DialogHeader>

        <Tabs
          value={uploadMethod}
          onValueChange={(value) => setUploadMethod(value as 'files' | 'urls')}
        >
          <TabsList className='grid w-full grid-cols-2'>
            <TabsTrigger value='files' className='flex items-center gap-2'>
              <IconFile className='h-4 w-4' />
              {tModal('tabs.uploadFiles')}
            </TabsTrigger>
            <TabsTrigger value='urls' className='flex items-center gap-2'>
              <IconLink className='h-4 w-4' />
              {tModal('tabs.fromUrls')}
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
                    ? tModal('dragDrop.invalidFileType')
                    : tModal('dragDrop.dropHere')
                  : tModal('dragDrop.title')}
              </h3>

              <p className='text-sm text-muted-foreground mb-4'>
                {isDragActive && !isDragReject
                  ? tModal('dragDrop.dropToAdd')
                  : tModal('dragDrop.subtitle')}
              </p>

              {/* Información de límites */}
              <div className='text-xs text-muted-foreground space-y-1'>
                <p>
                  <strong>{tModal('dragDrop.fileSize')}:</strong> ≤100MB por documento |{' '}
                  <strong>{tModal('dragDrop.pdfPages')}:</strong> ≤500 páginas
                </p>
                <p>
                  <strong>{tModal('dragDrop.formats')}:</strong> PDF, JPG, JPEG, PNG, WebP
                </p>
                <p className='text-orange-600'>{tModal('dragDrop.validation')}</p>
              </div>

              {/* Mostrar errores de archivos rechazados */}
              {fileRejections.length > 0 && (
                <div className='mt-4 text-xs text-red-600'>
                  <p>{tModal('dragDrop.rejectedFiles')}</p>
                  {fileRejections.map(({ file, errors }) => (
                    <p key={file.name}>
                      {file.name}: {errors.map((e) => e.message).join(', ')}
                    </p>
                  ))}
                </div>
              )}

              {!isDragActive && (
                <Button variant='outline' className='mt-4' disabled={isUploading} type='button'>
                  {tModal('dragDrop.exploreFiles')}
                </Button>
              )}
            </div>

            {/* Lista de archivos seleccionados */}
            {files.length > 0 && (
              <div className='space-y-2'>
                <div className='flex items-center justify-between'>
                  <h4 className='text-sm font-medium'>
                    {tModal('fileList.selectedFiles', { count: files.length })}
                  </h4>
                  {!isUploading && (
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={clearFiles}
                      className='text-xs text-muted-foreground hover:text-foreground'
                    >
                      {tModal('fileList.clearAll')}
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
                          {tModal('fileList.validating', {
                            count: validatingCount,
                            plural: validatingCount !== 1 ? 's' : '',
                          })}
                        </p>
                      )}
                      {uploadingCount > 0 && (
                        <p className='text-orange-600 flex items-center gap-1'>
                          <IconLoader2 className='h-3 w-3 animate-spin' />
                          {tModal('fileList.uploading', {
                            count: uploadingCount,
                            plural: uploadingCount !== 1 ? 's' : '',
                          })}
                        </p>
                      )}
                      {completedCount > 0 && (
                        <p className='text-green-600 flex items-center gap-1'>
                          <IconCheck className='h-3 w-3' />
                          {tModal('fileList.completed', {
                            count: completedCount,
                            plural: completedCount !== 1 ? 's' : '',
                          })}
                        </p>
                      )}
                      {errorCount > 0 && (
                        <p className='text-red-600 flex items-center gap-1'>
                          <IconAlertCircle className='h-3 w-3' />
                          {tModal('fileList.failed', {
                            count: errorCount,
                            plural: errorCount !== 1 ? 's' : '',
                          })}
                        </p>
                      )}
                      {validCount > 0 &&
                        validatingCount === 0 &&
                        uploadingCount === 0 &&
                        errorCount === 0 &&
                        completedCount === 0 && (
                          <p className='text-green-600 flex items-center gap-1'>
                            <IconCheck className='h-3 w-3' />
                            {tModal('fileList.readyToUpload')}
                          </p>
                        )}
                    </div>
                  )
                })()}

                <div className='max-h-48 overflow-y-auto space-y-2'>
                  <DocumentUploader
                    files={files as UploadFile[]}
                    isUploading={isUploading}
                    onRemove={removeFile}
                    onToggleMultiInvoice={(id, val) => toggleMultiInvoice(id, val)}
                    showHeader={false}
                  />
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
                {tModal('actions.cancel')}
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
                {isUploading ? tModal('actions.uploading') : tModal('actions.uploadDocuments')}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value='urls' className='space-y-6'>
            {/* Interfaz para URLs */}
            <div className='space-y-4'>
              <div>
                <label className='text-sm font-medium mb-2 block'>{tModal('urls.title')}</label>
                <Textarea
                  placeholder={tModal('urls.placeholder')}
                  value={urlsText}
                  onChange={(e) => setUrlsText(e.target.value)}
                  rows={6}
                  className='resize-none text-sm break-all'
                  disabled={isUrlUploading}
                />
                <div className='text-xs text-muted-foreground mt-2 space-y-1'>
                  <p>{tModal('urls.help')}</p>
                  <p className='text-orange-600'>{tModal('urls.tip')}</p>
                </div>
              </div>

              {/* Resultados de URLs */}
              {urlResults && (
                <div className='space-y-2'>
                  <h4 className='text-sm font-medium'>{tModal('urls.results')}</h4>
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
                {tModal('actions.cancel')}
              </Button>
              <Button
                disabled={!urlsText.trim() || isUrlUploading}
                onClick={handleUrlUpload}
                className='gap-2'
              >
                {isUrlUploading ? (
                  <>
                    <IconLoader2 className='h-4 w-4 animate-spin' />
                    {tModal('urls.downloading')}
                  </>
                ) : (
                  <>
                    <IconLink className='h-4 w-4' />
                    {tModal('urls.retrieveAndUpload')}
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
