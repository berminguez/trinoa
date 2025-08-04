'use client'

import { useState } from 'react'
import { useDropzone } from 'react-dropzone'
import {
  IconUpload,
  IconX,
  IconVideo,
  IconTrash,
  IconLoader2,
  IconAlertCircle,
  IconCheck,
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
import { useProjectUpload, type UploadFile } from '@/hooks/useProjectUpload'
import type { Project } from '@/payload-types'

interface VideoUploadModalProps {
  project: Project
  trigger?: React.ReactNode
  onUploadComplete?: () => void
  onResourceUploaded?: (resource: any) => void
  onResourceUploadFailed?: (tempResourceId: string) => void
}

export function VideoUploadModal({
  project,
  trigger,
  onUploadComplete,
  onResourceUploaded,
  onResourceUploadFailed,
}: VideoUploadModalProps) {
  const [isOpen, setIsOpen] = useState(false)

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
      'video/mp4': ['.mp4'],
      'video/mpeg': ['.mp4'],
      'video/mp4v-es': ['.mp4'],
      'video/quicktime': ['.mov'],
      'video/x-msvideo': ['.avi'],
      'video/webm': ['.webm'],
      'video/x-matroska': ['.mkv'],
      'video/x-ms-wmv': ['.wmv'],
      'video/x-flv': ['.flv'],
    },
    multiple: true,
    maxSize: 2 * 1024 * 1024 * 1024, // 2GB
    onDrop: addFiles, // Usar la función del hook
    disabled: isUploading,
  })

  const handleClose = () => {
    if (!isUploading) {
      setIsOpen(false)
      clearFiles() // Usar la función del hook
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className='gap-2'>
            <IconUpload className='h-4 w-4' />
            Upload Videos
          </Button>
        )}
      </DialogTrigger>

      <DialogContent
        className='sm:max-w-2xl'
        onInteractOutside={(e) => {
          // Prevenir cerrar el modal si se está subiendo
          if (isUploading) {
            e.preventDefault()
          }
        }}
      >
        <DialogHeader>
          <DialogTitle className='flex items-center justify-between'>
            <span>Upload Videos to {project.title}</span>
            {!isUploading && (
              <Button variant='ghost' size='sm' onClick={handleClose} className='h-6 w-6 p-0'>
                <IconX className='h-4 w-4' />
              </Button>
            )}
          </DialogTitle>
          <DialogDescription>
            Add videos to your project. Supported formats: MP4, MOV, AVI, WebM
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-6'>
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
                  ? 'Invalid file type'
                  : 'Drop videos here'
                : 'Drop videos or browse files'}
            </h3>

            <p className='text-sm text-muted-foreground mb-4'>
              {isDragActive && !isDragReject
                ? 'Release to add videos'
                : 'Choose files or drag them here'}
            </p>

            {/* Información de límites */}
            <div className='text-xs text-muted-foreground space-y-1'>
              <p>
                <strong>Duration:</strong> 4sec-2hr | <strong>File size:</strong> ≤2GB per video
              </p>
              <p>
                <strong>Formats:</strong> MP4, MOV, AVI, WebM, MKV, WMV, FLV
              </p>
              <p className='text-orange-600'>
                Files will be validated automatically after selection
              </p>
            </div>

            {/* Mostrar errores de archivos rechazados */}
            {fileRejections.length > 0 && (
              <div className='mt-4 text-xs text-red-600'>
                <p>Some files were rejected:</p>
                {fileRejections.map(({ file, errors }) => (
                  <p key={file.name}>
                    {file.name}: {errors.map((e) => e.message).join(', ')}
                  </p>
                ))}
              </div>
            )}

            {!isDragActive && (
              <Button variant='outline' className='mt-4' disabled={isUploading} type='button'>
                Browse Files
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
                        {completedCount} file{completedCount !== 1 ? 's' : ''} uploaded successfully
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
                      ) : (
                        <IconVideo className='h-5 w-5 text-primary flex-shrink-0' />
                      )}

                      <div className='flex-1 min-w-0'>
                        <p className='text-sm font-medium truncate'>{file.name}</p>
                        <div className='text-xs text-muted-foreground space-y-1'>
                          <p>{(file.size / (1024 * 1024)).toFixed(1)} MB</p>

                          {/* Mostrar duración si está disponible */}
                          {file.duration !== undefined && (
                            <p>
                              Duration: {Math.floor(file.duration / 60)}:
                              {String(Math.floor(file.duration % 60)).padStart(2, '0')}
                            </p>
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

          {/* Botones de acción */}
          <div className='flex justify-end gap-2'>
            <Button variant='outline' onClick={handleClose} disabled={isUploading}>
              Cancel
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
              {isUploading ? 'Uploading...' : 'Upload Videos'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
