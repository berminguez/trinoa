'use server'

import { getPayload } from 'payload'
import config from '@payload-config'
import { getCurrentUser } from '@/actions/auth/getUser'
import { revalidatePath } from 'next/cache'
import type { Resource, Media } from '@/payload-types'

interface DeleteDocumentData {
  resourceId: string
  projectId: string
}

interface DeleteDocumentResult {
  success: boolean
  error?: string
}

export async function deleteDocument(data: DeleteDocumentData): Promise<DeleteDocumentResult> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return {
        success: false,
        error: 'Usuario no autenticado',
      }
    }

    const payload = await getPayload({ config })
    console.log('🗑️ [DELETE-DOC] Starting document deletion:', {
      resourceId: data.resourceId,
      projectId: data.projectId,
    })

    // Obtener el recurso para validar permisos y obtener el archivo asociado
    const resource = await payload.findByID({
      collection: 'resources',
      id: data.resourceId,
      depth: 2,
    })

    // Verificar que el recurso pertenece al proyecto correcto
    const resourceProjectId =
      typeof resource.project === 'object' ? resource.project.id : resource.project
    if (resourceProjectId !== data.projectId) {
      return {
        success: false,
        error: 'Resource does not belong to this project',
      }
    }

    // Obtener el ID del archivo de media asociado
    const mediaFileId = typeof resource.file === 'object' ? resource.file.id : resource.file

    console.log('📄 [DELETE-DOC] Deleting resource:', {
      resourceId: resource.id,
      title: resource.title,
      mediaFileId,
    })

    // Eliminar el recurso
    await payload.delete({
      collection: 'resources',
      id: data.resourceId,
    })

    console.log('✅ [DELETE-DOC] Resource deleted successfully')

    // Eliminar también el archivo de media asociado si existe
    if (mediaFileId) {
      try {
        await payload.delete({
          collection: 'media',
          id: mediaFileId,
        })
        console.log('✅ [DELETE-DOC] Media file deleted successfully')
      } catch (mediaError) {
        console.warn('⚠️ [DELETE-DOC] Could not delete media file:', mediaError)
        // No fallar la operación completa si no se puede borrar el archivo de media
      }
    }

    // Revalidar la página del proyecto
    revalidatePath(`/projects/${data.projectId}`)

    return { success: true }
  } catch (error) {
    console.error('❌ [DELETE-DOC] Error deleting document:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}
