'use server'

import { getPayload } from 'payload'
import config from '@/payload.config'
import { revalidatePath } from 'next/cache'
import { requireAdminAccess } from '@/actions/auth/getUser'
import type { Project, User } from '@/payload-types'

interface DeleteProjectAsAdminResult {
  success: boolean
  data?: {
    deletedProject: Project
    client: User
    deletedResourcesCount: number
  }
  message?: string
}

/**
 * Server action para eliminar proyectos como administrador
 *
 * Solo usuarios admin pueden ejecutar esta función
 * Elimina proyecto y todos sus recursos asociados con logging de auditoría
 *
 * @param projectId - ID del proyecto a eliminar
 * @param clientId - ID del cliente (para validación adicional)
 * @param confirmDelete - Confirmación explícita de eliminación
 * @returns Promise<DeleteProjectAsAdminResult> - Resultado de la eliminación
 */
export async function deleteProjectAsAdmin(
  projectId: string,
  clientId: string,
  confirmDelete: boolean = false,
): Promise<DeleteProjectAsAdminResult> {
  try {
    // Validar que el usuario es admin
    const adminUser = await requireAdminAccess()
    console.log(`deleteProjectAsAdmin: Admin ${adminUser.email} eliminando proyecto ${projectId}`, {
      clientId,
      confirmDelete,
    })

    // Validar parámetros de entrada
    if (!projectId || typeof projectId !== 'string') {
      return {
        success: false,
        message: 'ID de proyecto inválido',
      }
    }

    if (!clientId || typeof clientId !== 'string') {
      return {
        success: false,
        message: 'ID de cliente inválido',
      }
    }

    if (!confirmDelete) {
      return {
        success: false,
        message: 'Debe confirmar explícitamente la eliminación del proyecto',
      }
    }

    // Obtener payload instance
    const payload = await getPayload({ config })

    // 1. Verificar que el proyecto existe y obtener información completa
    let project: Project
    let client: User
    let resourcesCount = 0

    try {
      console.log(`deleteProjectAsAdmin: Verificando proyecto ${projectId}`)

      project = await payload.findByID({
        collection: 'projects',
        id: projectId,
        depth: 2,
      })

      console.log(`deleteProjectAsAdmin: Proyecto encontrado: ${project.title}`)

      // Verificar que el proyecto pertenece al cliente especificado
      const projectClientId =
        typeof project.createdBy === 'object' ? project.createdBy.id : project.createdBy

      if (projectClientId !== clientId) {
        console.log(
          `deleteProjectAsAdmin: Proyecto no pertenece al cliente. Proyecto: ${projectClientId}, Cliente: ${clientId}`,
        )
        return {
          success: false,
          message: 'El proyecto no pertenece al cliente especificado',
        }
      }

      // Obtener información del cliente
      client = await payload.findByID({
        collection: 'users',
        id: clientId,
        depth: 1,
      })

      console.log(`deleteProjectAsAdmin: Cliente propietario: ${client.email}`)

      // Contar recursos antes de eliminar
      const resourcesQuery = await payload.find({
        collection: 'resources',
        where: {
          project: { equals: projectId },
        },
        limit: 0, // Solo queremos el count
      })

      resourcesCount = resourcesQuery.totalDocs
      console.log(`deleteProjectAsAdmin: ${resourcesCount} recursos encontrados para eliminar`)
    } catch (error) {
      console.error('deleteProjectAsAdmin: Error obteniendo proyecto o cliente:', error)
      return {
        success: false,
        message: 'Proyecto o cliente no encontrado',
      }
    }

    // 2. Eliminar recursos asociados primero
    if (resourcesCount > 0) {
      console.log(`deleteProjectAsAdmin: Eliminando ${resourcesCount} recursos del proyecto`)

      try {
        // Obtener todos los recursos para eliminarlos uno por uno
        const resourcesQuery = await payload.find({
          collection: 'resources',
          where: {
            project: { equals: projectId },
          },
          limit: 100, // Procesar en lotes si hay muchos
        })

        // Eliminar cada recurso individualmente para triggear hooks de PayloadCMS
        for (const resource of resourcesQuery.docs) {
          await payload.delete({
            collection: 'resources',
            id: resource.id,
            overrideAccess: true,
          })
          console.log(`deleteProjectAsAdmin: Recurso eliminado: ${resource.id}`)
        }

        console.log(`deleteProjectAsAdmin: ${resourcesQuery.docs.length} recursos eliminados`)
      } catch (error) {
        console.error('deleteProjectAsAdmin: Error eliminando recursos:', error)
        return {
          success: false,
          message: 'Error al eliminar los recursos del proyecto',
        }
      }
    }

    // 3. Eliminar el proyecto
    console.log(`deleteProjectAsAdmin: Eliminando proyecto ${project.title}`)

    try {
      await payload.delete({
        collection: 'projects',
        id: projectId,
        overrideAccess: true,
      })

      console.log(`deleteProjectAsAdmin: Proyecto eliminado exitosamente`)
    } catch (error) {
      console.error('deleteProjectAsAdmin: Error eliminando proyecto:', error)
      return {
        success: false,
        message: 'Error al eliminar el proyecto',
      }
    }

    // 4. Logging de auditoría completo
    console.log(`deleteProjectAsAdmin: Eliminación completada exitosamente:`, {
      deletedProject: {
        id: project.id,
        title: project.title,
        slug: project.slug,
      },
      client: {
        id: client.id,
        email: client.email,
        name: client.name,
      },
      admin: {
        id: adminUser.id,
        email: adminUser.email,
      },
      deletedResourcesCount: resourcesCount,
      timestamp: new Date().toISOString(),
    })

    // 5. Revalidar rutas relacionadas
    revalidatePath('/projects')
    revalidatePath(`/clients/${clientId}/projects`)
    revalidatePath('/clients')

    return {
      success: true,
      data: {
        deletedProject: project,
        client,
        deletedResourcesCount: resourcesCount,
      },
      message: `Proyecto "${project.title}" y ${resourcesCount} recursos eliminados exitosamente para ${client.name || client.email}`,
    }
  } catch (error) {
    console.error('Error en deleteProjectAsAdmin:', error)

    // Manejar errores específicos
    if (error instanceof Error) {
      // Error de permisos
      if (error.message.includes('permission') || error.message.includes('access')) {
        return {
          success: false,
          message: 'No tienes permisos para eliminar este proyecto.',
        }
      }

      // Error de dependencias
      if (error.message.includes('constraint') || error.message.includes('reference')) {
        return {
          success: false,
          message:
            'No se puede eliminar el proyecto debido a dependencias. Contacta al soporte técnico.',
        }
      }

      return {
        success: false,
        message: error.message,
      }
    }

    return {
      success: false,
      message: 'Error interno del servidor. Intenta nuevamente.',
    }
  }
}
