'use server'

import { revalidatePath } from 'next/cache'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getCurrentUser } from '@/actions/auth/getUser'
import {
  sanitizeApiKeyName,
  sanitizeProjectIds,
  detectDangerousPatterns,
} from '@/lib/utils/inputSanitizer'
import { securityLogger } from '@/lib/utils/securityLogger'
import type { ApiKey, Project } from '@/payload-types'
import type { CreateApiKeyData, CreateApiKeyResult } from './types'

export async function createApiKeyAction(data: CreateApiKeyData): Promise<CreateApiKeyResult> {
  try {
    // Verificar autenticación
    const user = await getCurrentUser()
    if (!user) {
      return {
        success: false,
        error: 'Usuario no autenticado',
      }
    }

    // Solo usuarios normales y admins pueden crear API Keys
    if (user.role !== 'user' && user.role !== 'admin') {
      return {
        success: false,
        error: 'No tienes permisos para crear API Keys',
      }
    }

    // Sanitizar y validar datos de entrada
    const nameValidation = sanitizeApiKeyName(data.name)
    if (!nameValidation.isValid) {
      return {
        success: false,
        error: nameValidation.error || 'Nombre inválido',
      }
    }

    // Detectar patrones peligrosos en el nombre
    const dangerousCheck = detectDangerousPatterns(nameValidation.sanitized)
    if (!dangerousCheck.isSafe) {
      // Log de seguridad para patrón peligroso detectado
      securityLogger.logInputValidationFailed(
        data.name || '',
        `Dangerous pattern detected: ${dangerousCheck.detectedPattern}`,
        user.id,
        user.email,
      )

      securityLogger.logSuspiciousActivity(
        user.id,
        user.email,
        'Attempted to create API Key with dangerous characters',
        {
          originalInput: data.name,
          detectedPattern: dangerousCheck.detectedPattern,
          sanitizedInput: nameValidation.sanitized,
        },
      )

      return {
        success: false,
        error: 'El nombre contiene caracteres no permitidos',
      }
    }

    // Sanitizar proyectos si se especifican
    const projectsValidation = sanitizeProjectIds(data.projects)
    if (!projectsValidation.isValid) {
      return {
        success: false,
        error: projectsValidation.error || 'Proyectos inválidos',
      }
    }

    // Obtener payload instance
    const payload = await getPayload({ config })

    // Verificar límite de 10 keys por usuario
    // Construir condiciones de conteo según el rol del usuario
    const countWhereConditions: any = {
      user: {
        equals: user.id,
      },
    }

    // Los usuarios normales no deben contar playground keys para el límite
    // Los administradores ven el conteo real incluyendo playground keys
    if (user.role === 'user') {
      countWhereConditions.and = [
        {
          user: {
            equals: user.id,
          },
        },
        {
          or: [
            {
              playgroundKey: {
                not_equals: true,
              },
            },
            {
              playgroundKey: {
                exists: false,
              },
            },
          ],
        },
      ]
    }

    const existingKeysCount = await payload.count({
      collection: 'api-keys' as any,
      where: countWhereConditions,
    })

    console.log('[CREATE_API_KEY] Key count check:', {
      userId: user.id,
      userRole: user.role,
      keysCount: existingKeysCount.totalDocs,
      playgroundKeysExcluded: user.role === 'user' ? 'Yes' : 'No (admin sees all)',
    })

    if (existingKeysCount.totalDocs >= 10) {
      return {
        success: false,
        error: 'No puedes crear más de 10 API Keys',
      }
    }

    // Verificar unicidad del nombre para el usuario actual
    const existingKeyWithName = await payload.find({
      collection: 'api-keys' as any,
      where: {
        and: [{ name: { equals: nameValidation.sanitized } }, { user: { equals: user.id } }],
      },
      limit: 1,
    })

    if (existingKeyWithName.docs.length > 0) {
      return {
        success: false,
        error: 'Ya tienes una API Key con este nombre',
      }
    }

    // Validar proyectos específicos si se especifican
    let validatedProjects: string[] = []

    if (!data.hasAllProjects && projectsValidation.sanitized.length > 0) {
      // Verificar que todos los proyectos pertenecen al usuario
      const userProjectsResponse = await payload.find({
        collection: 'projects' as any,
        where: {
          and: [{ createdBy: { equals: user.id } }, { id: { in: projectsValidation.sanitized } }],
        },
        limit: projectsValidation.sanitized.length,
      })

      const userProjects = userProjectsResponse.docs as Project[]

      if (userProjects.length !== projectsValidation.sanitized.length) {
        return {
          success: false,
          error: 'Algunos proyectos seleccionados no te pertenecen',
        }
      }

      validatedProjects = projectsValidation.sanitized
    }

    // Preparar datos para crear la API Key
    // La generación de la key y keyValueLastFour se hace automáticamente en el beforeChange hook
    const apiKeyData = {
      name: nameValidation.sanitized,
      user: user.id,
      projects: data.hasAllProjects ? [] : validatedProjects,
      hasAllProjects: data.hasAllProjects,
    }

    // Crear Api Key
    const apiKey = (await payload.create({
      collection: 'api-keys' as any,
      data: apiKeyData,
    })) as ApiKey

    // Log de seguridad para creación exitosa
    securityLogger.logApiKeyCreated(
      user.id,
      user.email,
      user.role,
      apiKey.id,
      apiKey.name,
      apiKey.hasAllProjects || false,
      data.hasAllProjects ? 'all' : validatedProjects.length,
    )

    console.log('[CREATE_API_KEY] API Key created successfully:', {
      keyId: apiKey.id,
      name: apiKey.name,
      userId: user.id,
      hasAllProjects: apiKey.hasAllProjects,
      projectsCount: data.hasAllProjects ? 'all' : validatedProjects.length,
    })

    // Revalidar rutas relacionadas
    revalidatePath('/api-keys')

    // Retornar con la key en texto plano (solo una vez)
    return {
      success: true,
      data: {
        ...apiKey,
        plainKey: apiKey.keyValue, // La key completa para copiar en el modal
      },
    }
  } catch (error) {
    console.error('[CREATE_API_KEY] Error creating API key:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      data,
    })

    // Manejar errores específicos
    if (error instanceof Error) {
      // Error de validación de PayloadCMS
      if (error.message.includes('duplicate') || error.message.includes('unique')) {
        return {
          success: false,
          error: 'Ya tienes una API Key con este nombre',
        }
      }

      // Error de límite de keys
      if (error.message.includes('No puedes crear más de 10 API Keys')) {
        return {
          success: false,
          error: 'No puedes crear más de 10 API Keys',
        }
      }
    }

    return {
      success: false,
      error: 'Error interno del servidor. Intenta nuevamente.',
    }
  }
}
