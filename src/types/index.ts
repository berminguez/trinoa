// ============================================================================
// EIDETIK MVP - TIPOS TYPESCRIPT
// ============================================================================

// Re-export tipos de Payload para facilitar el uso
export type { Media, User, Resource } from '../payload-types'

// ============================================================================
// TIPOS PARA CHUNKS DE VIDEO
// ============================================================================

export interface TranscriptionSegment {
  text: string
  start_ms: number
  end_ms: number
}

export interface VideoChunk {
  id: number
  start_ms: number // en milisegundos
  end_ms: number // en milisegundos
  namespace: string
  resourceId: string
  chunkIndex: number
  timeStart: number // en milisegundos (legacy, mantener para compatibilidad)
  timeEnd: number // en milisegundos (legacy, mantener para compatibilidad)
  transcription: TranscriptionSegment[]
  description: string
  screenshots: string[] // Array de screenshot IDs
  metadata: {
    chunkDuration: number
    transcriptionText: string
    screenshotCount: number
    processingTime: number
  }
}

// ============================================================================
// TIPOS PARA WORKERS Y JOBS
// ============================================================================

export interface VideoProcessingJob {
  resourceId: string
  videoUrl: string
  fileName: string
  fileSize: number
  duration?: number
  namespace: string
  filters: Record<string, unknown>
  user_metadata: Record<string, unknown>
}

export interface EmbeddingJob {
  resourceId: string
  namespace: string
  triggeredBy: 'video-processing' | 'manual' | 'api'
  chunks: VideoChunk[]
  metadata?: {
    videoTitle?: string // Mantener para compatibilidad
    documentTitle?: string // Para documentos
    totalDuration?: number
    totalPages?: number // Para documentos PDF
    chunkCount?: number
  }
}

export interface JobProgress {
  current: number
  total: number
  stage: string
  details?: string
}

// ============================================================================
// TIPOS PARA PROCESAMIENTO DE VIDEO
// ============================================================================

export interface VideoSegment {
  id: string
  resourceId: string
  startTime: number
  endTime: number
  transcript: string
  imageUrl?: string
  description?: string
}

export interface TranscriptionResult {
  text: string
  segments: Array<{
    text: string
    start: number
    end: number
  }>
}

export interface SceneDetectionResult {
  scenes: Array<{
    start: number
    end: number
  }>
}

// ============================================================================
// TIPOS PARA VECTOR STORE
// ============================================================================

export interface VectorMetadata {
  resourceId: string
  segmentId: string
  startTime: number // Legacy field for compatibility
  endTime: number // Legacy field for compatibility
  start_ms: number // Tiempo de inicio en milisegundos (nuevo formato)
  end_ms: number // Tiempo de fin en milisegundos (nuevo formato)
  namespace: string // Namespace del contenido
  type: 'video' | 'audio' | 'pdf' | 'ppt'
  transcript: string
  description?: string
  fileName: string
  chunkIndex: number
}

export interface PineconeVector {
  id: string
  values: number[]
  metadata: VectorMetadata
}

// ============================================================================
// TIPOS PARA API RESPONSES
// ============================================================================

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface ResourceStatusResponse {
  id: string
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'failed' | 'needs_review'
  progress: number
  createdAt: string
  updatedAt: string
  logs?: Array<{
    step: string
    status: string
    at: string
    details?: string
  }>
}

// ============================================================================
// TIPOS PARA WEBHOOKS
// ============================================================================

export interface WebhookPayload {
  event: 'resource.processing' | 'resource.completed' | 'resource.failed'
  resourceId: string
  status: string
  timestamp: string
  data?: Record<string, unknown>
}

export interface WebhookConfig {
  url: string
  secret: string
  events: string[]
  active: boolean
}
