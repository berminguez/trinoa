'use server'

import { getCurrentUser } from '@/actions/auth/getUser'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { revalidatePath } from 'next/cache'
import type { Project } from '@/payload-types'

interface UpdateProjectData {
  title?: string
  description?: string
}

interface UpdateProjectResult {
  success: boolean
  data?: Project
  error?: string
}

export async function updateProjectAction(
  projectId: string,
  data: UpdateProjectData,
): Promise<UpdateProjectResult> {
  try {
    // Verificar autenticación
    const user = await getCurrentUser()
    if (!user) {
      return {
        success: false,
        error: 'Usuario no autenticado',
      }
    }

    // Solo usuarios normales y admins pueden actualizar proyectos
    if (user.role !== 'user' && user.role !== 'admin') {
      return {
        success: false,
        error: 'No tienes permisos para actualizar proyectos',
      }
    }

    const payload = await getPayload({ config })

    // Verificar que el proyecto existe y pertenece al usuario
    const existingProject = await payload.findByID({
      collection: 'projects',
      id: projectId,
      user,
    })

    if (!existingProject) {
      return {
        success: false,
        error: 'Proyecto no encontrado',
      }
    }

    // Si se está actualizando el título, verificar unicidad
    if (data.title && data.title !== existingProject.title) {
      const trimmedTitle = data.title.trim()

      // Validaciones básicas
      if (!trimmedTitle) {
        return {
          success: false,
          error: 'El título es requerido',
        }
      }

      if (trimmedTitle.length < 3) {
        return {
          success: false,
          error: 'El título debe tener al menos 3 caracteres',
        }
      }

      if (trimmedTitle.length > 100) {
        return {
          success: false,
          error: 'El título no puede exceder 100 caracteres',
        }
      }

      // Verificar unicidad por usuario
      const duplicateCheck = await payload.find({
        collection: 'projects',
        where: {
          and: [
            {
              title: {
                equals: trimmedTitle,
              },
            },
            {
              createdBy: {
                equals: user.id,
              },
            },
            {
              id: {
                not_equals: projectId,
              },
            },
          ],
        },
        limit: 1,
        user,
      })

      if (duplicateCheck.docs.length > 0) {
        return {
          success: false,
          error: 'Ya tienes un proyecto con este título. Elige un título diferente.',
        }
      }
    }

    // Preparar datos para actualización
    const updateData: any = {}

    if (data.title) {
      updateData.title = data.title.trim()
    }

    if (data.description !== undefined) {
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
    }

    // Actualizar proyecto
    const updatedProject = await payload.update({
      collection: 'projects',
      id: projectId,
      data: updateData,
      user,
    })

    // Revalidar rutas relacionadas
    revalidatePath(`/projects/${projectId}`)
    revalidatePath('/projects')

    return {
      success: true,
      data: updatedProject as Project,
    }
  } catch (error) {
    console.error('Error updating project:', error)

    // Manejar errores específicos
    if (error instanceof Error) {
      if (error.message.includes('duplicate') || error.message.includes('unique')) {
        return {
          success: false,
          error: 'Ya existe un proyecto con este título. Elige un título diferente.',
        }
      }

      if (error.message.includes('slug')) {
        return {
          success: false,
          error: 'Error al generar el identificador del proyecto. Intenta con un título diferente.',
        }
      }
    }

    return {
      success: false,
      error: 'Error interno del servidor. Intenta nuevamente.',
    }
  }
}
