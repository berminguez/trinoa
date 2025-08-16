import type { User, Project } from '@/payload-types'

// ============================================================================
// TYPES PARA GESTIÓN DE CLIENTES ADMINISTRATIVOS
// ============================================================================

/**
 * Resultado de obtener lista de clientes
 */
export interface ClientsListResult {
  success: boolean
  data?: {
    clients: User[]
    totalClients: number
    page: number
    limit: number
    totalPages: number
  }
  message?: string
}

/**
 * Filtros para búsqueda de clientes
 */
export interface ClientsFilters {
  searchTerm?: string
  sortBy?: 'name' | 'email' | 'createdAt' | 'projectCount'
  sortOrder?: 'asc' | 'desc'
  page?: number
  limit?: number
  dateFrom?: string
  dateTo?: string
  role?: 'user' | 'admin' | 'api'
}

/**
 * Cliente con información extendida para admin
 */
export interface ClientWithStats extends User {
  projectCount: number
  lastActivity?: string
  isActive: boolean
}

/**
 * Resultado de obtener proyectos de un cliente
 */
export interface ClientProjectsResult {
  success: boolean
  data?: {
    client: User
    projects: Project[]
    totalProjects: number
    page: number
    limit: number
    totalPages: number
  }
  message?: string
}

/**
 * Filtros para proyectos de cliente específico
 */
export interface ClientProjectsFilters {
  searchTerm?: string
  sortBy?: 'title' | 'createdAt' | 'updatedAt'
  sortOrder?: 'asc' | 'desc'
  page?: number
  limit?: number
  dateFrom?: string
  dateTo?: string
}
