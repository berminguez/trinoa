import type { Project, Resource } from '@/payload-types'

// Tipo para representar un proyecto en el contexto de playground
export interface PlaygroundProject {
  id: string
  title: string
  slug: string
  available?: boolean // Indica si el proyecto está disponible o fue eliminado
}

// Tipo para representar un video/recurso en el contexto de playground
export interface PlaygroundVideo {
  id: string
  title: string
  projectId: string
  projectTitle: string
  type: 'video' | 'audio' | 'pdf' | 'ppt' | 'document' | 'image'
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'failed' | 'needs_review'
  available?: boolean // Indica si el video está disponible o fue eliminado
}

// Estados de selección para el contexto
export interface ContextSelection {
  // Proyecto seleccionado: null significa "Todos los proyectos"
  selectedProject: PlaygroundProject | null
  // Videos seleccionados: array vacío significa "Todos los videos"
  selectedVideos: PlaygroundVideo[]
  // Flag para indicar si "Todos los videos" está marcado
  allVideosSelected: boolean
}

// Estado completo del contexto de playground
export interface PlaygroundContextState extends ContextSelection {
  // Datos disponibles del usuario
  availableProjects: PlaygroundProject[]
  availableVideos: PlaygroundVideo[]
  // Estados de carga
  isLoadingProjects: boolean
  isLoadingVideos: boolean
  // Estados de error
  projectsError: string | null
  videosError: string | null
  // Última actualización
  lastUpdated: number
}

// Contexto que se envía a la IA con cada consulta
export interface ChatContext {
  // IDs y nombres de proyectos seleccionados
  projects: {
    ids: string[]
    names: string[]
  }
  // IDs y nombres de videos seleccionados
  videos: {
    ids: string[]
    names: string[]
  }
  // Información adicional para la IA
  scope: 'all_projects' | 'specific_project' | 'specific_videos'
  projectCount: number
  videoCount: number
}

// Acciones del store de contexto
export interface PlaygroundContextActions {
  // Acciones de selección
  setSelectedProject: (project: PlaygroundProject | null) => void
  setSelectedVideos: (videos: PlaygroundVideo[]) => void
  toggleVideo: (video: PlaygroundVideo) => void
  toggleAllVideos: () => void
  clearAllVideoSelections: () => void
  resetContext: () => void

  // Acciones de datos
  setAvailableProjects: (projects: PlaygroundProject[]) => void
  setAvailableVideos: (videos: PlaygroundVideo[]) => void

  // Acciones de loading/error
  setLoadingProjects: (loading: boolean) => void
  setLoadingVideos: (loading: boolean) => void
  setProjectsError: (error: string | null) => void
  setVideosError: (error: string | null) => void

  // Utilidades
  getFilteredVideos: () => PlaygroundVideo[]
  getChatContext: () => ChatContext
  isProjectAvailable: (projectId: string) => boolean
  isVideoAvailable: (videoId: string) => boolean

  // Validación y limpieza de datos persistidos
  validateAndCleanPersistedData: () => {
    cleaned: boolean
    removedProject: boolean
    removedVideosCount: number
  }
  hydrateAfterDataLoad: () => {
    hydrated: boolean
    reason?: string
    cleanResult?: {
      cleaned: boolean
      removedProject: boolean
      removedVideosCount: number
    }
    dataAvailable?: {
      projects: number
      videos: number
    }
  }
}

// Estado combinado del store
export type PlaygroundContextStore = PlaygroundContextState & PlaygroundContextActions

// Tipos para transformar datos de PayloadCMS a tipos de playground
export type ProjectToPlaygroundProject = (project: Project) => PlaygroundProject
export type ResourceToPlaygroundVideo = (resource: Resource) => PlaygroundVideo

// Respuesta del server action para obtener datos
export interface PlaygroundDataResponse {
  success: boolean
  data?: {
    projects: PlaygroundProject[]
    videos: PlaygroundVideo[]
  }
  error?: string
}

// Parámetros para filtrar videos por proyecto
export interface VideoFilterParams {
  projectId?: string | null
  includeUnavailable?: boolean
}

// Opciones para el selector de proyectos
export interface ProjectSelectorOption {
  value: string | null // null para "Todos los proyectos"
  label: string
  project?: PlaygroundProject
}

// Opciones para el selector de videos con metadatos adicionales
export interface VideoSelectorOption {
  value: string
  label: string
  video: PlaygroundVideo
  isSelected: boolean
  isAvailable: boolean
}

// Estados del contexto para mostrar al usuario
export type ContextDisplayState =
  | { type: 'all_projects' }
  | { type: 'specific_project'; projectName: string }
  | { type: 'specific_project_with_videos'; projectName: string; videoCount: number }

// Configuración de persistencia para localStorage
export interface PlaygroundContextPersistConfig {
  name: 'playground-context'
  version: 1
  // Solo persistir selecciones, no datos ni estados de loading
  partialize: (state: PlaygroundContextStore) => ContextSelection
}
