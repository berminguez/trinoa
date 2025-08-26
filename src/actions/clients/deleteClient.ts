'use server'

import { getPayload } from 'payload'
import config from '@payload-config'
import { revalidatePath } from 'next/cache'
import { requireAdminAccess } from '@/actions/auth/getUser'
import type { User } from '@/payload-types'

import type { DeleteClientResult } from './types'

/**
 * Server action para eliminar un cliente/usuario y todos sus datos relacionados
 *
 * Solo usuarios admin pueden ejecutar esta función
 * Elimina en cascada: usuario → proyectos → recursos
 *
 * IMPORTANTE: Esta operación es irreversible
 *
 * @param clientId - ID del cliente a eliminar
 * @returns Promise<DeleteClientResult> - Resultado con estadísticas de eliminación
 */
export async function deleteClientAction(clientId: string): Promise<DeleteClientResult> {
  try {
    // Validar que el usuario es admin
    const adminUser = await requireAdminAccess()
    console.log(`deleteClientAction: Admin ${adminUser.email} eliminando cliente ${clientId}`)

    // Validar parámetros de entrada
    if (!clientId?.trim()) {
      return {
        success: false,
        message: 'ID de cliente es requerido',
      }
    }

    // Obtener payload instance
    const payload = await getPayload({ config })

    // Verificar que el cliente existe
    const existingClient = await payload.findByID({
      collection: 'users',
      id: clientId,
    })

    if (!existingClient) {
      return {
        success: false,
        message: 'Cliente no encontrado',
      }
    }

    // Verificar que no es el mismo admin que se está eliminando
    if (existingClient.id === adminUser.id) {
      return {
        success: false,
        message: 'No puedes eliminar tu propia cuenta de administrador',
      }
    }

    console.log(`deleteClientAction: Iniciando eliminación en cascada para usuario:`, {
      userId: existingClient.id,
      userEmail: existingClient.email,
      userName: existingClient.name,
      userRole: existingClient.role,
      adminEmail: adminUser.email,
    })

    // PASO 1: Obtener todos los proyectos del usuario
    const userProjects = await payload.find({
      collection: 'projects',
      where: {
        createdBy: {
          equals: clientId,
        },
      },
      limit: 1000, // Asumimos que un usuario no tendrá más de 1000 proyectos
    })

    console.log(`deleteClientAction: Encontrados ${userProjects.docs.length} proyectos del usuario`)

    let deletedResourcesCount = 0

    // PASO 2: Para cada proyecto, eliminar todos sus recursos
    for (const project of userProjects.docs) {
      console.log(
        `deleteClientAction: Eliminando recursos del proyecto ${project.id} (${project.title})`,
      )

      // Obtener todos los recursos del proyecto
      const projectResources = await payload.find({
        collection: 'resources',
        where: {
          project: {
            equals: project.id,
          },
        },
        limit: 1000, // Límite por proyecto
      })

      console.log(
        `deleteClientAction: Encontrados ${projectResources.docs.length} recursos en proyecto ${project.id}`,
      )

      // Eliminar cada recurso
      for (const resource of projectResources.docs) {
        try {
          await payload.delete({
            collection: 'resources',
            id: resource.id,
          })
          deletedResourcesCount++
          console.log(`deleteClientAction: Recurso eliminado: ${resource.id}`)
        } catch (resourceError) {
          console.warn(
            `deleteClientAction: Error eliminando recurso ${resource.id}:`,
            resourceError,
          )
          // Continuar con otros recursos aunque uno falle
        }
      }
    }

    // PASO 3: Eliminar todos los proyectos del usuario
    let deletedProjectsCount = 0
    for (const project of userProjects.docs) {
      try {
        await payload.delete({
          collection: 'projects',
          id: project.id,
        })
        deletedProjectsCount++
        console.log(`deleteClientAction: Proyecto eliminado: ${project.id} (${project.title})`)
      } catch (projectError) {
        console.warn(`deleteClientAction: Error eliminando proyecto ${project.id}:`, projectError)
        // Continuar con otros proyectos aunque uno falle
      }
    }

    // PASO 4: Eliminar mensajes y conversaciones del usuario (si existen)
    try {
      const userConversations = await payload.find({
        collection: 'conversations',
        where: {
          user: {
            equals: clientId,
          },
        },
        limit: 1000,
      })

      for (const conversation of userConversations.docs) {
        // Primero eliminar todos los mensajes de esta conversación
        const conversationMessages = await payload.find({
          collection: 'messages',
          where: {
            conversation: {
              equals: conversation.id,
            },
          },
          limit: 1000,
        })

        for (const message of conversationMessages.docs) {
          await payload.delete({
            collection: 'messages',
            id: message.id,
          })
          console.log(`deleteClientAction: Mensaje eliminado: ${message.id}`)
        }

        // Luego eliminar la conversación
        await payload.delete({
          collection: 'conversations',
          id: conversation.id,
        })
        console.log(`deleteClientAction: Conversación eliminada: ${conversation.id}`)
      }
    } catch (conversationError) {
      console.warn(`deleteClientAction: Error eliminando conversaciones:`, conversationError)
      // No es crítico, continuar
    }

    // PASO 5: Eliminar suscripciones del usuario (si existen)
    try {
      const userSubscriptions = await payload.find({
        collection: 'subscriptions',
        where: {
          user: {
            equals: clientId,
          },
        },
        limit: 10,
      })

      for (const subscription of userSubscriptions.docs) {
        await payload.delete({
          collection: 'subscriptions',
          id: subscription.id,
        })
        console.log(`deleteClientAction: Suscripción eliminada: ${subscription.id}`)
      }
    } catch (subscriptionError) {
      console.warn(`deleteClientAction: Error eliminando suscripciones:`, subscriptionError)
      // No es crítico, continuar
    }

    // PASO 6: Eliminar API keys del usuario (si existen)
    try {
      const userApiKeys = await payload.find({
        collection: 'api-keys',
        where: {
          user: {
            equals: clientId,
          },
        },
        limit: 100,
      })

      for (const apiKey of userApiKeys.docs) {
        await payload.delete({
          collection: 'api-keys',
          id: apiKey.id,
        })
        console.log(`deleteClientAction: API Key eliminada: ${apiKey.id}`)
      }
    } catch (apiKeyError) {
      console.warn(`deleteClientAction: Error eliminando API keys:`, apiKeyError)
      // No es crítico, continuar
    }

    // PASO 7: Finalmente, eliminar el usuario
    const deletedUser = (await payload.delete({
      collection: 'users',
      id: clientId,
    })) as User

    console.log(`deleteClientAction: Usuario eliminado exitosamente:`, {
      userId: deletedUser.id,
      userEmail: deletedUser.email,
      userName: deletedUser.name,
      deletedProjectsCount,
      deletedResourcesCount,
      adminEmail: adminUser.email,
    })

    // Revalidar rutas relacionadas
    revalidatePath('/clients')
    revalidatePath('/dashboard')

    return {
      success: true,
      data: {
        deletedUser,
        deletedProjectsCount,
        deletedResourcesCount,
      },
      message: `Cliente "${deletedUser.name}" eliminado exitosamente junto con ${deletedProjectsCount} proyectos y ${deletedResourcesCount} recursos`,
    }
  } catch (error) {
    console.error('Error en deleteClientAction:', error)

    // Manejar errores específicos
    if (error instanceof Error) {
      // Error de permisos
      if (error.message.includes('permission') || error.message.includes('access')) {
        return {
          success: false,
          message: 'No tienes permisos para eliminar clientes',
        }
      }

      // Error de not found
      if (error.message.includes('not found') || error.message.includes('404')) {
        return {
          success: false,
          message: 'Cliente no encontrado',
        }
      }

      // Error de relaciones
      if (error.message.includes('constraint') || error.message.includes('foreign key')) {
        return {
          success: false,
          message: 'No se puede eliminar el cliente debido a dependencias de datos',
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
