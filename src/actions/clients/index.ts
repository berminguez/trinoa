// ============================================================================
// TRINOA - CLIENT MANAGEMENT ACTIONS
// ============================================================================

// Exportar todos los actions relacionados con gestión de clientes
export { getClients } from './getClients'
export { getClientProjects } from './getClientProjects'
export { createClientAction } from './createClient'
export { updateClientAction } from './updateClient'
export { deleteClientAction } from './deleteClient'

// Tipos relacionados con clientes
export type {
  ClientsListResult,
  ClientsFilters,
  ClientProjectsResult,
  UpdateClientData,
  UpdateClientResult,
  DeleteClientResult,
} from './types'
