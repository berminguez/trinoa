// ============================================================================
// EIDETIK MVP - VALIDACIONES DE ARCHIVOS
// ============================================================================

import { CONFIG, DOCUMENT_PROCESSING } from './config'

// ============================================================================
// TIPOS PARA VALIDACIONES
// ============================================================================

export interface FileValidationResult {
  isValid: boolean
  error?: string
  warnings?: string[]
  metadata?: {
    duration?: number
    pages?: number
    size: number
    mimeType: string
    format?: string
  }
}

export interface DocumentFile {
  size: number
  mimeType: string
  filename?: string
}

// Mantener VideoFile para compatibilidad
export type VideoFile = DocumentFile

// ============================================================================
// VALIDACIONES BÁSICAS DE ARCHIVO
// ============================================================================

export function validateFileSize(file: DocumentFile): FileValidationResult {
  const fileSize = file.size

  if (fileSize > CONFIG.MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: `File size ${formatBytes(fileSize)} exceeds maximum allowed size of ${formatBytes(CONFIG.MAX_FILE_SIZE)}`,
      metadata: {
        size: fileSize,
        mimeType: file.mimeType,
      },
    }
  }

  const warnings: string[] = []

  // Warning si el archivo es muy grande (>50MB)
  if (fileSize > 50 * 1024 * 1024) {
    warnings.push(`Large document detected (${formatBytes(fileSize)}). Processing may take longer.`)
  }

  return {
    isValid: true,
    warnings: warnings.length > 0 ? warnings : undefined,
    metadata: {
      size: fileSize,
      mimeType: file.mimeType,
    },
  }
}

export function validateMimeType(file: DocumentFile): FileValidationResult {
  const { mimeType } = file
  const supportedTypes = DOCUMENT_PROCESSING.SUPPORTED_MIME_TYPES as readonly string[]

  if (!supportedTypes.includes(mimeType)) {
    return {
      isValid: false,
      error: `Unsupported file type: ${mimeType}. Supported types: ${supportedTypes.join(', ')}`,
      metadata: {
        size: file.size,
        mimeType,
      },
    }
  }

  return {
    isValid: true,
    metadata: {
      size: file.size,
      mimeType,
    },
  }
}

// ============================================================================
// VALIDACIONES ESPECÍFICAS DE DOCUMENTOS
// ============================================================================

export function validateDocumentFile(file: DocumentFile): FileValidationResult {
  // Validar tamaño
  const sizeValidation = validateFileSize(file)
  if (!sizeValidation.isValid) {
    return sizeValidation
  }

  // Validar tipo MIME
  const mimeValidation = validateMimeType(file)
  if (!mimeValidation.isValid) {
    return mimeValidation
  }

  // Validar extensión del archivo
  const fileName = file.filename || ''
  const extension = fileName.split('.').pop()?.toLowerCase()
  const supportedFormats = DOCUMENT_PROCESSING.SUPPORTED_FORMATS as readonly string[]

  if (!extension || !supportedFormats.includes(extension)) {
    return {
      isValid: false,
      error: `Unsupported file extension: .${extension}. Supported formats: ${supportedFormats.join(', ')}`,
      metadata: {
        size: file.size,
        mimeType: file.mimeType,
        format: extension,
      },
    }
  }

  // Combinar warnings
  const allWarnings = [...(sizeValidation.warnings || []), ...(mimeValidation.warnings || [])]

  return {
    isValid: true,
    warnings: allWarnings.length > 0 ? allWarnings : undefined,
    metadata: {
      size: file.size,
      mimeType: file.mimeType,
      format: extension,
    },
  }
}

// Mantener función original para compatibilidad
export const validateVideoFile = validateDocumentFile

// ============================================================================
// VALIDACIONES DE DOCUMENTOS PDF
// ============================================================================

export function validateDocumentPages(pages: number): FileValidationResult {
  if (pages > CONFIG.MAX_DOCUMENT_PAGES) {
    return {
      isValid: false,
      error: `Document has ${pages} pages, exceeding maximum allowed pages of ${CONFIG.MAX_DOCUMENT_PAGES}`,
      metadata: {
        pages,
        size: 0,
        mimeType: 'application/pdf',
      },
    }
  }

  const warnings: string[] = []

  // Warning para documentos muy largos (>100 páginas)
  if (pages > 100) {
    warnings.push(`Large document detected (${pages} pages). Processing may take significant time.`)
  }

  return {
    isValid: true,
    warnings: warnings.length > 0 ? warnings : undefined,
    metadata: {
      pages,
      size: 0,
      mimeType: 'application/pdf',
    },
  }
}

// Mantener función original para compatibilidad
export const validateVideoDuration: (duration: number) => FileValidationResult = (
  duration: number,
) => {
  return {
    isValid: true,
    metadata: {
      duration,
      size: 0,
      mimeType: 'video/*',
    },
  }
}

// ============================================================================
// UTILIDADES DE FORMATO
// ============================================================================

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = Math.floor(seconds % 60)

  if (hours > 0) {
    return `${hours}h ${minutes}m ${remainingSeconds}s`
  } else if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`
  } else {
    return `${remainingSeconds}s`
  }
}

// ============================================================================
// HOOKS DE VALIDACIÓN PARA PAYLOAD
// ============================================================================

export const validateMediaFileHook = ({ data }: { data: { file?: DocumentFile } }) => {
  if (!data?.file) {
    throw new Error('No file provided for upload')
  }

  const validation = validateDocumentFile(data.file)

  if (!validation.isValid) {
    throw new Error(validation.error)
  }

  // Log warnings but don't fail
  if (validation.warnings) {
    console.warn('Upload warnings:', validation.warnings)
  }

  return data
}
