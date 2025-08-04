'use client'

import { useState, useCallback } from 'react'
import axios, { type AxiosProgressEvent } from 'axios'
import { toast } from 'sonner'

export interface UploadFile extends File {
  id: string
  progress: number
  status: 'pending' | 'uploading' | 'completed' | 'error' | 'validating'
  error?: string
  duration?: number
  validationComplete?: boolean
  tempResourceId?: string // ID temporal para optimistic updates
  _originalFile?: File // Referencia al File original para APIs que lo requieren
}

interface UseProjectUploadOptions {
  projectId: string
  onUploadComplete?: () => void
  onResourceUploaded?: (resource: any) => void // Callback para optimistic updates
  onResourceUploadFailed?: (tempResourceId: string) => void // Callback para rollback
}

interface UseProjectUploadReturn {
  files: UploadFile[]
  isUploading: boolean
  addFiles: (acceptedFiles: File[]) => void
  removeFile: (fileId: string) => void
  clearFiles: () => void
  uploadFiles: () => Promise<{ successful: number; failed: number; total: number } | undefined>
  validateFile: (file: UploadFile) => Promise<UploadFile>
}

export function useProjectUpload({
  projectId,
  onUploadComplete,
  onResourceUploaded,
  onResourceUploadFailed,
}: UseProjectUploadOptions): UseProjectUploadReturn {
  const [files, setFiles] = useState<UploadFile[]>([])
  const [isUploading, setIsUploading] = useState(false)

  // Función para validar duración de video
  const validateVideoDuration = useCallback(
    (file: File): Promise<{ isValid: boolean; duration?: number; error?: string }> => {
      return new Promise((resolve) => {
        // Validar que el archivo sea válido antes de procesarlo
        if (!file || !(file instanceof File) || !file.name || !file.size) {
          resolve({
            isValid: false,
            error: 'Invalid file object',
          })
          return
        }

        // Validar que el archivo no esté vacío
        if (file.size === 0) {
          resolve({
            isValid: false,
            error: 'File is empty',
          })
          return
        }

        const video = document.createElement('video')
        let url: string

        try {
          // Usar el archivo original si está disponible
          const fileToUse = (file as any)._originalFile || file
          url = URL.createObjectURL(fileToUse)
        } catch (error) {
          console.error('Failed to create object URL:', error)
          resolve({
            isValid: false,
            error: 'Cannot process file - invalid file format',
          })
          return
        }

        // Timeout para evitar que se cuelgue la validación
        const timeoutId = setTimeout(() => {
          URL.revokeObjectURL(url)
          resolve({
            isValid: false,
            error: 'Video validation timeout - file may be corrupted or unsupported',
          })
        }, 10000) // 10 segundos timeout

        video.onloadedmetadata = () => {
          clearTimeout(timeoutId)
          const duration = video.duration
          URL.revokeObjectURL(url)

          // Verificar si la duración es válida (no NaN, no Infinity)
          if (!isFinite(duration) || isNaN(duration)) {
            resolve({
              isValid: false,
              error: 'Could not determine video duration - file may be corrupted',
            })
            return
          }

          // Validar duración: entre 4 segundos y 2 horas (7200 segundos)
          if (duration < 4) {
            resolve({
              isValid: false,
              duration,
              error: 'Video must be at least 4 seconds long',
            })
          } else if (duration > 7200) {
            // 2 horas = 7200 segundos
            resolve({
              isValid: false,
              duration,
              error: 'Video cannot exceed 2 hours in length',
            })
          } else {
            resolve({
              isValid: true,
              duration,
            })
          }
        }

        video.onerror = (error) => {
          clearTimeout(timeoutId)
          URL.revokeObjectURL(url)
          console.error('Video validation error:', error)
          resolve({
            isValid: false,
            error: 'Cannot read video file - format may not be supported or file is corrupted',
          })
        }

        // Configurar el video para mejor compatibilidad
        video.preload = 'metadata'
        video.muted = true
        video.playsInline = true

        try {
          video.src = url
        } catch (error) {
          clearTimeout(timeoutId)
          URL.revokeObjectURL(url)
          resolve({
            isValid: false,
            error: 'Failed to load video file',
          })
        }
      })
    },
    [],
  )

  // Función para validar un archivo completamente
  const validateFile = useCallback(
    async (file: UploadFile): Promise<UploadFile> => {
      // Verificación adicional de seguridad
      if (!file || !file.name) {
        console.error('Invalid file passed to validateFile:', file)
        return {
          ...file,
          status: 'error',
          error: 'Invalid file object',
          validationComplete: true,
        }
      }

      console.log('Validating file:', file.name, 'Size:', file.size, 'Type:', file.type)

      // Marcar como validando
      const validatingFile: UploadFile = {
        ...file,
        status: 'validating',
      }

      try {
        // Validar duración
        const durationValidation = await validateVideoDuration(file)

        if (!durationValidation.isValid) {
          // Si falla la validación, permitir continuar con advertencia pero validación básica
          console.warn('Video validation failed for:', file.name, durationValidation.error)

          // Validación básica: solo verificar que sea un archivo de video por extensión
          const isVideoFile = /\.(mp4|mov|avi|webm|mkv|wmv|flv)$/i.test(file.name)

          if (!isVideoFile) {
            return {
              ...validatingFile,
              status: 'error',
              error: 'File must be a video file (MP4, MOV, AVI, WebM, MKV, WMV, FLV)',
              validationComplete: true,
            }
          }

          // Si es un archivo de video pero falla la validación de duración,
          // permitir continuar con advertencia
          return {
            ...validatingFile,
            status: 'pending',
            duration: durationValidation.duration || undefined,
            validationComplete: true,
            error: undefined, // Limpiar error para permitir upload
          }
        }

        // Si todas las validaciones pasan
        return {
          ...validatingFile,
          status: 'pending',
          duration: durationValidation.duration,
          validationComplete: true,
        }
      } catch (error) {
        console.error('Validation error for:', file.name, error)

        // Fallback: validación básica por extensión
        const isVideoFile = /\.(mp4|mov|avi|webm|mkv|wmv|flv)$/i.test(file.name)

        if (isVideoFile) {
          // Permitir continuar con advertencia
          return {
            ...validatingFile,
            status: 'pending',
            validationComplete: true,
            error: undefined,
          }
        }

        return {
          ...validatingFile,
          status: 'error',
          error: 'Failed to validate video file',
          validationComplete: true,
        }
      }
    },
    [validateVideoDuration],
  )

  // Función para subir un archivo individual
  const uploadSingleFile = useCallback(
    async (file: UploadFile): Promise<UploadFile> => {
      console.log('🚀 [UPLOAD SINGLE] FUNCTION CALLED for file:', file?.name || 'undefined')
      console.log('🚀 [UPLOAD SINGLE] File object:', file)
      console.log('🚀 [UPLOAD SINGLE] ProjectId:', projectId)

      const formData = new FormData()
      formData.append('file', file._originalFile || file)
      formData.append('projectId', projectId)

      // Campos requeridos por la API
      formData.append('title', file.name.replace(/\.[^/.]+$/, '')) // Nombre sin extensión
      formData.append('namespace', `project-${projectId}-videos`) // Namespace único por proyecto
      formData.append('type', 'video')
      formData.append('description', `Video uploaded: ${file.name}`)

      // Generar ID temporal para optimistic update
      const tempResourceId = `temp-${file.id}-${Date.now()}`

      // Crear recurso temporal para optimistic update
      const tempResource = {
        id: tempResourceId,
        title: file.name.replace(/\.[^/.]+$/, ''), // Nombre sin extensión
        type: 'video',
        status: 'uploading',
        duration: file.duration || 0,
        project: projectId,
        file: {
          id: tempResourceId,
          filename: file.name,
          filesize: file.size,
          mimeType: file.type,
          url: URL.createObjectURL(file._originalFile || file), // URL temporal para preview
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        // Marcar como temporal
        _isTemporary: true,
      }

      try {
        console.log('🔑 [UPLOAD] Critical upload info:', {
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          projectId: projectId,
          projectIdType: typeof projectId,
          projectIdLength: projectId?.length,
          duration: file.duration,
        })

        // Optimistic update: añadir inmediatamente a la tabla
        if (onResourceUploaded) {
          console.log('[UPLOAD] Adding optimistic update to UI')
          onResourceUploaded(tempResource)
        }

        // Marcar archivo como subiendo y asociar ID temporal
        setFiles((prev) =>
          prev.map((f) =>
            f.id === file.id ? { ...f, status: 'uploading', progress: 0, tempResourceId } : f,
          ),
        )

        console.log('[UPLOAD] Sending POST request to /api/resources/upload')
        console.log('📤 [UPLOAD] FormData being sent:', {
          fileName: file.name,
          fileSize: file.size,
          projectId: projectId,
          projectIdInFormData: formData.get('projectId'),
          title: formData.get('title'),
          namespace: formData.get('namespace'),
          type: formData.get('type'),
          description: formData.get('description'),
        })

        const response = await axios.post('/api/resources/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          onUploadProgress: (progressEvent: AxiosProgressEvent) => {
            if (progressEvent.total) {
              const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
              console.log('[UPLOAD] Progress:', progress + '%')

              // Actualizar progreso del archivo específico
              setFiles((prev) => prev.map((f) => (f.id === file.id ? { ...f, progress } : f)))
            }
          },
        })

        console.log('[UPLOAD] Response received:', {
          status: response.status,
          statusText: response.statusText,
          data: response.data,
        })

        // Éxito - marcar como completado
        const completedFile: UploadFile = {
          ...file,
          status: 'completed',
          progress: 100,
          tempResourceId,
        }

        setFiles((prev) => prev.map((f) => (f.id === file.id ? completedFile : f)))

        // Limpiar URL temporal
        URL.revokeObjectURL(tempResource.file.url)

        // Reemplazar recurso temporal con el real
        if (response.data?.success && response.data?.data?.resource && onResourceUploaded) {
          // Añadir marcador para indicar que es una actualización
          const realResource = {
            ...response.data.data.resource,
            _replacesTempId: tempResourceId,
          }
          onResourceUploaded(realResource)
        }

        return completedFile
      } catch (error) {
        console.error('[UPLOAD] Upload failed for file:', file.name, error)

        // Limpiar URL temporal en caso de error
        URL.revokeObjectURL(tempResource.file.url)

        // Rollback: remover el recurso temporal de la tabla
        if (onResourceUploadFailed) {
          console.log('[UPLOAD] Performing rollback for tempResourceId:', tempResourceId)
          onResourceUploadFailed(tempResourceId)
        }

        // Determinar mensaje de error específico
        let errorMessage = 'Upload failed'
        let isRetryable = true

        if (axios.isAxiosError(error)) {
          console.log('[UPLOAD] Axios error details:', {
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            message: error.message,
            code: error.code,
          })

          const status = error.response?.status
          if (status === 401) {
            errorMessage = 'Authentication required - Please login again'
            isRetryable = false
          } else if (status === 403) {
            errorMessage = 'Not authorized for this project'
            isRetryable = false
          } else if (status === 400) {
            errorMessage = error.response?.data?.error || 'Invalid file or project'
            isRetryable = false
          } else if (status === 413) {
            errorMessage = 'File too large (max 2GB)'
            isRetryable = false
          } else if (status && status >= 500) {
            errorMessage = 'Server error - Please try again'
            isRetryable = true
          } else if (error.message === 'Network Error') {
            errorMessage = 'Network connection failed - Check your internet'
            isRetryable = true
          }
        } else {
          console.log('[UPLOAD] Non-axios error:', {
            error,
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
          })
        }

        // Mostrar toast de error con detalles específicos
        toast.error(`Upload failed: ${file.name}`, {
          description: errorMessage,
          duration: 5000,
          action: isRetryable
            ? {
                label: 'Retry',
                onClick: () => {
                  // El usuario puede reintentar manualmente
                  console.log('Retry requested for:', file.name)
                },
              }
            : undefined,
        })

        const errorFile: UploadFile = {
          ...file,
          status: 'error',
          error: errorMessage,
          progress: 0,
          tempResourceId,
        }

        setFiles((prev) => prev.map((f) => (f.id === file.id ? errorFile : f)))

        return errorFile
      }
    },
    [projectId],
  )

  // Función para añadir archivos
  const addFiles = useCallback(
    async (acceptedFiles: File[]) => {
      // Filtrar archivos válidos antes de procesarlos
      const validFiles = acceptedFiles.filter((file) => {
        if (!file || !(file instanceof File)) {
          console.warn('Invalid file object detected, skipping:', file)
          return false
        }
        if (!file.name || file.name.trim() === '') {
          console.warn('File without name detected, skipping:', file)
          return false
        }
        if (file.size === 0) {
          console.warn('Empty file detected, skipping:', file.name)
          return false
        }
        if (file.size > 2 * 1024 * 1024 * 1024) {
          // 2GB
          console.warn('File too large, skipping:', file.name)
          toast.error(`File "${file.name}" is too large (max 2GB)`)
          return false
        }
        return true
      })

      if (validFiles.length === 0) {
        toast.error('No valid files to process')
        return
      }

      if (validFiles.length < acceptedFiles.length) {
        const skipped = acceptedFiles.length - validFiles.length
        toast.warning(
          `${skipped} file${skipped !== 1 ? 's were' : ' was'} skipped (invalid or too large)`,
        )
      }

      // Crear archivos iniciales con estado pending
      const newFiles: UploadFile[] = validFiles.map((file) => {
        // Crear un nuevo objeto que combine File con UploadFile propiedades
        const uploadFile = {
          // Preservar todas las propiedades del File original
          name: file.name || (file as any).path?.replace(/^.*\//, '') || 'unknown-file', // Fallback para name
          size: file.size,
          type: file.type,
          lastModified: file.lastModified,
          webkitRelativePath: file.webkitRelativePath || '',
          // Conservar métodos del File
          arrayBuffer: file.arrayBuffer.bind(file),
          slice: file.slice.bind(file),
          stream: file.stream.bind(file),
          text: file.text.bind(file),
          // Agregar propiedades específicas de UploadFile
          id: Math.random().toString(36).substring(2, 15),
          progress: 0,
          status: 'pending' as const,
          validationComplete: false,
          // ¡IMPORTANTE! Mantener referencia al File original para APIs que lo requieren
          _originalFile: file,
        } as unknown as UploadFile

        console.log('📁 [FILE CREATION] Created UploadFile:', {
          originalName: file.name,
          originalPath: (file as any).path,
          finalName: uploadFile.name,
          size: uploadFile.size,
          type: uploadFile.type,
        })

        return uploadFile
      })

      // Añadir archivos inmediatamente (sin validar aún)
      setFiles((prev) => [...prev, ...newFiles])

      // Validar cada archivo de manera asíncrona
      for (const file of newFiles) {
        try {
          const validatedFile = await validateFile(file)

          // Actualizar el archivo específico con los resultados de validación
          setFiles((prev) => prev.map((f) => (f.id === file.id ? validatedFile : f)))
        } catch (error) {
          // En caso de error en la validación
          setFiles((prev) =>
            prev.map((f) =>
              f.id === file.id
                ? {
                    ...f,
                    status: 'error',
                    error: 'Validation failed',
                    validationComplete: true,
                  }
                : f,
            ),
          )
        }
      }
    },
    [validateFile],
  )

  // Función para remover archivo individual
  const removeFile = useCallback((fileId: string) => {
    setFiles((prev) => prev.filter((file) => file.id !== fileId))
  }, [])

  // Función para limpiar todos los archivos
  const clearFiles = useCallback(() => {
    setFiles([])
  }, [])

  // Función principal para subir todos los archivos
  const uploadFiles = useCallback(async () => {
    console.log('[UPLOAD MAIN] Starting uploadFiles function')
    console.log('[UPLOAD MAIN] Current files state:', files)

    // Filtrar solo archivos válidos (pending y validationComplete)
    const validFiles = files.filter((f) => f.status === 'pending' && f.validationComplete)

    console.log('[UPLOAD MAIN] Valid files for upload:', validFiles)

    if (validFiles.length === 0) {
      console.log('[UPLOAD MAIN] No valid files found')
      toast.error('No valid files to upload')
      return
    }

    console.log('[UPLOAD MAIN] Setting isUploading to true')
    setIsUploading(true)

    try {
      // Toast inicial
      toast.info(
        `Starting upload of ${validFiles.length} file${validFiles.length !== 1 ? 's' : ''}...`,
      )

      console.log('[UPLOAD MAIN] Creating upload promises for', validFiles.length, 'files')

      // Subir archivos de forma simultánea (Promise.allSettled para no fallar si uno falla)
      const uploadPromises = validFiles.map((file, index) => {
        console.log(`[UPLOAD MAIN] Creating promise ${index + 1} for file:`, file.name)
        return uploadSingleFile(file)
      })

      console.log('[UPLOAD MAIN] Waiting for all upload promises to settle')
      const results = await Promise.allSettled(uploadPromises)

      console.log('[UPLOAD MAIN] All promises settled, results:', results)

      // Analizar resultados
      const successful = results.filter((result) => result.status === 'fulfilled').length
      const failed = results.length - successful

      // Notificaciones finales
      if (successful > 0) {
        toast.success(`${successful} file${successful !== 1 ? 's' : ''} uploaded successfully`, {
          description:
            failed > 0
              ? `${failed} file${failed !== 1 ? 's' : ''} failed`
              : 'All files processed successfully',
        })

        // Llamar callback si se provee (para actualizar tabla de videos)
        if (onUploadComplete) {
          onUploadComplete()
        }
      }

      if (failed > 0 && successful === 0) {
        toast.error(`All ${failed} file${failed !== 1 ? 's' : ''} failed to upload`)
      }

      // Retornar estadísticas de upload
      return {
        successful,
        failed,
        total: results.length,
      }
    } catch (error) {
      // Error inesperado
      console.error('🚨 [UPLOAD MAIN] Unexpected error during upload:', error)
      console.error(
        '🚨 [UPLOAD MAIN] Error stack:',
        error instanceof Error ? error.stack : 'No stack',
      )
      console.error('🚨 [UPLOAD MAIN] Error details:', {
        message: error instanceof Error ? error.message : String(error),
        name: error instanceof Error ? error.name : 'Unknown',
        cause: error instanceof Error ? error.cause : undefined,
      })
      toast.error('Unexpected error during upload')
    } finally {
      console.log('[UPLOAD MAIN] Setting isUploading to false')
      setIsUploading(false)
    }
  }, [files, uploadSingleFile, onUploadComplete])

  return {
    files,
    isUploading,
    addFiles,
    removeFile,
    clearFiles,
    uploadFiles,
    validateFile,
  }
}
