'use server'

import { getPayload } from 'payload'
import config from '@payload-config'
import { getCurrentUser } from '@/actions/auth/getUser'
import { revalidatePath } from 'next/cache'
import type { Resource, Media } from '@/payload-types'

interface DeleteBulkDocumentsData {
  resourceIds: string[]
  projectId: string
}

interface DeleteBulkDocumentsResult {
  success: boolean
  deletedCount: number
  errors: Array<{
    resourceId: string
    error: string
  }>
  message?: string
}

export async function deleteBulkDocuments(
  data: DeleteBulkDocumentsData,
): Promise<DeleteBulkDocumentsResult> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return {
        success: false,
        deletedCount: 0,
        errors: [{ resourceId: 'auth', error: 'Usuario no autenticado' }],
      }
    }

    const payload = await getPayload({ config })
    console.log('🗑️ [BULK-DELETE] Starting bulk document deletion:', {
      resourceIds: data.resourceIds,
      projectId: data.projectId,
      count: data.resourceIds.length,
    })

    const results = []
    const errors = []
    let deletedCount = 0

    for (const resourceId of data.resourceIds) {
      try {
        // Obtener el recurso para validar permisos y obtener el archivo asociado
        const resource = await payload.findByID({
          collection: 'resources',
          id: resourceId,
          depth: 2,
          user,
        })

        // Verificar que el recurso pertenece al proyecto correcto
        const resourceProjectId =
          typeof resource.project === 'object' ? resource.project.id : resource.project
        if (resourceProjectId !== data.projectId) {
          errors.push({
            resourceId,
            error: 'Resource does not belong to this project',
          })
          continue
        }

        // Bloquear si el documento está verificado y el usuario no es admin
        if ((resource as any)?.confidence === 'verified' && user.role !== 'admin') {
          errors.push({
            resourceId,
            error:
              'Documento verificado: solo administradores pueden eliminar este tipo de documento',
          })
          continue
        }

        // Obtener el ID del archivo de media asociado
        const mediaFileId = typeof resource.file === 'object' ? resource.file.id : resource.file

        console.log('📄 [BULK-DELETE] Deleting resource:', {
          resourceId: resource.id,
          title: resource.title,
          mediaFileId,
        })

        // Eliminar el recurso
        await payload.delete({
          collection: 'resources',
          id: resourceId,
          user,
          overrideAccess: user.role === 'admin',
        })

        // Eliminar también el archivo de media asociado si existe
        if (mediaFileId) {
          try {
            await payload.delete({
              collection: 'media',
              id: mediaFileId,
              user,
              overrideAccess: user.role === 'admin',
            })
            console.log('✅ [BULK-DELETE] Media file deleted:', mediaFileId)
          } catch (mediaError) {
            console.warn('⚠️ [BULK-DELETE] Could not delete media file:', mediaError)
            // No fallar la operación completa si no se puede borrar el archivo de media
          }
        }

        deletedCount++
        console.log(`✅ [BULK-DELETE] Resource deleted successfully: ${resource.title}`)
      } catch (resourceError) {
        console.error(`❌ [BULK-DELETE] Error deleting resource ${resourceId}:`, resourceError)
        errors.push({
          resourceId,
          error: resourceError instanceof Error ? resourceError.message : 'Unknown error',
        })
      }
    }

    // Revalidar la página del proyecto
    revalidatePath(`/projects/${data.projectId}`)

    const message =
      deletedCount === data.resourceIds.length
        ? `Successfully deleted ${deletedCount} document${deletedCount !== 1 ? 's' : ''}`
        : `Deleted ${deletedCount} of ${data.resourceIds.length} documents. ${errors.length} failed.`

    console.log(
      `📊 [BULK-DELETE] Completed: ${deletedCount}/${data.resourceIds.length} deleted, ${errors.length} errors`,
    )

    return {
      success: deletedCount > 0,
      deletedCount,
      errors,
      message,
    }
  } catch (error) {
    console.error('❌ [BULK-DELETE] Global error:', error)
    return {
      success: false,
      deletedCount: 0,
      errors: [
        {
          resourceId: 'global',
          error: error instanceof Error ? error.message : 'Unknown error occurred',
        },
      ],
    }
  }
}
