'use server'

import { getPayload } from 'payload'
import config from '@payload-config'
import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/actions/auth/getUser'
import type { User } from '@/payload-types'

// ============================================================================
// TYPES PARA ACTUALIZACIÓN DE PERFIL PROPIO
// ============================================================================

export interface UpdateProfileData {
  name?: string
  empresa?: string
  email?: string
}

export interface UpdateProfileResult {
  success: boolean
  data?: User
  message: string
}

/**
 * Server action para que un usuario actualice su propio perfil
 *
 * Cualquier usuario autenticado puede actualizar su propia información
 * No requiere permisos de administrador
 *
 * @param data - Datos a actualizar del perfil propio
 * @returns Promise<UpdateProfileResult> - Resultado con usuario actualizado
 */
export async function updateProfileAction(data: UpdateProfileData): Promise<UpdateProfileResult> {
  try {
    // Obtener usuario actual (requiere autenticación)
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return {
        success: false,
        message: 'Debes estar autenticado para actualizar tu perfil',
      }
    }

    console.log(`updateProfileAction: Usuario ${currentUser.email} actualizando su propio perfil`, {
      updates: Object.keys(data),
    })

    // Validar que hay al menos un campo para actualizar
    const fieldsToUpdate = Object.keys(data).filter(
      (key) =>
        data[key as keyof UpdateProfileData] !== undefined &&
        data[key as keyof UpdateProfileData] !== '',
    )

    if (fieldsToUpdate.length === 0) {
      return {
        success: false,
        message: 'Debe proporcionar al menos un campo para actualizar',
      }
    }

    // Validaciones específicas por campo
    if (data.name !== undefined) {
      if (!data.name?.trim()) {
        return {
          success: false,
          message: 'El nombre no puede estar vacío',
        }
      }

      if (data.name.trim().length < 2) {
        return {
          success: false,
          message: 'El nombre debe tener al menos 2 caracteres',
        }
      }

      if (data.name.trim().length > 100) {
        return {
          success: false,
          message: 'El nombre no puede exceder 100 caracteres',
        }
      }
    }

    if (data.empresa !== undefined) {
      if (!data.empresa?.trim()) {
        return {
          success: false,
          message: 'La empresa no puede estar vacía',
        }
      }

      if (data.empresa.trim().length < 2) {
        return {
          success: false,
          message: 'La empresa debe tener al menos 2 caracteres',
        }
      }

      if (data.empresa.trim().length > 100) {
        return {
          success: false,
          message: 'La empresa no puede exceder 100 caracteres',
        }
      }
    }

    if (data.email !== undefined) {
      if (!data.email?.trim()) {
        return {
          success: false,
          message: 'El email no puede estar vacío',
        }
      }

      // Validación básica de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(data.email.trim())) {
        return {
          success: false,
          message: 'El email no tiene un formato válido',
        }
      }

      // Verificar que el nuevo email no esté en uso por otro usuario
      if (data.email.trim().toLowerCase() !== currentUser.email.toLowerCase()) {
        const payload = await getPayload({ config })
        const existingUser = await payload.find({
          collection: 'users',
          where: {
            email: {
              equals: data.email.trim().toLowerCase(),
            },
          },
          limit: 1,
        })

        if (existingUser.docs.length > 0) {
          return {
            success: false,
            message: 'Ya existe un usuario con este email',
          }
        }
      }
    }

    // Obtener payload instance
    const payload = await getPayload({ config })

    // Preparar datos para actualización (trimming automático)
    const updateData: Partial<User> = {}

    if (data.name !== undefined) {
      updateData.name = data.name.trim()
    }

    if (data.empresa !== undefined) {
      updateData.empresa = data.empresa.trim()
    }

    if (data.email !== undefined) {
      updateData.email = data.email.trim().toLowerCase()
    }

    // Metadatos de auditoría
    updateData.updatedAt = new Date().toISOString()

    console.log(`updateProfileAction: Actualizando perfil de usuario ${currentUser.id}:`, {
      userId: currentUser.id,
      currentEmail: currentUser.email,
      updates: updateData,
    })

    // Actualizar usuario
    const updatedUser = (await payload.update({
      collection: 'users',
      id: currentUser.id,
      data: updateData,
    })) as User

    console.log(`updateProfileAction: Perfil actualizado exitosamente:`, {
      userId: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      empresa: updatedUser.empresa,
    })

    // Revalidar rutas relacionadas
    revalidatePath('/account')
    revalidatePath('/dashboard')

    return {
      success: true,
      data: updatedUser,
      message: 'Perfil actualizado exitosamente',
    }
  } catch (error) {
    console.error('Error en updateProfileAction:', error)

    // Manejar errores específicos
    if (error instanceof Error) {
      // Error de email duplicado
      if (error.message.includes('duplicate') || error.message.includes('unique')) {
        return {
          success: false,
          message: 'Ya existe un usuario con este email',
        }
      }

      // Error de validación de email
      if (error.message.includes('email')) {
        return {
          success: false,
          message: 'El email no tiene un formato válido',
        }
      }

      // Error de validación de PayloadCMS
      if (error.message.includes('validation')) {
        return {
          success: false,
          message: 'Los datos proporcionados no son válidos',
        }
      }

      // Error de autenticación
      if (error.message.includes('authentication') || error.message.includes('not authenticated')) {
        return {
          success: false,
          message: 'Debes estar autenticado para actualizar tu perfil',
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
