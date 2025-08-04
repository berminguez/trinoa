import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Project } from '@/payload-types'

export interface ProjectFilters {
  searchTerm: string
  sortBy: 'recent' | 'name' | 'creation'
}

export interface ProjectsState {
  // Estado de datos
  projects: Project[]
  selectedProject: Project | null

  // Estado de UI
  isLoading: boolean
  isCreating: boolean
  isUpdating: boolean
  isDeleting: boolean

  // Filtros y ordenamiento
  filters: ProjectFilters

  // Estado de error
  error: string | null

  // Acciones para datos
  setProjects: (projects: Project[]) => void
  addProject: (project: Project) => void
  updateProject: (id: string, updates: Partial<Project>) => void
  removeProject: (id: string) => void
  setSelectedProject: (project: Project | null) => void

  // Acciones para estado de carga
  setLoading: (loading: boolean) => void
  setCreating: (creating: boolean) => void
  setUpdating: (updating: boolean) => void
  setDeleting: (deleting: boolean) => void

  // Acciones para filtros
  setSearchTerm: (searchTerm: string) => void
  setSortBy: (sortBy: ProjectFilters['sortBy']) => void
  setFilters: (filters: Partial<ProjectFilters>) => void
  clearFilters: () => void

  // Acciones para errores
  setError: (error: string | null) => void
  clearError: () => void

  // Utilidades
  getFilteredProjects: () => Project[]
  getProjectById: (id: string) => Project | undefined
  reset: () => void
}

const initialFilters: ProjectFilters = {
  searchTerm: '',
  sortBy: 'recent',
}

const initialState = {
  projects: [],
  selectedProject: null,
  isLoading: false,
  isCreating: false,
  isUpdating: false,
  isDeleting: false,
  filters: initialFilters,
  error: null,
}

export const useProjectsStore = create<ProjectsState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Acciones para datos
      setProjects: (projects) => set({ projects, error: null }),

      addProject: (project) =>
        set((state) => ({
          projects: [project, ...state.projects],
          error: null,
        })),

      updateProject: (id, updates) =>
        set((state) => ({
          projects: state.projects.map((project) =>
            project.id === id ? { ...project, ...updates } : project,
          ),
          selectedProject:
            state.selectedProject?.id === id
              ? { ...state.selectedProject, ...updates }
              : state.selectedProject,
          error: null,
        })),

      removeProject: (id) =>
        set((state) => ({
          projects: state.projects.filter((project) => project.id !== id),
          selectedProject: state.selectedProject?.id === id ? null : state.selectedProject,
          error: null,
        })),

      setSelectedProject: (project) => set({ selectedProject: project }),

      // Acciones para estado de carga
      setLoading: (isLoading) => set({ isLoading }),

      setCreating: (isCreating) => set({ isCreating }),

      setUpdating: (isUpdating) => set({ isUpdating }),

      setDeleting: (isDeleting) => set({ isDeleting }),

      // Acciones para filtros
      setSearchTerm: (searchTerm) =>
        set((state) => ({
          filters: { ...state.filters, searchTerm },
        })),

      setSortBy: (sortBy) =>
        set((state) => ({
          filters: { ...state.filters, sortBy },
        })),

      setFilters: (filters) =>
        set((state) => ({
          filters: { ...state.filters, ...filters },
        })),

      clearFilters: () => set({ filters: initialFilters }),

      // Acciones para errores
      setError: (error) => set({ error }),

      clearError: () => set({ error: null }),

      // Utilidades
      getFilteredProjects: () => {
        const { projects, filters } = get()
        let filtered = [...projects]

        // Aplicar filtro de búsqueda
        if (filters.searchTerm.trim()) {
          const searchLower = filters.searchTerm.toLowerCase()
          filtered = filtered.filter(
            (project) =>
              project.title.toLowerCase().includes(searchLower) ||
              (project.description &&
                JSON.stringify(project.description).toLowerCase().includes(searchLower)),
          )
        }

        // Aplicar ordenamiento
        switch (filters.sortBy) {
          case 'name':
            filtered.sort((a, b) => a.title.localeCompare(b.title))
            break
          case 'creation':
            filtered.sort(
              (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
            )
            break
          case 'recent':
          default:
            filtered.sort(
              (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
            )
        }

        return filtered
      },

      getProjectById: (id) => {
        const { projects } = get()
        return projects.find((project) => project.id === id)
      },

      reset: () => set(initialState),
    }),
    {
      name: 'projects-store',
      // Solo persistir filtros y selectedProject, no los datos
      partialize: (state) => ({
        filters: state.filters,
        selectedProject: state.selectedProject,
      }),
    },
  ),
)
