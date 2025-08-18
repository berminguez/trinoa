// ============================================================================
// TRINOA - CLIENT MANAGEMENT ACTIONS
// ============================================================================

// Exportar todos los actions relacionados con gestión de clientes
export { getClients } from './getClients'
export { getClientProjects } from './getClientProjects'
export { createClientAction } from './createClient'

// Tipos relacionados con clientes
export type { ClientsListResult, ClientsFilters, ClientProjectsResult } from './types'
