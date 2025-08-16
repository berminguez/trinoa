'use server'

import { getPayload } from 'payload'
import config from '@/payload.config'
import { revalidatePath } from 'next/cache'
import { requireAdminAccess } from '@/actions/auth/getUser'
import type { Project, User } from '@/payload-types'

interface UpdateProjectAsAdminData {
  title?: string
  description?: string
  clientId?: string // Para validar ownership
}

interface UpdateProjectAsAdminResult {
  success: boolean
  data?: {
    project: Project
    client: User
  }
  message?: string
}

/**
 * Server action para actualizar proyectos como administrador
 *
 * Solo usuarios admin pueden ejecutar esta función
 * Permite actualizar proyectos de cualquier cliente con validaciones adecuadas
 *
 * @param projectId - ID del proyecto a actualizar
 * @param data - Datos a actualizar y validaciones
 * @returns Promise<UpdateProjectAsAdminResult> - Resultado con proyecto y cliente
 */
export async function updateProjectAsAdmin(
  projectId: string,
  data: UpdateProjectAsAdminData,
): Promise<UpdateProjectAsAdminResult> {
  try {
    // Validar que el usuario es admin
    const adminUser = await requireAdminAccess()
    console.log(
      `updateProjectAsAdmin: Admin ${adminUser.email} actualizando proyecto ${projectId}`,
      { updates: Object.keys(data) },
    )

    // Validar parámetros de entrada
    if (!projectId || typeof projectId !== 'string') {
      return {
        success: false,
        message: 'ID de proyecto inválido',
      }
    }

    // Obtener payload instance
    const payload = await getPayload({ config })

    // 1. Verificar que el proyecto existe y obtener información del cliente
    let existingProject: Project
    let client: User

    try {
      existingProject = await payload.findByID({
        collection: 'projects',
        id: projectId,
        depth: 2,
      })

      console.log(`updateProjectAsAdmin: Proyecto encontrado: ${existingProject.title}`)

      // Obtener información del cliente propietario
      const clientId =
        typeof existingProject.createdBy === 'object'
          ? existingProject.createdBy.id
          : existingProject.createdBy

      client = await payload.findByID({
        collection: 'users',
        id: clientId,
        depth: 1,
      })

      console.log(`updateProjectAsAdmin: Cliente propietario: ${client.email}`)

      // Si se proporciona clientId, validar que coincide
      if (data.clientId && data.clientId !== clientId) {
        console.log(
          `updateProjectAsAdmin: Cliente no coincide. Esperado: ${data.clientId}, Real: ${clientId}`,
        )
        return {
          success: false,
          message: 'El proyecto no pertenece al cliente especificado',
        }
      }
    } catch (error) {
      console.error('updateProjectAsAdmin: Error obteniendo proyecto o cliente:', error)
      return {
        success: false,
        message: 'Proyecto no encontrado',
      }
    }

    // 2. Validaciones de datos
    const updateData: any = {}
    let hasChanges = false

    // Validar y procesar título si se proporciona
    if (data.title !== undefined) {
      const trimmedTitle = data.title.trim()

      // Validaciones básicas
      if (!trimmedTitle) {
        return {
          success: false,
          message: 'El título es requerido',
        }
      }

      if (trimmedTitle.length < 3) {
        return {
          success: false,
          message: 'El título debe tener al menos 3 caracteres',
        }
      }

      if (trimmedTitle.length > 100) {
        return {
          success: false,
          message: 'El título no puede exceder 100 caracteres',
        }
      }

      // Solo verificar unicidad si el título ha cambiado
      if (trimmedTitle !== existingProject.title) {
        console.log(
          `updateProjectAsAdmin: Verificando unicidad de título "${trimmedTitle}" para cliente ${client.email}`,
        )

        // Verificar unicidad por cliente (no por admin)
        const duplicateCheck = await payload.find({
          collection: 'projects',
          where: {
            and: [
              { title: { equals: trimmedTitle } },
              { createdBy: { equals: client.id } },
              { id: { not_equals: projectId } },
            ],
          },
          limit: 1,
        })

        if (duplicateCheck.docs.length > 0) {
          console.log(
            `updateProjectAsAdmin: Título "${trimmedTitle}" ya existe para cliente ${client.email}`,
          )
          return {
            success: false,
            message: `El cliente ya tiene un proyecto con el título "${trimmedTitle}". Elige un título diferente.`,
          }
        }

        updateData.title = trimmedTitle
        hasChanges = true
      }
    }

    // Validar y procesar descripción si se proporciona
    if (data.description !== undefined) {
      if (data.description.trim().length > 500) {
        return {
          success: false,
          message: 'La descripción no puede exceder 500 caracteres',
        }
      }

      if (data.description.trim()) {
        updateData.description = [
          {
            type: 'paragraph',
            children: [
              {
                text: data.description.trim(),
              },
            ],
          },
        ]
      } else {
        updateData.description = null
      }
      hasChanges = true
    }

    // Si no hay cambios, retornar el proyecto actual
    if (!hasChanges) {
      console.log(`updateProjectAsAdmin: No hay cambios para aplicar`)
      return {
        success: true,
        data: {
          project: existingProject,
          client,
        },
        message: 'No hay cambios para aplicar',
      }
    }

    // 3. Actualizar proyecto
    console.log(`updateProjectAsAdmin: Aplicando cambios al proyecto:`, updateData)

    const updatedProject = (await payload.update({
      collection: 'projects',
      id: projectId,
      data: updateData,
    })) as Project

    console.log(`updateProjectAsAdmin: Proyecto actualizado exitosamente:`, {
      projectId: updatedProject.id,
      title: updatedProject.title,
      clientEmail: client.email,
      adminEmail: adminUser.email,
      changes: Object.keys(updateData),
    })

    // 4. Revalidar rutas relacionadas
    revalidatePath(`/projects/${projectId}`)
    revalidatePath('/projects')
    revalidatePath(`/clients/${client.id}/projects`)
    revalidatePath(`/clients/${client.id}/projects/${projectId}`)

    return {
      success: true,
      data: {
        project: updatedProject,
        client,
      },
      message: `Proyecto "${updatedProject.title}" actualizado exitosamente para ${client.name || client.email}`,
    }
  } catch (error) {
    console.error('Error en updateProjectAsAdmin:', error)

    // Manejar errores específicos
    if (error instanceof Error) {
      // Error de validación de PayloadCMS
      if (error.message.includes('duplicate') || error.message.includes('unique')) {
        return {
          success: false,
          message:
            'Ya existe un proyecto con este título para este cliente. Elige un título diferente.',
        }
      }

      // Error de validación de slug
      if (error.message.includes('slug')) {
        return {
          success: false,
          message:
            'Error al generar el identificador del proyecto. Intenta con un título diferente.',
        }
      }

      // Error de permisos
      if (error.message.includes('permission') || error.message.includes('access')) {
        return {
          success: false,
          message: 'No tienes permisos para actualizar este proyecto.',
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
