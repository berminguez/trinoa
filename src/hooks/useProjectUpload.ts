'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import axios, { type AxiosProgressEvent } from 'axios'
import { runSplitterPipeline } from '@/actions/splitter/runPipeline'
import { revalidateProjectPages } from '@/actions/projects/revalidateProjectPages'
import { pregenerateCodes } from '@/actions/documents/uploadFromUrls'
import { toast } from 'sonner'
import { addFileId } from '@/lib/utils/fileUtils'
import { getProjectPreResources } from '@/actions/projects/getProjectPreResources'
import { CONFIG } from '@/lib/config'

export interface UploadFile extends File {
  id: string
  progress: number
  status: 'pending' | 'uploading' | 'completed' | 'error' | 'validating'
  error?: string
  duration?: number
  pages?: number
  isMultiInvoice?: boolean
  validationComplete?: boolean
  tempResourceId?: string // ID temporal para optimistic updates
  _originalFile?: File // Referencia al File original para APIs que lo requieren
  // Nuevos campos para modo manual de multi-factura
  splitMode?: 'auto' | 'manual'
  manualPages?: string // Números de página separados por comas
}

interface UseProjectUploadOptions {
  projectId: string
  onUploadComplete?: () => void
  onResourceUploaded?: (resource: any) => void // Callback para optimistic updates
  onResourceUploadFailed?: (tempResourceId: string) => void // Callback para rollback
  onMultiInvoiceUploadStarted?: (fileName: string) => void // Callback para feedback inmediato de multifacturas
  onPreResourceCreated?: (preResource: any) => void // Callback cuando se crea un pre-resource exitosamente
}

interface UseProjectUploadReturn {
  files: UploadFile[]
  isUploading: boolean
  addFiles: (acceptedFiles: File[]) => void
  removeFile: (fileId: string) => void
  clearFiles: () => void
  uploadFiles: () => Promise<{ successful: number; failed: number; total: number } | undefined>
  validateFile: (file: UploadFile) => Promise<UploadFile>
  toggleMultiInvoice: (fileId: string, value: boolean) => void
  setSplitMode: (fileId: string, mode: 'auto' | 'manual') => void
  setManualPages: (fileId: string, pages: string) => void
}

export function useProjectUpload({
  projectId,
  onUploadComplete,
  onResourceUploaded,
  onResourceUploadFailed,
  onMultiInvoiceUploadStarted,
  onPreResourceCreated,
}: UseProjectUploadOptions): UseProjectUploadReturn {
  const [files, setFiles] = useState<UploadFile[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const filesRef = useRef<UploadFile[]>([])
  
  // Mantener filesRef sincronizado con files
  useEffect(() => {
    filesRef.current = files
  }, [files])

  // Función para validar documentos
  const validateDocumentFile = useCallback(
    (file: File): Promise<{ isValid: boolean; pages?: number; error?: string }> => {
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
          console.error(`❌ [VALIDATION] File is empty:`, {
            name: file.name,
            size: file.size,
            type: file.type,
          })
          resolve({
            isValid: false,
            error: 'File is empty or corrupted',
          })
          return
        }

        // Validación simple para documentos
        console.log(`📜 [VALIDATION] Starting validation for file:`, {
          name: file.name,
          size: file.size,
          type: file.type,
          isFile: file instanceof File,
        })

        // Validar extensión de archivo
        const isValidDocument = /\.(pdf|jpe?g|png|webp)$/i.test(file.name)
        if (!isValidDocument) {
          resolve({
            isValid: false,
            error: 'File must be a document (PDF, JPG, PNG, WebP)',
          })
          return
        }

        // Validar tipo MIME adicional para mayor seguridad
        const validMimeTypes = [
          'application/pdf',
          'image/jpeg',
          'image/jpg',
          'image/png',
          'image/webp',
        ]

        if (file.type && !validMimeTypes.includes(file.type)) {
          console.warn(`File ${file.name} has unexpected MIME type: ${file.type}`)
          // No falla la validación, solo advierte, ya que algunos browsers pueden reportar MIME types incorrectos
        }

        // Validar tamaño de archivo (100MB máximo)
        const maxSize = 100 * 1024 * 1024 // 100MB
        if (file.size > maxSize) {
          resolve({
            isValid: false,
            error: 'File size must be less than 100MB',
          })
          return
        }

        // Para PDFs podríamos agregar validación de páginas aquí en el futuro
        // Por ahora, simplemente validamos que sea un archivo válido

        const isPDF = file.name.toLowerCase().endsWith('.pdf')
        console.log(`✅ [VALIDATION] Document validated successfully:`, {
          name: file.name,
          size: `${(file.size / (1024 * 1024)).toFixed(1)}MB`,
          type: file.type,
          extension: file.name.split('.').pop()?.toLowerCase(),
          isPDF,
        })

        // Toast informativo para PDFs
        if (isPDF) {
          console.log(`📄 [PDF] PDF file detected: ${file.name}`)
        }

        resolve({
          isValid: true,
          pages: undefined, // Podríamos implementar detección de páginas aquí
        })
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

      console.log('🔍 [VALIDATE] Validating file:', {
        name: file.name,
        size: file.size,
        type: file.type,
        hasOriginalFile: !!(file as any)._originalFile,
      })

      // Marcar como validando
      const validatingFile: UploadFile = {
        ...file,
        status: 'validating',
      }

      try {
        // Validar documento - usar el archivo original si está disponible
        const fileToValidate = (file as any)._originalFile || file
        console.log('📂 [VALIDATE] Using file for validation:', {
          name: fileToValidate.name,
          size: fileToValidate.size,
          type: fileToValidate.type,
          isOriginal: fileToValidate === (file as any)._originalFile,
        })
        const documentValidation = await validateDocumentFile(fileToValidate)

        if (!documentValidation.isValid) {
          // Si falla la validación, devolver error
          console.warn('Document validation failed for:', file.name, documentValidation.error)

          return {
            ...validatingFile,
            status: 'error',
            error: documentValidation.error,
            validationComplete: true,
          }
        }

        // Si todas las validaciones pasan
        return {
          ...validatingFile,
          status: 'pending',
          pages: documentValidation.pages,
          validationComplete: true,
        }
      } catch (error) {
        console.error('Validation error for:', file.name, error)

        // Fallback: validación básica por extensión
        const isDocumentFile = /\.(pdf|jpe?g|png|webp)$/i.test(file.name)

        if (isDocumentFile) {
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
          error: 'Failed to validate document file',
          validationComplete: true,
        }
      }
    },
    [validateDocumentFile],
  )

  // Función para subir un archivo individual
  const uploadSingleFile = useCallback(
    async (file: UploadFile, preAssignedCode?: string): Promise<UploadFile> => {
      console.log('🚀 [UPLOAD SINGLE] FUNCTION CALLED for file:', file?.name || 'undefined')
      console.log('🚀 [UPLOAD SINGLE] File object:', file)
      console.log('🚀 [UPLOAD SINGLE] ProjectId:', projectId)

      // ⭐ GENERAR NOMBRE ÚNICO para evitar colisiones
      const uniqueFileName = addFileId(file.name)

      const formData = new FormData()

      // Crear un nuevo objeto File con el nombre único
      const uniqueFile = new File([file._originalFile || file], uniqueFileName, {
        type: file.type,
        lastModified: file.lastModified || Date.now(),
      })

      formData.append('file', uniqueFile)
      formData.append('projectId', projectId)

      // Campos requeridos por la API
      formData.append('title', uniqueFileName.replace(/\.[^/.]+$/, '')) // Nombre sin extensión
      // Detectar tipo de documento automáticamente
      const fileType = file.type?.includes('pdf') ? 'document' : 'image'
      formData.append('namespace', `project-${projectId}-documents`) // Namespace único por proyecto
      formData.append('type', fileType)
      formData.append('description', `Document uploaded: ${uniqueFileName}`)

      // 🚀 Añadir código pre-asignado si está disponible (sin race conditions)
      if (preAssignedCode) {
        formData.append('preAssignedCode', preAssignedCode)
        console.log('🎯 [UPLOAD] Using pre-assigned code:', preAssignedCode)
      }

      // Generar ID temporal para optimistic update
      const tempResourceId = `temp-${file.id}-${Date.now()}`

      // Crear recurso temporal para optimistic update
      const tempResource = {
        id: tempResourceId,
        title: file.name.replace(/\.[^/.]+$/, ''), // Nombre sin extensión
        type: file.type?.includes('pdf') ? 'document' : 'image',
        status: 'uploading',
        pages: file.pages || undefined,
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
          isMultiInvoice: file.isMultiInvoice,
        })

        // Optimistic update: añadir inmediatamente a la tabla (solo para uploads normales)
        if (onResourceUploaded && !file.isMultiInvoice) {
          console.log('[UPLOAD] Adding optimistic update to UI')
          onResourceUploaded(tempResource)
        } else if (file.isMultiInvoice) {
          console.log(
            '[MULTI-INVOICE] Skipping optimistic update - pre-resources will handle UI updates',
          )
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

        let response: any
        if (file.isMultiInvoice && file.type?.includes('pdf')) {
          // 🎉 FEEDBACK INMEDIATO para multifacturas
          console.log('📄 [MULTI-INVOICE] Starting multi-invoice upload:', file.name)

          // Mostrar toast inmediato
          toast.success('Documento multifactura enviado', {
            description: `Procesando "${file.name}". Te notificaremos cuando esté listo.`,
            duration: 4000,
          })

          // Notificar callback para actualizar pre-resources inmediatamente
          if (onMultiInvoiceUploadStarted) {
            onMultiInvoiceUploadStarted(file.name)
          }

          // Usar endpoint multipart (igual patrón que /api/resources/upload) para evitar límites de server actions
          const splitterForm = new FormData()
          splitterForm.append('file', uniqueFile)
          splitterForm.append('projectId', projectId)

          // Agregar información de modo manual si está disponible
          if (file.splitMode === 'manual' && file.manualPages) {
            splitterForm.append('splitMode', 'manual')
            splitterForm.append('manualPages', file.manualPages)
          } else {
            splitterForm.append('splitMode', 'auto')
          }

          // Enviar a API propia
          const res = await axios.post('/api/pre-resources/upload', splitterForm, {
            headers: { 'Content-Type': 'multipart/form-data' },
            onUploadProgress: (progressEvent: AxiosProgressEvent) => {
              if (progressEvent.total) {
                const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
                setFiles((prev) => prev.map((f) => (f.id === file.id ? { ...f, progress } : f)))
              }
            },
          })
          if (!res.data?.success) throw new Error(res.data?.error || 'pre-resource upload failed')

          // Obtener el pre-resource completo si se creó exitosamente
          if (res.data?.data?.preResourceId && onPreResourceCreated) {
            console.log(
              '🎯 [MULTI-INVOICE] Pre-resource created with ID:',
              res.data.data.preResourceId,
            )

            // Crear pre-resource temporal inmediatamente para mostrar el cartel
            const tempPreResource = {
              id: res.data.data.preResourceId,
              project: projectId,
              user: 'current-user',
              file: 'temp-file',
              originalName: file.name.replace(/\.[^/.]+$/, ''),
              status: 'pending' as const,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }

            console.log(
              '📋 [MULTI-INVOICE] Adding temporary pre-resource for immediate display:',
              tempPreResource,
            )
            onPreResourceCreated(tempPreResource)

            // Intentar obtener el pre-resource real con delay para timing
            setTimeout(async () => {
              try {
                console.log('🔍 [MULTI-INVOICE] Fetching real pre-resource data...')
                const preResourcesResult = await getProjectPreResources(projectId)

                if (preResourcesResult.success && preResourcesResult.data) {
                  const preResource = preResourcesResult.data.find(
                    (pr: any) => pr.id === res.data.data.preResourceId,
                  )

                  if (preResource) {
                    console.log(
                      '📋 [MULTI-INVOICE] Real pre-resource found, updating:',
                      preResource,
                    )
                    onPreResourceCreated(preResource)
                  } else {
                    console.warn(
                      '⚠️ [MULTI-INVOICE] Real pre-resource not found yet, will be picked up by polling',
                    )
                  }
                } else {
                  console.warn(
                    '⚠️ [MULTI-INVOICE] Could not fetch pre-resources after creation:',
                    preResourcesResult.error,
                  )
                }
              } catch (error) {
                console.error('❌ [MULTI-INVOICE] Error fetching real pre-resource:', error)
              }
            }, 1000) // 1 segundo de delay
          }

          // La subida fue exitosa independientemente de si pudimos obtener el pre-resource completo
          response = { data: { success: true }, status: 200, statusText: 'OK' }
          console.log(
            '✅ [MULTI-INVOICE] Upload completed successfully, pre-resource created with ID:',
            res.data.data.preResourceId,
          )
        } else {
          response = await axios.post('/api/resources/upload', formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
            onUploadProgress: (progressEvent: AxiosProgressEvent) => {
              if (progressEvent.total) {
                const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
                console.log('[UPLOAD] Progress:', progress + '%')
                setFiles((prev) => prev.map((f) => (f.id === file.id ? { ...f, progress } : f)))
              }
            },
          })
        }

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

        // Limpiar URL temporal (solo si se creó)
        if (!file.isMultiInvoice) {
          URL.revokeObjectURL(tempResource.file.url)
        }

        // Reemplazar recurso temporal con el real (solo para uploads normales, no multi-facturas)
        if (
          response.data?.success &&
          response.data?.data?.resource &&
          onResourceUploaded &&
          !file.isMultiInvoice
        ) {
          console.log(
            '🎯 [UPLOAD] Resource created successfully, adding to table immediately:',
            response.data.data.resource,
          )

          // Añadir marcador para indicar que es una actualización
          const realResource = {
            ...response.data.data.resource,
            _replacesTempId: tempResourceId,
          }
          onResourceUploaded(realResource)
        }

        // Para multi-facturas, el recurso temporal ya se removió, y los recursos derivados aparecerán cuando se complete el procesamiento

        return completedFile
      } catch (error) {
        console.error('[UPLOAD] Upload failed for file:', file.name, error)

        // Limpiar URL temporal en caso de error (solo si se creó)
        if (!file.isMultiInvoice) {
          URL.revokeObjectURL(tempResource.file.url)
        }

        // Rollback: remover el recurso temporal de la tabla (solo si se agregó)
        if (onResourceUploadFailed && !file.isMultiInvoice) {
          console.log('[UPLOAD] Performing rollback for tempResourceId:', tempResourceId)
          onResourceUploadFailed(tempResourceId)
        } else if (file.isMultiInvoice) {
          console.log(
            '[MULTI-INVOICE] Upload failed, but no rollback needed (no optimistic update was made)',
          )
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
    [projectId, onPreResourceCreated],
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

      // Límite de 25 archivos - usar ref para obtener el estado actual
      const MAX_FILES = 25
      const currentFilesCount = filesRef.current.length
      const availableSlots = MAX_FILES - currentFilesCount
      
      if (availableSlots <= 0) {
        toast.error('Límite alcanzado', {
          description: 'Ya has añadido el máximo de 25 archivos. Elimina algunos para añadir más.',
          duration: 5000,
        })
        return
      }

      let filesToAdd = validFiles
      
      if (validFiles.length > availableSlots) {
        const filesSelected = validFiles.length
        const filesAccepted = availableSlots
        const filesRejected = filesSelected - filesAccepted
        
        toast.warning('⚠️ Límite de 25 archivos', {
          description: `Has seleccionado ${filesSelected} archivo${filesSelected !== 1 ? 's' : ''}, pero solo se pueden añadir ${filesAccepted}. Se han tomado los primeros ${filesAccepted} archivos y se han descartado ${filesRejected}.`,
          duration: 8000,
        })
        
        filesToAdd = validFiles.slice(0, availableSlots)
      }

      // Crear archivos iniciales con estado pending
      const newFiles: UploadFile[] = filesToAdd.map((file) => {
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
          // Valores por defecto para multi-facturas
          splitMode: 'auto',
          manualPages: '',
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

  // Marcar/unmarcar un archivo como multi-factura
  const toggleMultiInvoice = useCallback((fileId: string, value: boolean) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === fileId ? { ...f, isMultiInvoice: value, splitMode: 'auto' } : f)),
    )
  }, [])

  // Cambiar el modo de división (auto/manual)
  const setSplitMode = useCallback((fileId: string, mode: 'auto' | 'manual') => {
    setFiles((prev) =>
      prev.map((f) =>
        f.id === fileId
          ? { ...f, splitMode: mode, manualPages: mode === 'auto' ? '' : f.manualPages }
          : f,
      ),
    )
  }, [])

  // Establecer las páginas manuales
  const setManualPages = useCallback((fileId: string, pages: string) => {
    setFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, manualPages: pages } : f)))
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

      // 🚀 PRE-GENERAR CÓDIGOS PARA TODOS LOS ARCHIVOS (sin race conditions)
      let pregeneratedCodes: string[] = []
      try {
        console.log('[UPLOAD MAIN] Pre-generating codes for', validFiles.length, 'files')
        const codesResult = await pregenerateCodes(validFiles.length)

        if (!codesResult.success || !codesResult.codes) {
          throw new Error(codesResult.error || 'Error pre-generando códigos')
        }

        pregeneratedCodes = codesResult.codes
        console.log('🎯 [UPLOAD MAIN] Códigos pre-generados:', pregeneratedCodes)
      } catch (error) {
        console.error('❌ [UPLOAD MAIN] Error pre-generando códigos:', error)
        toast.error('Error pre-generando códigos únicos')
        return
      }

      console.log('[UPLOAD MAIN] Creating upload promises for', validFiles.length, 'files')

      // 🚀 CONTROL DE CONCURRENCIA: Procesar en batches para evitar sobrecargar S3
      const MAX_CONCURRENT_UPLOADS = CONFIG.UPLOAD_MAX_CONCURRENT
      const DELAY_BETWEEN_BATCHES = CONFIG.UPLOAD_BATCH_DELAY_MS

      console.log('[UPLOAD MAIN] Using batched upload strategy:', {
        maxConcurrent: MAX_CONCURRENT_UPLOADS,
        delayBetweenBatches: DELAY_BETWEEN_BATCHES,
        totalFiles: validFiles.length,
        totalBatches: Math.ceil(validFiles.length / MAX_CONCURRENT_UPLOADS),
      })

      const allResults: PromiseSettledResult<UploadFile>[] = []

      for (let i = 0; i < validFiles.length; i += MAX_CONCURRENT_UPLOADS) {
        const batch = validFiles.slice(i, i + MAX_CONCURRENT_UPLOADS)
        const batchNumber = Math.floor(i / MAX_CONCURRENT_UPLOADS) + 1
        const totalBatches = Math.ceil(validFiles.length / MAX_CONCURRENT_UPLOADS)

        console.log(`[UPLOAD MAIN] Processing batch ${batchNumber} of ${totalBatches}`)
        console.log(`[UPLOAD MAIN] Batch files: ${batch.map((f) => f.name).join(', ')}`)

        // Subir batch actual con códigos pre-asignados
        const batchPromises = batch.map((file, batchIndex) => {
          const fileIndex = i + batchIndex
          const preAssignedCode = pregeneratedCodes[fileIndex]
          console.log(
            `[UPLOAD MAIN] Creating promise ${fileIndex + 1} for file:`,
            file.name,
            'with code:',
            preAssignedCode,
          )
          return uploadSingleFile(file, preAssignedCode)
        })

        // Esperar a que termine el batch actual
        console.log(`[UPLOAD MAIN] Waiting for batch ${batchNumber} to complete...`)
        const batchResults = await Promise.allSettled(batchPromises)
        allResults.push(...batchResults)

        console.log(`[UPLOAD MAIN] Batch ${batchNumber} completed:`, {
          successful: batchResults.filter((r) => r.status === 'fulfilled').length,
          failed: batchResults.filter((r) => r.status === 'rejected').length,
        })

        // Delay entre batches (excepto en el último)
        if (i + MAX_CONCURRENT_UPLOADS < validFiles.length) {
          console.log(`[UPLOAD MAIN] Waiting ${DELAY_BETWEEN_BATCHES}ms before next batch...`)
          await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_BATCHES))
        }
      }

      console.log('[UPLOAD MAIN] All batches completed')
      const results = allResults

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

        // Revalidar páginas del proyecto para actualizar la tabla
        try {
          console.log('[UPLOAD MAIN] Revalidating project pages...')
          const revalidationResult = await revalidateProjectPages(projectId)
          if (revalidationResult.success) {
            console.log('[UPLOAD MAIN] Project pages revalidated successfully')
          } else {
            console.error(
              '[UPLOAD MAIN] Failed to revalidate project pages:',
              revalidationResult.error,
            )
          }
        } catch (revalidationError) {
          console.error('[UPLOAD MAIN] Error during revalidation:', revalidationError)
          // No fallar por esto - los uploads fueron exitosos
        }

        // Llamar callback si se provee (para actualizar tabla de documentos)
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
    toggleMultiInvoice,
    setSplitMode,
    setManualPages,
  }
}
