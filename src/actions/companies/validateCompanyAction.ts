'use server'

import { getPayload } from 'payload'
import config from '@payload-config'
import { requireAdminAccess } from '@/actions/auth/getUser'

export interface ValidateCompanyData {
  name?: string
  cif?: string
  excludeId?: string // Para excluir en caso de update
}

export interface ValidateCompanyResult {
  success: boolean
  errors?: {
    name?: string
    cif?: string
  }
  message?: string
}

/**
 * Server action para validar datos de empresa antes del envío
 * 
 * Solo usuarios admin pueden ejecutar esta función
 * Valida formato y duplicados sin crear la empresa
 * 
 * @param data - Datos a validar
 * @returns Promise<ValidateCompanyResult> - Resultado de validación
 */
export async function validateCompanyAction(data: ValidateCompanyData): Promise<ValidateCompanyResult> {
  try {
    // Validar que el usuario es admin
    await requireAdminAccess()

    const errors: { name?: string; cif?: string } = {}

    // Validar nombre si se proporciona
    if (data.name !== undefined) {
      if (!data.name?.trim()) {
        errors.name = 'El nombre de la empresa es requerido'
      } else if (data.name.trim().length < 2) {
        errors.name = 'El nombre debe tener al menos 2 caracteres'
      } else if (data.name.trim().length > 100) {
        errors.name = 'El nombre no puede exceder 100 caracteres'
      }
    }

    // Validar CIF si se proporciona
    if (data.cif !== undefined) {
      if (!data.cif?.trim()) {
        errors.cif = 'El CIF es requerido'
      } else {
        const cleanCif = data.cif.trim().toUpperCase()
        
        if (cleanCif.length < 9 || cleanCif.length > 20) {
          errors.cif = 'El CIF debe tener entre 9 y 20 caracteres'
        } else if (!/^[A-Z0-9]+$/.test(cleanCif)) {
          errors.cif = 'El CIF debe contener solo letras y números'
        }
      }
    }

    // Si hay errores de formato, retornar inmediatamente
    if (Object.keys(errors).length > 0) {
      return {
        success: false,
        errors,
        message: 'Errores de validación de formato',
      }
    }

    // Obtener payload instance para validar duplicados
    const payload = await getPayload({ config })

    // Validar duplicado de nombre si se proporciona
    if (data.name?.trim()) {
      const whereConditions: any = {
        name: { equals: data.name.trim() },
      }

      // Excluir el documento actual si se proporciona (para updates)
      if (data.excludeId) {
        whereConditions.id = { not_equals: data.excludeId }
      }

      const existingCompanyByName = await payload.find({
        collection: 'companies',
        where: whereConditions,
        limit: 1,
      })

      if (existingCompanyByName.docs.length > 0) {
        errors.name = 'Ya existe una empresa con este nombre'
      }
    }

    // Validar duplicado de CIF si se proporciona
    if (data.cif?.trim()) {
      const cleanCif = data.cif.trim().toUpperCase()
      const whereConditions: any = {
        cif: { equals: cleanCif },
      }

      // Excluir el documento actual si se proporciona (para updates)
      if (data.excludeId) {
        whereConditions.id = { not_equals: data.excludeId }
      }

      const existingCompanyByCif = await payload.find({
        collection: 'companies',
        where: whereConditions,
        limit: 1,
      })

      if (existingCompanyByCif.docs.length > 0) {
        errors.cif = 'Ya existe una empresa con este CIF'
      }
    }

    // Retornar resultado de validación
    if (Object.keys(errors).length > 0) {
      return {
        success: false,
        errors,
        message: 'Errores de validación de duplicados',
      }
    }

    return {
      success: true,
      message: 'Validación exitosa',
    }
  } catch (error) {
    console.error('Error en validateCompanyAction:', error)

    // Manejar errores específicos
    if (error instanceof Error) {
      // Error de permisos
      if (error.message.includes('permission') || error.message.includes('access')) {
        return {
          success: false,
          message: 'No tienes permisos para validar empresas',
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
