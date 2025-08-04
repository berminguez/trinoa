import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  PlaygroundContextStore,
  PlaygroundProject,
  PlaygroundVideo,
  ContextSelection,
  ChatContext,
  ContextDisplayState,
} from '@/types/playground'

const initialState = {
  // Estados de selección
  selectedProject: null,
  selectedVideos: [],
  allVideosSelected: true,

  // Datos disponibles
  availableProjects: [],
  availableVideos: [],

  // Estados de carga
  isLoadingProjects: false,
  isLoadingVideos: false,

  // Estados de error
  projectsError: null,
  videosError: null,

  // Última actualización
  lastUpdated: 0,
}

export const usePlaygroundContextStore = create<PlaygroundContextStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Acciones de selección
      setSelectedProject: (project) => {
        set((state) => {
          // Al cambiar proyecto, resetear videos según PRD
          const newState: Partial<PlaygroundContextStore> = {
            selectedProject: project,
            selectedVideos: [],
            allVideosSelected: true,
          }

          return newState
        })
      },

      setSelectedVideos: (videos) => {
        set({
          selectedVideos: videos,
          allVideosSelected: videos.length === 0,
        })
      },

      // Acción específica para desmarcar TODOS los videos (incluyendo "Todos los videos")
      clearAllVideoSelections: () => {
        console.log('🗑️ Desmarcando TODOS los videos (incluyendo "Todos los videos")')
        set({
          selectedVideos: [],
          allVideosSelected: false,
        })
      },

      toggleVideo: (video) => {
        set((state) => {
          console.log(`🎥 toggleVideo "${video.title}":`, {
            videoId: video.id,
            videoProjectId: video.projectId,
            allVideosSelected: state.allVideosSelected,
            currentSelectedCount: state.selectedVideos.length,
            currentSelectedVideos: state.selectedVideos.map((v) => `${v.title} (${v.id})`),
            selectedProject: state.selectedProject?.title || 'null',
            selectedProjectId: state.selectedProject?.id || 'null',
          })

          // CASO ESPECIAL: Si "Todos los videos" está marcado,
          // clicking un video debe desmarcar "todos" y seleccionar SOLO ese video
          if (state.allVideosSelected) {
            console.log(
              `🔓 "Todos los videos" estaba marcado, cambiando a selección individual de "${video.title}"`,
            )
            const newState = {
              allVideosSelected: false,
              selectedVideos: [video], // Solo este video seleccionado
            }
            console.log('🔄 Nuevo estado después de toggle desde allVideosSelected:', {
              allVideosSelected: newState.allVideosSelected,
              selectedVideos: newState.selectedVideos.map((v) => `${v.title} (${v.id})`),
            })
            return newState
          }

          // CASO NORMAL: Lógica estándar de toggle cuando "Todos los videos" NO está marcado
          const isSelected = state.selectedVideos.some((v) => v.id === video.id)
          let newSelectedVideos: PlaygroundVideo[]

          if (isSelected) {
            // Remover video
            newSelectedVideos = state.selectedVideos.filter((v) => v.id !== video.id)
            console.log(`➖ Removiendo video "${video.title}" de la selección`)
          } else {
            // Agregar video
            newSelectedVideos = [...state.selectedVideos, video]
            console.log(`➕ Agregando video "${video.title}" a la selección`)
          }

          const newAllVideosSelected = newSelectedVideos.length === 0
          console.log(
            `📋 Nuevo estado: ${newSelectedVideos.length} videos seleccionados, allVideosSelected: ${newAllVideosSelected}`,
          )
          console.log('🔄 Videos seleccionados después de toggle:', {
            selectedVideos: newSelectedVideos.map((v) => `${v.title} (${v.id})`),
            allVideosSelected: newAllVideosSelected,
          })

          return {
            selectedVideos: newSelectedVideos,
            allVideosSelected: newAllVideosSelected,
          }
        })
      },

      toggleAllVideos: () => {
        set((state) => {
          console.log('🔄 toggleAllVideos called:', {
            currentAllVideosSelected: state.allVideosSelected,
            currentSelectedVideos: state.selectedVideos.map((v) => `${v.title} (${v.id})`),
            selectedProject: state.selectedProject?.title || 'null',
          })

          const newAllVideosSelected = !state.allVideosSelected
          console.log(
            `🔄 Cambiando allVideosSelected de ${state.allVideosSelected} a ${newAllVideosSelected}`,
          )

          const newState = {
            allVideosSelected: newAllVideosSelected,
            selectedVideos: [], // Limpiar selección específica cuando se activa "todos"
          }

          console.log('🔄 Nuevo estado después de toggleAllVideos:', {
            allVideosSelected: newState.allVideosSelected,
            selectedVideos: newState.selectedVideos,
          })

          return newState
        })
      },

      resetContext: () => {
        set({
          selectedProject: null,
          selectedVideos: [],
          allVideosSelected: true,
        })
      },

      // Acciones de datos
      setAvailableProjects: (projects) => {
        set({
          availableProjects: projects,
          lastUpdated: Date.now(),
          projectsError: null,
        })
      },

      setAvailableVideos: (videos) => {
        console.log('💾 Store setAvailableVideos:', {
          videosCount: videos.length,
          videos: videos.map((v) => `${v.title} (${v.projectId}) [${v.type}/${v.status}]`),
        })
        set({
          availableVideos: videos,
          lastUpdated: Date.now(),
          videosError: null,
        })
      },

      // Acciones de loading/error
      setLoadingProjects: (loading) => set({ isLoadingProjects: loading }),

      setLoadingVideos: (loading) => set({ isLoadingVideos: loading }),

      setProjectsError: (error) => set({ projectsError: error, isLoadingProjects: false }),

      setVideosError: (error) => set({ videosError: error, isLoadingVideos: false }),

      // Utilidades
      getFilteredVideos: () => {
        const { availableVideos, selectedProject } = get()

        console.log('🔍 Store getFilteredVideos DEBUG:', {
          selectedProject: selectedProject?.title || 'null (todos los proyectos)',
          selectedProjectId: selectedProject?.id || 'null',
          availableVideosCount: availableVideos.length,
          availableVideosDebug: availableVideos.map((v) => ({
            title: v.title,
            id: v.id,
            projectId: v.projectId,
            projectTitle: v.projectTitle,
          })),
        })

        if (!selectedProject) {
          // "Todos los proyectos" - devolver todos los videos
          console.log('📋 Devolviendo TODOS los videos:', availableVideos.length)
          return availableVideos
        }

        // Proyecto específico - filtrar por projectId
        console.log('🔍 Filtrando videos para proyecto:', {
          targetProjectId: selectedProject.id,
          targetProjectTitle: selectedProject.title,
        })

        const filtered = availableVideos.filter((video) => {
          const matches = video.projectId === selectedProject.id
          console.log(
            `  📹 Video "${video.title}": projectId="${video.projectId}" vs targetId="${selectedProject.id}" -> ${matches ? '✅' : '❌'}`,
          )
          return matches
        })

        console.log(
          `📋 Resultado filtrado para proyecto "${selectedProject.title}": ${filtered.length} videos`,
          filtered.map((v) => `${v.title} (${v.id})`),
        )
        return filtered
      },

      getChatContext: (): ChatContext => {
        const {
          selectedProject,
          selectedVideos,
          allVideosSelected,
          availableProjects,
          availableVideos,
        } = get()

        console.log('🎯 getChatContext Debug:', {
          selectedProject: selectedProject?.title || 'null',
          selectedProjectId: selectedProject?.id || 'null',
          selectedVideos: selectedVideos.map((v) => `${v.title} (${v.projectId})`),
          selectedVideosCount: selectedVideos.length,
          allVideosSelected,
          availableVideosCount: availableVideos.length,
          availableVideos: availableVideos.map((v) => `${v.title} (${v.projectId})`),
        })

        if (allVideosSelected && !selectedProject) {
          // "Todos los proyectos" y "Todos los videos"
          console.log('🌍 Contexto: Todos los proyectos y todos los videos')
          return {
            projects: {
              ids: availableProjects.map((p) => p.id),
              names: availableProjects.map((p) => p.title),
            },
            videos: {
              ids: availableVideos.map((v) => v.id),
              names: availableVideos.map((v) => v.title),
            },
            scope: 'all_projects',
            projectCount: availableProjects.length,
            videoCount: availableVideos.length,
          }
        }

        if (allVideosSelected && selectedProject) {
          // Proyecto específico con "Todos los videos"
          const filteredVideos = get().getFilteredVideos()
          console.log('🎬 Contexto: Proyecto específico con todos los videos', {
            projectTitle: selectedProject.title,
            projectId: selectedProject.id,
            filteredVideos: filteredVideos.map((v) => `${v.title} (${v.projectId})`),
            filteredVideosCount: filteredVideos.length,
          })
          return {
            projects: {
              ids: [selectedProject.id],
              names: [selectedProject.title],
            },
            videos: {
              ids: filteredVideos.map((v) => v.id),
              names: filteredVideos.map((v) => v.title),
            },
            scope: 'specific_project',
            projectCount: 1,
            videoCount: filteredVideos.length,
          }
        }

        // Videos específicos seleccionados
        console.log('🎥 Contexto: Videos específicos seleccionados', {
          selectedVideosCount: selectedVideos.length,
          selectedVideos: selectedVideos.map((v) => `${v.title} (${v.projectId})`),
        })
        return {
          projects: selectedProject
            ? {
                ids: [selectedProject.id],
                names: [selectedProject.title],
              }
            : {
                ids: [],
                names: [],
              },
          videos: {
            ids: selectedVideos.map((v) => v.id),
            names: selectedVideos.map((v) => v.title),
          },
          scope: 'specific_videos',
          projectCount: selectedProject ? 1 : 0,
          videoCount: selectedVideos.length,
        }
      },

      isProjectAvailable: (projectId) => {
        const { availableProjects } = get()
        return availableProjects.some((project) => project.id === projectId)
      },

      isVideoAvailable: (videoId) => {
        const { availableVideos } = get()
        return availableVideos.some((video) => video.id === videoId)
      },

      // Validar y limpiar datos persistidos que ya no existen
      validateAndCleanPersistedData: () => {
        const state = get()
        let hasChanges = false
        const updates: Partial<PlaygroundContextStore> = {}

        // Validar proyecto seleccionado
        if (state.selectedProject && !state.isProjectAvailable(state.selectedProject.id)) {
          updates.selectedProject = null
          updates.selectedVideos = []
          updates.allVideosSelected = true
          hasChanges = true
        }

        // Validar videos seleccionados
        if (state.selectedVideos.length > 0) {
          const validVideos = state.selectedVideos.filter((video) =>
            state.isVideoAvailable(video.id),
          )

          if (validVideos.length !== state.selectedVideos.length) {
            updates.selectedVideos = validVideos
            updates.allVideosSelected = validVideos.length === 0
            hasChanges = true
          }
        }

        // Aplicar cambios si es necesario
        if (hasChanges) {
          set(updates)
          return {
            cleaned: true,
            removedProject: !!updates.selectedProject === false && !!state.selectedProject,
            removedVideosCount:
              state.selectedVideos.length -
              (updates.selectedVideos?.length || state.selectedVideos.length),
          }
        }

        return { cleaned: false, removedProject: false, removedVideosCount: 0 }
      },

      // Hidratar datos después de cargar proyectos/videos disponibles
      hydrateAfterDataLoad: () => {
        const state = get()

        // Solo validar si tenemos datos disponibles
        if (state.availableProjects.length === 0 && state.availableVideos.length === 0) {
          return { hydrated: false, reason: 'no_data_available' }
        }

        // Validar y limpiar datos que ya no existen
        const cleanResult = state.validateAndCleanPersistedData()

        // Si había proyecto seleccionado, validar que sus videos siguen siendo válidos
        if (state.selectedProject && !state.allVideosSelected) {
          const filteredVideos = state.getFilteredVideos()
          const validSelectedVideos = state.selectedVideos.filter((video) =>
            filteredVideos.some((fv) => fv.id === video.id),
          )

          if (validSelectedVideos.length !== state.selectedVideos.length) {
            set({
              selectedVideos: validSelectedVideos,
              allVideosSelected: validSelectedVideos.length === 0,
            })
          }
        }

        return {
          hydrated: true,
          cleanResult,
          dataAvailable: {
            projects: state.availableProjects.length,
            videos: state.availableVideos.length,
          },
        }
      },
    }),
    {
      name: 'playground-context',
      version: 1,
      // Solo persistir selecciones, no datos ni estados de loading
      partialize: (state): ContextSelection => ({
        selectedProject: state.selectedProject,
        selectedVideos: state.selectedVideos,
        allVideosSelected: state.allVideosSelected,
      }),
      // Migración para versiones futuras
      migrate: (persistedState: any, version: number) => {
        if (version === 0) {
          // Migración desde versión inicial
          return {
            ...persistedState,
            allVideosSelected: persistedState.allVideosSelected ?? true,
          }
        }
        return persistedState
      },
      // Configuración de hidratación
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Log de restauración para debugging
          console.log('🔄 Playground context restored from localStorage:', {
            selectedProject: state.selectedProject?.title || 'none',
            selectedVideosCount: state.selectedVideos.length,
            allVideosSelected: state.allVideosSelected,
          })
        }
      },
    },
  ),
)

// Hook adicional para obtener el estado del contexto para mostrar al usuario
export const useContextDisplayState = (): ContextDisplayState => {
  const { selectedProject, selectedVideos, allVideosSelected } = usePlaygroundContextStore()

  if (!selectedProject) {
    return { type: 'all_projects' }
  }

  if (allVideosSelected) {
    return {
      type: 'specific_project',
      projectName: selectedProject.title,
    }
  }

  return {
    type: 'specific_project_with_videos',
    projectName: selectedProject.title,
    videoCount: selectedVideos.length,
  }
}
