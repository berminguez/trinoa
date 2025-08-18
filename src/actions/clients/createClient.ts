'use server'

import { revalidatePath } from 'next/cache'
import { getPayload } from 'payload'
import config from '@payload-config'
import { requireAdminAccess } from '@/actions/auth/getUser'
import type { User } from '@/payload-types'

interface CreateClientData {
  name: string
  email: string
  empresa: string
  password?: string // Opcional - si no se proporciona se genera una aleatoria
}

interface CreateClientResult {
  success: boolean
  data?: {
    user: User
    generatedPassword?: string // Solo si se generó una contraseña automática
  }
  message?: string
}

/**
 * Genera una contraseña aleatoria segura
 */
function generateRandomPassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
  let password = ''
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

/**
 * Server action para crear nuevos clientes/usuarios desde el panel de administración
 *
 * Solo usuarios admin pueden ejecutar esta función
 * Crea usuarios con rol 'user' automáticamente
 * Genera contraseña aleatoria si no se proporciona
 *
 * @param data - Datos del nuevo cliente
 * @returns Promise<CreateClientResult> - Resultado con usuario creado
 */
export async function createClientAction(data: CreateClientData): Promise<CreateClientResult> {
  try {
    // Validar que el usuario es admin
    const adminUser = await requireAdminAccess()
    console.log(`createClientAction: Admin ${adminUser.email} creando cliente ${data.email}`, {
      name: data.name,
      empresa: data.empresa,
    })

    // Validar parámetros de entrada
    if (!data.name?.trim()) {
      return {
        success: false,
        message: 'El nombre es requerido',
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

    if (!data.email?.trim()) {
      return {
        success: false,
        message: 'El email es requerido',
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

    if (!data.empresa?.trim()) {
      return {
        success: false,
        message: 'La empresa es requerida',
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

    // Validar contraseña si se proporciona
    let password = data.password?.trim()
    let generatedPassword: string | undefined

    if (!password) {
      // Generar contraseña aleatoria
      password = generateRandomPassword()
      generatedPassword = password
      console.log(`createClientAction: Generando contraseña automática para ${data.email}`)
    } else {
      // Validar contraseña proporcionada
      if (password.length < 8) {
        return {
          success: false,
          message: 'La contraseña debe tener al menos 8 caracteres',
        }
      }

      if (password.length > 128) {
        return {
          success: false,
          message: 'La contraseña no puede exceder 128 caracteres',
        }
      }
    }

    // Obtener payload instance
    const payload = await getPayload({ config })

    // Verificar que el email no esté ya en uso
    const existingUser = await payload.find({
      collection: 'users',
      where: {
        email: { equals: data.email.trim().toLowerCase() },
      },
      limit: 1,
    })

    if (existingUser.docs.length > 0) {
      console.log(`createClientAction: Email ${data.email} ya está en uso`)
      return {
        success: false,
        message: 'Ya existe un usuario con este email',
      }
    }

    // Preparar datos del usuario
    const userData = {
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      empresa: data.empresa.trim(),
      password: password,
      role: 'user' as const, // Siempre crear como usuario normal
    }

    console.log(`createClientAction: Creando usuario con datos:`, {
      name: userData.name,
      email: userData.email,
      empresa: userData.empresa,
      role: userData.role,
      adminEmail: adminUser.email,
    })

    // Crear usuario
    const user = (await payload.create({
      collection: 'users',
      data: userData,
    })) as User

    console.log(`createClientAction: Usuario creado exitosamente:`, {
      userId: user.id,
      name: user.name,
      email: user.email,
      empresa: user.empresa,
      role: user.role,
      adminEmail: adminUser.email,
    })

    // Revalidar rutas relacionadas
    revalidatePath('/clients')

    return {
      success: true,
      data: {
        user,
        generatedPassword, // Solo se incluye si se generó automáticamente
      },
      message: `Cliente "${user.name}" creado exitosamente`,
    }
  } catch (error) {
    console.error('Error en createClientAction:', error)

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
          message: 'No tienes permisos para crear clientes',
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
