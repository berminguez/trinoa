'use server'

import { getPayload } from 'payload'
import config from '@payload-config'

export interface CheckCompanyCodeResult {
  success: boolean
  isUnique: boolean
  message?: string
  existingCompany?: {
    id: string
    name: string
  }
}

/**
 * Server action para verificar si un código de empresa está disponible
 *
 * @param code - Código de 3 letras a verificar
 * @returns Promise<CheckCompanyCodeResult> - Resultado de la verificación
 */
export async function checkCompanyCodeAction(code: string): Promise<CheckCompanyCodeResult> {
  try {
    // Validar entrada
    if (!code?.trim()) {
      return {
        success: false,
        isUnique: false,
        message: 'El código es requerido',
      }
    }

    const cleanCode = code.trim().toUpperCase()

    // Validar formato
    if (cleanCode.length !== 3) {
      return {
        success: false,
        isUnique: false,
        message: 'El código debe tener exactamente 3 caracteres',
      }
    }

    if (!/^[A-Z]{3}$/.test(cleanCode)) {
      return {
        success: false,
        isUnique: false,
        message: 'El código debe contener solo letras mayúsculas (A-Z)',
      }
    }

    // Obtener payload instance
    const payload = await getPayload({ config })

    // Verificar si el código ya existe
    const existingCompanies = await payload.find({
      collection: 'companies',
      where: {
        code: { equals: cleanCode },
      },
      limit: 1,
    })

    if (existingCompanies.docs.length > 0) {
      const existingCompany = existingCompanies.docs[0]
      return {
        success: true,
        isUnique: false,
        message: `El código "${cleanCode}" ya está en uso por la empresa "${existingCompany.name}"`,
        existingCompany: {
          id: existingCompany.id,
          name: existingCompany.name,
        },
      }
    }

    return {
      success: true,
      isUnique: true,
      message: `El código "${cleanCode}" está disponible`,
    }
  } catch (error) {
    console.error('Error checking company code:', error)
    return {
      success: false,
      isUnique: false,
      message: 'Error interno del servidor',
    }
  }
}
