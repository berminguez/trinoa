/**
 * Server actions administrativos para proyectos
 *
 * Colección de funciones que permiten a los administradores
 * gestionar proyectos de cualquier cliente con validaciones de seguridad
 */

// Exportar server actions administrativos
export { createProjectForClient } from './createProjectForClient'
export { updateProjectAsAdmin } from './updateProjectAsAdmin'
export { getProjectAsAdmin, getProjectStatsAsAdmin } from './getProjectAsAdmin'
export { deleteProjectAsAdmin } from './deleteProjectAsAdmin'

// Exportar tipos para TypeScript
export type {
  // De createProjectForClient.ts
  CreateProjectForClientData,
  CreateProjectForClientResult,
} from './createProjectForClient'

// Tipos para updateProjectAsAdmin
export interface UpdateProjectAsAdminData {
  title?: string
  description?: string
  clientId?: string
}

export interface UpdateProjectAsAdminResult {
  success: boolean
  data?: {
    project: import('@/payload-types').Project
    client: import('@/payload-types').User
  }
  message?: string
}

// Tipos para getProjectAsAdmin
export interface GetProjectAsAdminResult {
  success: boolean
  data?: {
    project: import('@/payload-types').Project
    client: import('@/payload-types').User
    resources: import('@/payload-types').Resource[]
    totalResources: number
  }
  message?: string
}

// Tipos para deleteProjectAsAdmin
export interface DeleteProjectAsAdminResult {
  success: boolean
  data?: {
    deletedProject: import('@/payload-types').Project
    client: import('@/payload-types').User
    deletedResourcesCount: number
  }
  message?: string
}

/**
 * Utilidades para server actions administrativos
 */
// export const AdminProjectActions = {
//   // Crear proyecto para cliente
//   create: createProjectForClient,

//   // Actualizar proyecto como admin
//   update: updateProjectAsAdmin,

//   // Obtener proyecto con datos completos
//   get: getProjectAsAdmin,

//   // Obtener estadísticas del proyecto
//   getStats: getProjectStatsAsAdmin,

//   // Eliminar proyecto y recursos
//   delete: deleteProjectAsAdmin,
// } as const

/**
 * Constantes para validaciones administrativas
 */
export const ADMIN_PROJECT_LIMITS = {
  TITLE_MIN_LENGTH: 3,
  TITLE_MAX_LENGTH: 100,
  DESCRIPTION_MAX_LENGTH: 500,
  RESOURCES_LIMIT: 100,
} as const

/**
 * Mensajes estándar para respuestas administrativas
 */
export const ADMIN_PROJECT_MESSAGES = {
  // Éxito
  PROJECT_CREATED: (title: string, clientEmail: string) =>
    `Proyecto "${title}" creado exitosamente para ${clientEmail}`,

  PROJECT_UPDATED: (title: string, clientEmail: string) =>
    `Proyecto "${title}" actualizado exitosamente para ${clientEmail}`,

  PROJECT_DELETED: (title: string, clientEmail: string, resourcesCount: number) =>
    `Proyecto "${title}" y ${resourcesCount} recursos eliminados exitosamente para ${clientEmail}`,

  // Errores
  PROJECT_NOT_FOUND: 'Proyecto no encontrado',
  CLIENT_NOT_FOUND: 'Cliente no encontrado',
  PROJECT_CLIENT_MISMATCH: 'El proyecto no pertenece al cliente especificado',
  DUPLICATE_TITLE: (title: string) =>
    `El cliente ya tiene un proyecto con el título "${title}". Elige un título diferente.`,

  // Validaciones
  INVALID_PROJECT_ID: 'ID de proyecto inválido',
  INVALID_CLIENT_ID: 'ID de cliente inválido',
  TITLE_REQUIRED: 'El título es requerido',
  TITLE_TOO_SHORT: `El título debe tener al menos ${ADMIN_PROJECT_LIMITS.TITLE_MIN_LENGTH} caracteres`,
  TITLE_TOO_LONG: `El título no puede exceder ${ADMIN_PROJECT_LIMITS.TITLE_MAX_LENGTH} caracteres`,
  DESCRIPTION_TOO_LONG: `La descripción no puede exceder ${ADMIN_PROJECT_LIMITS.DESCRIPTION_MAX_LENGTH} caracteres`,

  // Confirmaciones
  DELETE_CONFIRMATION_REQUIRED: 'Debe confirmar explícitamente la eliminación del proyecto',

  // Genéricos
  INTERNAL_ERROR: 'Error interno del servidor. Intenta nuevamente.',
  PERMISSION_DENIED: 'No tienes permisos para realizar esta acción.',
} as const
