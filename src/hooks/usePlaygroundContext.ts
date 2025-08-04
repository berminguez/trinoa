import { useEffect, useCallback, useMemo } from 'react'

import {
  usePlaygroundContextStore,
  useContextDisplayState,
} from '@/stores/playground-context-store'
import type {
  PlaygroundProject,
  PlaygroundVideo,
  ChatContext,
  ContextDisplayState,
} from '@/types/playground'

/**
 * Hook personalizado para integrar el contexto de playground con componentes
 *
 * Proporciona:
 * - Todas las funcionalidades del store
 * - Carga automática de datos
 * - Helpers para UI
 * - Validación y limpieza de datos
 * - Estados computados para display
 */
export function usePlaygroundContext() {
  // Obtener todo el estado y acciones del store
  const store = usePlaygroundContextStore()
  const displayState = useContextDisplayState()

  // Destructuring para facilitar el uso
  const {
    // Estado de selección
    selectedProject,
    selectedVideos,
    allVideosSelected,

    // Datos disponibles
    availableProjects,
    availableVideos,

    // Estados de carga
    isLoadingProjects,
    isLoadingVideos,

    // Estados de error
    projectsError,
    videosError,

    // Timestamp
    lastUpdated,

    // Acciones principales
    setSelectedProject,
    setSelectedVideos,
    toggleVideo,
    toggleAllVideos,
    resetContext,

    // Acciones de datos
    setAvailableProjects,
    setAvailableVideos,

    // Acciones de loading/error
    setLoadingProjects,
    setLoadingVideos,
    setProjectsError,
    setVideosError,

    // Utilidades
    getFilteredVideos,
    getChatContext,
    isProjectAvailable,
    isVideoAvailable,
    validateAndCleanPersistedData,
    hydrateAfterDataLoad,
  } = store

  // Estados computados para UI
  const isLoading = useMemo(() => {
    return isLoadingProjects || isLoadingVideos
  }, [isLoadingProjects, isLoadingVideos])

  const hasErrors = useMemo(() => {
    return !!(projectsError || videosError)
  }, [projectsError, videosError])

  const hasData = useMemo(() => {
    return availableProjects.length > 0 || availableVideos.length > 0
  }, [availableProjects.length, availableVideos.length])

  const isEmpty = useMemo(() => {
    return !isLoading && !hasErrors && !hasData
  }, [isLoading, hasErrors, hasData])

  // Obtener videos filtrados con memoización
  const filteredVideos = useMemo(() => {
    return getFilteredVideos()
  }, [getFilteredVideos])

  // Obtener contexto para chat con memoización
  const chatContext = useMemo(() => {
    const context = getChatContext()
    console.log('🎯 Hook chatContext computed:', {
      selectedProject: selectedProject?.title || 'null',
      selectedProjectId: selectedProject?.id || 'null',
      selectedVideos: selectedVideos.map((v) => `${v.title} (${v.id})`),
      selectedVideosCount: selectedVideos.length,
      allVideosSelected,
      filteredVideos: filteredVideos.length,
      contextScope: context.scope,
      contextVideoCount: context.videoCount,
      contextProjects: context.projects,
      contextVideos: context.videos,
    })
    return context
  }, [getChatContext, selectedProject, selectedVideos, allVideosSelected, filteredVideos])

  // Helper para obtener texto descriptivo del contexto actual
  const getContextDescription = useCallback((): string => {
    switch (displayState.type) {
      case 'all_projects':
        return `Buscando en todos los proyectos (${availableProjects.length} proyecto${availableProjects.length !== 1 ? 's' : ''})`

      case 'specific_project':
        return `Buscando en: ${displayState.projectName}`

      case 'specific_project_with_videos':
        return `Buscando en: ${displayState.projectName} (${displayState.videoCount} video${displayState.videoCount !== 1 ? 's' : ''})`

      default:
        return 'Contexto no definido'
    }
  }, [displayState, availableProjects.length])

  // Helper para verificar si hay selecciones específicas
  const hasSpecificSelections = useMemo(() => {
    return selectedProject !== null || (!allVideosSelected && selectedVideos.length > 0)
  }, [selectedProject, allVideosSelected, selectedVideos.length])

  // Helper para obtener estadísticas del contexto
  const getContextStats = useCallback(() => {
    return {
      totalProjects: availableProjects.length,
      totalVideos: availableVideos.length,
      filteredVideos: filteredVideos.length,
      selectedVideos: selectedVideos.length,
      hasSelection: hasSpecificSelections,
      scope: chatContext.scope,
    }
  }, [
    availableProjects.length,
    availableVideos.length,
    filteredVideos.length,
    selectedVideos.length,
    hasSpecificSelections,
    chatContext.scope,
  ])

  // Helper para seleccionar proyecto por ID
  const selectProjectById = useCallback(
    (projectId: string | null) => {
      if (projectId === null) {
        setSelectedProject(null)
        return true
      }

      const project = availableProjects.find((p) => p.id === projectId)
      if (project) {
        setSelectedProject(project)
        return true
      }

      console.warn(`Proyecto con ID "${projectId}" no encontrado`)
      return false
    },
    [availableProjects, setSelectedProject],
  )

  // Helper para seleccionar videos por IDs
  const selectVideosByIds = useCallback(
    (videoIds: string[]) => {
      const videos = availableVideos.filter((v) => videoIds.includes(v.id))
      setSelectedVideos(videos)
      return videos.length
    },
    [availableVideos, setSelectedVideos],
  )

  // Helper para toggle de video por ID
  const toggleVideoById = useCallback(
    (videoId: string) => {
      const video = availableVideos.find((v) => v.id === videoId)
      if (video) {
        toggleVideo(video)
        return true
      }

      console.warn(`Video con ID "${videoId}" no encontrado`)
      return false
    },
    [availableVideos, toggleVideo],
  )

  // Helper para limpiar errores
  const clearErrors = useCallback(() => {
    setProjectsError(null)
    setVideosError(null)
  }, [setProjectsError, setVideosError])

  // Helper para forzar recarga de datos
  const refreshData = useCallback(() => {
    clearErrors()
    // Aquí se podría triggear la recarga de datos desde server actions
    // Por ahora solo limpiamos errores
  }, [clearErrors])

  // Helper para validar el estado actual
  const validateCurrentState = useCallback(() => {
    const result = validateAndCleanPersistedData()

    if (result.cleaned) {
      console.log('🧹 Contexto limpiado:', {
        removedProject: result.removedProject,
        removedVideosCount: result.removedVideosCount,
      })
    }

    return result
  }, [validateAndCleanPersistedData])

  // Auto-validación cuando cambian los datos disponibles
  useEffect(() => {
    if (hasData) {
      const hydrateResult = hydrateAfterDataLoad()

      if (hydrateResult.hydrated && hydrateResult.cleanResult?.cleaned) {
        console.log('🔄 Datos hidratados y limpiados automáticamente')
      }
    }
  }, [hasData, hydrateAfterDataLoad])

  // Optimización: Mapas de búsqueda para performance con listas grandes
  const projectsMap = useMemo(() => {
    const map = new Map<string, PlaygroundProject>()
    availableProjects.forEach((project) => map.set(project.id, project))
    return map
  }, [availableProjects])

  const videosMap = useMemo(() => {
    const map = new Map<string, PlaygroundVideo>()
    availableVideos.forEach((video) => map.set(video.id, video))
    return map
  }, [availableVideos])

  // Cache de videos por proyecto para evitar filtrado repetitivo
  const videosByProject = useMemo(() => {
    const map = new Map<string, PlaygroundVideo[]>()

    // Agrupar videos por proyecto
    availableVideos.forEach((video) => {
      const projectVideos = map.get(video.projectId) || []
      projectVideos.push(video)
      map.set(video.projectId, projectVideos)
    })

    return map
  }, [availableVideos])

  // Versión optimizada de getFilteredVideos para listas grandes
  const getFilteredVideosOptimized = useCallback(() => {
    if (!selectedProject) {
      // Todos los proyectos - retornar todos los videos
      return availableVideos
    }

    // Proyecto específico - usar cache
    return videosByProject.get(selectedProject.id) || []
  }, [selectedProject, availableVideos, videosByProject])

  // Helpers optimizados usando los mapas
  const selectProjectByIdOptimized = useCallback(
    (projectId: string | null) => {
      if (projectId === null) {
        setSelectedProject(null)
        return true
      }

      const project = projectsMap.get(projectId)
      if (project) {
        setSelectedProject(project)
        return true
      }

      console.warn(`Proyecto con ID "${projectId}" no encontrado`)
      return false
    },
    [projectsMap, setSelectedProject],
  )

  const selectVideosByIdsOptimized = useCallback(
    (videoIds: string[]) => {
      const videos: PlaygroundVideo[] = []

      for (const videoId of videoIds) {
        const video = videosMap.get(videoId)
        if (video) {
          videos.push(video)
        }
      }

      setSelectedVideos(videos)
      return videos.length
    },
    [videosMap, setSelectedVideos],
  )

  const toggleVideoByIdOptimized = useCallback(
    (videoId: string) => {
      const video = videosMap.get(videoId)
      if (video) {
        toggleVideo(video)
        return true
      }

      console.warn(`Video con ID "${videoId}" no encontrado`)
      return false
    },
    [videosMap, toggleVideo],
  )

  // Helper para verificar disponibilidad optimizada
  const isProjectAvailableOptimized = useCallback(
    (projectId: string) => {
      return projectsMap.has(projectId)
    },
    [projectsMap],
  )

  const isVideoAvailableOptimized = useCallback(
    (videoId: string) => {
      return videosMap.has(videoId)
    },
    [videosMap],
  )

  // Stats de performance para debugging
  const getPerformanceStats = useCallback(() => {
    return {
      totalProjects: availableProjects.length,
      totalVideos: availableVideos.length,
      projectsMapSize: projectsMap.size,
      videosMapSize: videosMap.size,
      videosByProjectEntries: videosByProject.size,
      memoryOptimized: availableProjects.length > 50 || availableVideos.length > 100,
    }
  }, [
    availableProjects.length,
    availableVideos.length,
    projectsMap.size,
    videosMap.size,
    videosByProject.size,
  ])

  // Helper para búsqueda de texto (útil para filtros futuros)
  const searchProjects = useCallback(
    (searchTerm: string): PlaygroundProject[] => {
      if (!searchTerm.trim()) return availableProjects

      const term = searchTerm.toLowerCase()
      return availableProjects.filter(
        (project) =>
          project.title.toLowerCase().includes(term) || project.slug.toLowerCase().includes(term),
      )
    },
    [availableProjects],
  )

  const searchVideos = useCallback(
    (searchTerm: string): PlaygroundVideo[] => {
      if (!searchTerm.trim()) return filteredVideos

      const term = searchTerm.toLowerCase()
      return filteredVideos.filter(
        (video) =>
          video.title.toLowerCase().includes(term) ||
          video.projectTitle.toLowerCase().includes(term),
      )
    },
    [filteredVideos],
  )

  // Retornar la API completa del hook
  return {
    // Estado principal
    state: {
      selectedProject,
      selectedVideos,
      allVideosSelected,
      availableProjects,
      availableVideos,
      filteredVideos,
      lastUpdated,
    },

    // Estados computados
    computed: {
      isLoading,
      isLoadingProjects,
      isLoadingVideos,
      hasErrors,
      projectsError,
      videosError,
      hasData,
      isEmpty,
      hasSpecificSelections,
      displayState,
      chatContext,
    },

    // Acciones principales
    actions: {
      setSelectedProject,
      setSelectedVideos,
      toggleVideo,
      toggleAllVideos,
      resetContext,
      setAvailableProjects,
      setAvailableVideos,
      setLoadingProjects,
      setLoadingVideos,
      setProjectsError,
      setVideosError,
    },

    // Helpers específicos
    helpers: {
      getContextDescription,
      getContextStats,
      selectProjectById,
      selectVideosByIds,
      toggleVideoById,
      clearErrors,
      refreshData,
      validateCurrentState,
      isProjectAvailable,
      isVideoAvailable,
    },

    // Helpers optimizados para listas grandes
    optimized: {
      getFilteredVideos: getFilteredVideosOptimized,
      selectProjectById: selectProjectByIdOptimized,
      selectVideosByIds: selectVideosByIdsOptimized,
      toggleVideoById: toggleVideoByIdOptimized,
      isProjectAvailable: isProjectAvailableOptimized,
      isVideoAvailable: isVideoAvailableOptimized,
      getPerformanceStats,
      searchProjects,
      searchVideos,
    },

    // Acceso directo a utilidades del store
    utils: {
      getFilteredVideos,
      getChatContext,
      validateAndCleanPersistedData,
      hydrateAfterDataLoad,
    },
  }
}

/**
 * Hook simplificado que solo retorna el contexto para el chat
 * Útil cuando solo necesitas enviar el contexto a la IA
 */
export function useChatContext(): ChatContext {
  const { getChatContext } = usePlaygroundContextStore()
  return useMemo(() => getChatContext(), [getChatContext])
}

/**
 * Hook que retorna solo el estado de display
 * Útil para componentes que solo muestran información del contexto
 */
export function useContextDisplay() {
  const displayState = useContextDisplayState()
  const { availableProjects } = usePlaygroundContextStore()

  const getContextDescription = useCallback((): string => {
    switch (displayState.type) {
      case 'all_projects':
        return `Buscando en todos los proyectos (${availableProjects.length} proyecto${availableProjects.length !== 1 ? 's' : ''})`

      case 'specific_project':
        return `Buscando en: ${displayState.projectName}`

      case 'specific_project_with_videos':
        return `Buscando en: ${displayState.projectName} (${displayState.videoCount} video${displayState.videoCount !== 1 ? 's' : ''})`

      default:
        return 'Contexto no definido'
    }
  }, [displayState, availableProjects.length])

  return {
    displayState,
    description: getContextDescription(),
  }
}
