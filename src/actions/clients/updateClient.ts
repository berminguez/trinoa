'use server'

import { getPayload } from 'payload'
import config from '@payload-config'
import { revalidatePath } from 'next/cache'
import { requireAdminAccess } from '@/actions/auth/getUser'
import type { User } from '@/payload-types'

import type { UpdateClientData, UpdateClientResult } from './types'

/**
 * Server action para actualizar datos de un cliente/usuario desde el panel de administración
 *
 * Solo usuarios admin pueden ejecutar esta función
 * Valida datos de entrada y actualiza usuario en PayloadCMS
 *
 * @param clientId - ID del cliente a actualizar
 * @param data - Datos a actualizar del cliente
 * @returns Promise<UpdateClientResult> - Resultado con usuario actualizado
 */
export async function updateClientAction(
  clientId: string,
  data: UpdateClientData,
): Promise<UpdateClientResult> {
  try {
    // Validar que el usuario es admin
    const adminUser = await requireAdminAccess()
    console.log(`updateClientAction: Admin ${adminUser.email} actualizando cliente ${clientId}`, {
      updates: Object.keys(data),
    })

    // Validar parámetros de entrada
    if (!clientId?.trim()) {
      return {
        success: false,
        message: 'ID de cliente es requerido',
      }
    }

    // Validar que hay al menos un campo para actualizar
    const fieldsToUpdate = Object.keys(data).filter(
      (key) =>
        data[key as keyof UpdateClientData] !== undefined &&
        data[key as keyof UpdateClientData] !== '',
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
    }

    if (data.role !== undefined) {
      const validRoles = ['user', 'admin', 'api']
      if (!validRoles.includes(data.role)) {
        return {
          success: false,
          message: 'El rol especificado no es válido',
        }
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

    if (data.role !== undefined) {
      updateData.role = data.role
    }

    // Metadatos de auditoría
    updateData.updatedAt = new Date().toISOString()

    console.log(`updateClientAction: Actualizando usuario ${clientId}:`, {
      userId: clientId,
      currentEmail: existingClient.email,
      updates: updateData,
      adminEmail: adminUser.email,
    })

    // Actualizar usuario
    const updatedUser = (await payload.update({
      collection: 'users',
      id: clientId,
      data: updateData,
    })) as User

    console.log(`updateClientAction: Usuario actualizado exitosamente:`, {
      userId: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      empresa: updatedUser.empresa,
      role: updatedUser.role,
      adminEmail: adminUser.email,
    })

    // Revalidar rutas relacionadas
    revalidatePath('/clients')
    revalidatePath(`/clients/${clientId}`)
    revalidatePath(`/clients/${clientId}/projects`)

    return {
      success: true,
      data: updatedUser,
      message: `Cliente "${updatedUser.name}" actualizado exitosamente`,
    }
  } catch (error) {
    console.error('Error en updateClientAction:', error)

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

      // Error de permisos
      if (error.message.includes('permission') || error.message.includes('access')) {
        return {
          success: false,
          message: 'No tienes permisos para actualizar clientes',
        }
      }

      // Error de not found
      if (error.message.includes('not found') || error.message.includes('404')) {
        return {
          success: false,
          message: 'Cliente no encontrado',
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
