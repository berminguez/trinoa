'use server'

import { getPayload } from 'payload'
import config from '@payload-config'
import { getCurrentUser } from '@/actions/auth/getUser'
import type { Company } from '@/payload-types'

export interface GetCompaniesResult {
  success: boolean
  data?: Company[]
  message?: string
}

/**
 * Server action para obtener lista de empresas disponibles
 *
 * Todos los usuarios autenticados pueden obtener la lista (para selectors)
 *
 * @returns Promise<GetCompaniesResult> - Lista de empresas
 */
export async function getCompaniesAction(): Promise<GetCompaniesResult> {
  try {
    // Validar que hay un usuario autenticado
    const user = await getCurrentUser()
    if (!user) {
      return {
        success: false,
        message: 'Usuario no autenticado',
      }
    }

    console.log(`getCompaniesAction: Usuario ${user.email} obteniendo lista de empresas`)

    // Obtener payload instance
    const payload = await getPayload({ config })

    // Obtener todas las empresas ordenadas por nombre
    const companies = await payload.find({
      collection: 'companies',
      sort: 'name',
      limit: 1000, // Límite razonable para evitar problemas de performance
    })

    console.log(`getCompaniesAction: Se encontraron ${companies.docs.length} empresas`)

    return {
      success: true,
      data: companies.docs as Company[],
      message: `Se encontraron ${companies.docs.length} empresas`,
    }
  } catch (error) {
    console.error('Error en getCompaniesAction:', error)

    // Manejar errores específicos
    if (error instanceof Error) {
      // Error de permisos
      if (error.message.includes('permission') || error.message.includes('access')) {
        return {
          success: false,
          message: 'No tienes permisos para ver las empresas',
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
