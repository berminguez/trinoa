import type { ApiKey, Project } from '@/payload-types'

// Tipos para getApiKeys
export interface GetApiKeysResult {
  success: boolean
  data?: ApiKey[]
  error?: string
}

// Tipos para createApiKey
export interface CreateApiKeyData {
  name: string
  hasAllProjects: boolean
  projects?: string[] // Array de IDs de proyectos
}

export interface CreateApiKeyResult {
  success: boolean
  data?: ApiKey & {
    /** Solo disponible en la respuesta de creación */
    plainKey?: string
  }
  error?: string
}

// Tipos para deleteApiKey
export interface DeleteApiKeyResult {
  success: boolean
  error?: string
}
