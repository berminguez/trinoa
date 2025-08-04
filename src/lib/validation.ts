// ============================================================================
// EIDETIK MVP - VALIDACIONES DE ARCHIVOS
// ============================================================================

import { CONFIG, VIDEO_PROCESSING } from './config'

// ============================================================================
// TIPOS PARA VALIDACIONES
// ============================================================================

export interface FileValidationResult {
  isValid: boolean
  error?: string
  warnings?: string[]
  metadata?: {
    duration?: number
    size: number
    mimeType: string
    format?: string
  }
}

export interface VideoFile {
  size: number
  mimeType: string
  filename?: string
}

// ============================================================================
// VALIDACIONES BÁSICAS DE ARCHIVO
// ============================================================================

export function validateFileSize(file: VideoFile): FileValidationResult {
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

  // Warning si el archivo es muy grande (>1GB)
  if (fileSize > 1024 * 1024 * 1024) {
    warnings.push(`Large file detected (${formatBytes(fileSize)}). Processing may take longer.`)
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

export function validateMimeType(file: VideoFile): FileValidationResult {
  const { mimeType } = file
  const supportedTypes = VIDEO_PROCESSING.SUPPORTED_MIME_TYPES as readonly string[]

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
// VALIDACIONES ESPECÍFICAS DE VÍDEO
// ============================================================================

export function validateVideoFile(file: VideoFile): FileValidationResult {
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
  const supportedFormats = VIDEO_PROCESSING.SUPPORTED_FORMATS as readonly string[]

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

// ============================================================================
// VALIDACIONES DE DURACIÓN
// ============================================================================

export function validateVideoDuration(duration: number): FileValidationResult {
  if (duration > CONFIG.MAX_VIDEO_DURATION) {
    return {
      isValid: false,
      error: `Video duration ${formatDuration(duration)} exceeds maximum allowed duration of ${formatDuration(CONFIG.MAX_VIDEO_DURATION)}`,
      metadata: {
        duration,
        size: 0,
        mimeType: 'video/*',
      },
    }
  }

  const warnings: string[] = []

  // Warning para vídeos muy largos (>1 hora)
  if (duration > 3600) {
    warnings.push(
      `Long video detected (${formatDuration(duration)}). Processing may take significant time.`,
    )
  }

  return {
    isValid: true,
    warnings: warnings.length > 0 ? warnings : undefined,
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

export const validateMediaFileHook = ({ data }: { data: { file?: VideoFile } }) => {
  if (!data?.file) {
    throw new Error('No file provided for upload')
  }

  const validation = validateVideoFile(data.file)

  if (!validation.isValid) {
    throw new Error(validation.error)
  }

  // Log warnings but don't fail
  if (validation.warnings) {
    console.warn('Upload warnings:', validation.warnings)
  }

  return data
}
