'use server'

import { getPayload } from 'payload'
import config from '@/payload.config'
import { getCurrentUser } from '@/actions/auth/getUser'
import { revalidatePath } from 'next/cache'

interface UpdateMediaPasswordResult {
  success: boolean
  message?: string
  error?: string
}

/**
 * Actualiza la configuración de contraseña de acceso a media
 * Solo accesible por administradores
 */
export async function updateMediaPassword(
  enabled: boolean,
  password?: string,
): Promise<UpdateMediaPasswordResult> {
  try {
    // Verificar que el usuario sea administrador
    const user = await getCurrentUser()

    if (!user || user.role !== 'admin') {
      return {
        success: false,
        error: 'No tienes permisos para realizar esta acción',
      }
    }

    // Validar contraseña si está habilitado
    if (enabled && (!password || password.length < 8)) {
      return {
        success: false,
        error: 'La contraseña debe tener al menos 8 caracteres',
      }
    }

    // Obtener payload
    const payload = await getPayload({ config })

    // Actualizar configuración global
    await payload.updateGlobal({
      slug: 'configuracion',
      data: {
        mediaAccess: {
          enabled,
          password: enabled ? password : undefined,
        },
      },
    })

    // Revalidar rutas relevantes
    revalidatePath('/settings/media-password')

    console.log(`✅ Contraseña de media actualizada por ${user.email}`)

    return {
      success: true,
      message: enabled
        ? 'Contraseña de acceso a media actualizada correctamente'
        : 'Acceso con contraseña desactivado',
    }
  } catch (error: any) {
    console.error('❌ Error actualizando contraseña de media:', error)
    return {
      success: false,
      error: error?.message || 'Error al actualizar la contraseña',
    }
  }
}

/**
 * Obtiene la configuración actual de acceso a media
 * Solo accesible por administradores
 */
export async function getMediaPasswordConfig(): Promise<{
  success: boolean
  data?: { enabled: boolean; hasPassword: boolean; password?: string }
  error?: string
}> {
  try {
    const user = await getCurrentUser()

    if (!user || user.role !== 'admin') {
      return {
        success: false,
        error: 'No tienes permisos para realizar esta acción',
      }
    }

    const payload = await getPayload({ config })
    const configuracion = await payload.findGlobal({
      slug: 'configuracion',
    })

    const mediaAccess = (configuracion as any)?.mediaAccess

    return {
      success: true,
      data: {
        enabled: mediaAccess?.enabled || false,
        hasPassword: !!mediaAccess?.password,
        password: mediaAccess?.password || undefined,
      },
    }
  } catch (error: any) {
    console.error('Error obteniendo configuración de media:', error)
    return {
      success: false,
      error: error?.message || 'Error al obtener la configuración',
    }
  }
}

