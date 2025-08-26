// ============================================================================
// TRINOA MVP - RESOURCE ACTIONS
// ============================================================================

// Confidence management
export {
  updateResourceConfidence,
  updateMultipleResourcesConfidence,
  type UpdateResourceConfidenceResult,
} from './updateResourceConfidence'

// Resource updates
export { updateResourceAction } from './updateResource'

// Resource queries
export { getProjectResources } from './getProjectResources'

// TODO: Implementar server actions en sub-tareas 2.5-2.9
export async function createResource(formData: FormData) {
  // Implementar creación de recurso
  return { success: false, error: 'Not implemented' }
}

export async function getResourceStatus(resourceId: string) {
  // Implementar consulta de estado
  return { success: false, error: 'Not implemented' }
}

export async function deleteResource(resourceId: string) {
  // Implementar eliminación de recurso
  return { success: false, error: 'Not implemented' }
}
