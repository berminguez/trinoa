'use server'

import { getPayload } from 'payload'
import config from '@/payload.config'

interface ForgotPasswordResponse {
  success: boolean
  message: string
}

/**
 * Server Action para solicitar recuperación de contraseña
 * Envía un email con el token de recuperación al usuario
 */
export async function forgotPassword(email: string): Promise<ForgotPasswordResponse> {
  try {
    if (!email || !email.includes('@')) {
      return {
        success: false,
        message: 'Por favor ingresa un email válido',
      }
    }

    const payload = await getPayload({ config })

    // Buscar el usuario
    const users = await payload.find({
      collection: 'users',
      where: {
        email: {
          equals: email.toLowerCase().trim(),
        },
      },
      limit: 1,
    })

    // Por seguridad, siempre devolvemos éxito aunque el usuario no exista
    // Esto evita que se pueda descubrir qué emails están registrados
    if (users.docs.length === 0) {
      console.log('[FORGOT_PASSWORD] Usuario no encontrado:', email)
      return {
        success: true,
        message:
          'Si existe una cuenta con este email, recibirás un correo con instrucciones para recuperar tu contraseña.',
      }
    }

    // Generar token de recuperación usando la API de PayloadCMS
    await payload.forgotPassword({
      collection: 'users',
      data: {
        email: email.toLowerCase().trim(),
      },
    })

    console.log('[FORGOT_PASSWORD] Email de recuperación enviado a:', email)

    return {
      success: true,
      message:
        'Si existe una cuenta con este email, recibirás un correo con instrucciones para recuperar tu contraseña.',
    }
  } catch (error) {
    console.error('[FORGOT_PASSWORD] Error:', error)
    return {
      success: false,
      message:
        'Ocurrió un error al procesar tu solicitud. Por favor, intenta nuevamente más tarde.',
    }
  }
}
