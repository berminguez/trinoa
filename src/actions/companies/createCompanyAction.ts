'use server'

import { revalidatePath } from 'next/cache'
import { getPayload } from 'payload'
import config from '@payload-config'
import { requireAdminAccess } from '@/actions/auth/getUser'
import type { Company } from '@/payload-types'

export interface CreateCompanyData {
  name: string
  cif: string
}

export interface CreateCompanyResult {
  success: boolean
  data?: Company
  message?: string
}

/**
 * Server action para crear nuevas empresas
 * 
 * Solo usuarios admin pueden ejecutar esta función
 * Valida que no existan duplicados por nombre o CIF
 * 
 * @param data - Datos de la nueva empresa
 * @returns Promise<CreateCompanyResult> - Resultado con empresa creada
 */
export async function createCompanyAction(data: CreateCompanyData): Promise<CreateCompanyResult> {
  try {
    // Validar que el usuario es admin
    const adminUser = await requireAdminAccess()
    console.log(`createCompanyAction: Admin ${adminUser.email} creando empresa ${data.name}`, {
      name: data.name,
      cif: data.cif,
    })

    // Validar parámetros de entrada - Nombre
    if (!data.name?.trim()) {
      return {
        success: false,
        message: 'El nombre de la empresa es requerido',
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

    // Validar parámetros de entrada - CIF
    if (!data.cif?.trim()) {
      return {
        success: false,
        message: 'El CIF es requerido',
      }
    }

    const cleanCif = data.cif.trim().toUpperCase()
    
    if (cleanCif.length < 9 || cleanCif.length > 20) {
      return {
        success: false,
        message: 'El CIF debe tener entre 9 y 20 caracteres',
      }
    }

    // Validar que sea alfanumérico
    if (!/^[A-Z0-9]+$/.test(cleanCif)) {
      return {
        success: false,
        message: 'El CIF debe contener solo letras y números',
      }
    }

    // Obtener payload instance
    const payload = await getPayload({ config })

    // Verificar que el nombre no esté ya en uso
    const existingCompanyByName = await payload.find({
      collection: 'companies',
      where: {
        name: { equals: data.name.trim() },
      },
      limit: 1,
    })

    if (existingCompanyByName.docs.length > 0) {
      console.log(`createCompanyAction: Nombre ${data.name} ya está en uso`)
      return {
        success: false,
        message: 'Ya existe una empresa con este nombre',
      }
    }

    // Verificar que el CIF no esté ya en uso
    const existingCompanyByCif = await payload.find({
      collection: 'companies',
      where: {
        cif: { equals: cleanCif },
      },
      limit: 1,
    })

    if (existingCompanyByCif.docs.length > 0) {
      console.log(`createCompanyAction: CIF ${cleanCif} ya está en uso`)
      return {
        success: false,
        message: 'Ya existe una empresa con este CIF',
      }
    }

    // Preparar datos de la empresa
    const companyData = {
      name: data.name.trim(),
      cif: cleanCif, // Ya normalizado a mayúsculas
    }

    console.log(`createCompanyAction: Creando empresa con datos:`, {
      name: companyData.name,
      cif: companyData.cif,
      adminEmail: adminUser.email,
    })

    // Crear empresa
    const company = (await payload.create({
      collection: 'companies',
      data: companyData,
    })) as Company

    console.log(`createCompanyAction: Empresa creada exitosamente:`, {
      companyId: company.id,
      name: company.name,
      cif: company.cif,
      adminEmail: adminUser.email,
    })

    // Revalidar rutas relacionadas
    revalidatePath('/clients') // Para selector de empresas en formulario de usuarios
    revalidatePath('/account') // Para mostrar empresa en perfil de usuario

    return {
      success: true,
      data: company,
      message: `Empresa "${company.name}" creada exitosamente`,
    }
  } catch (error) {
    console.error('Error en createCompanyAction:', error)

    // Manejar errores específicos
    if (error instanceof Error) {
      // Error de nombre duplicado
      if (error.message.includes('duplicate') || error.message.includes('unique')) {
        return {
          success: false,
          message: 'Ya existe una empresa con este nombre o CIF',
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
          message: 'No tienes permisos para crear empresas',
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
