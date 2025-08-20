'use server'

import { revalidatePath } from 'next/cache'
import { getPayload } from 'payload'
import config from '@payload-config'

interface RevalidateProjectPagesResult {
  success: boolean
  error?: string
}

/**
 * Server action para revalidar todas las páginas relacionadas con un proyecto
 *
 * Esto incluye:
 * - /projects/{projectId} (página normal)
 * - /clients/{clientId}/projects/{projectId} (página de cliente)
 */
export async function revalidateProjectPages(
  projectId: string,
): Promise<RevalidateProjectPagesResult> {
  try {
    if (!projectId || projectId.trim().length === 0) {
      return { success: false, error: 'Project ID is required' }
    }

    console.log(`🔄 [REVALIDATE] Starting revalidation for project: ${projectId}`)

    // Revalidar página de proyecto normal
    revalidatePath(`/projects/${projectId}`)
    console.log(`✅ [REVALIDATE] Normal project page revalidated: /projects/${projectId}`)

    // Obtener información del proyecto para revalidar también las rutas de cliente
    try {
      const payload = await getPayload({ config })
      const projectInfo = await payload.findByID({
        collection: 'projects',
        id: projectId,
        depth: 1,
      })

      if (projectInfo) {
        const clientId =
          typeof projectInfo.createdBy === 'object'
            ? projectInfo.createdBy.id
            : projectInfo.createdBy

        // Revalidar también la ruta del cliente específico
        revalidatePath(`/clients/${clientId}/projects/${projectId}`)
        console.log(
          `✅ [REVALIDATE] Client project page revalidated: /clients/${clientId}/projects/${projectId}`,
        )
      }
    } catch (projectError) {
      console.error(
        `⚠️ [REVALIDATE] Could not get project info for client revalidation:`,
        projectError,
      )
      // No fallar por esto - la ruta principal se revalidó exitosamente
    }

    console.log(`🎉 [REVALIDATE] All project pages revalidated successfully for: ${projectId}`)
    return { success: true }
  } catch (error) {
    console.error(`❌ [REVALIDATE] Failed to revalidate project pages:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown revalidation error',
    }
  }
}
