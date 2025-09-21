// ============================================================================
// EIDETIK MVP - ENDPOINT DE UPLOAD ATÓMICO DE RECURSOS
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'

import { validateVideoFile } from '@/lib/validation'
import { addFileId } from '@/lib/utils/fileUtils'
import config from '@payload-config'

import type { Media, Resource } from '@/payload-types'

/**
 * POST /api/resources/upload
 *
 * Endpoint personalizado para upload atómico de recursos con archivos.
 * Garantiza que el archivo esté en S3 antes de crear el Resource.
 *
 * AUTENTICACIÓN: Requiere usuario autenticado con cookies de PayloadCMS.
 *
 * Campos requeridos (multipart/form-data):
 * - title: string (requerido)
 * - namespace: string (requerido, formato alfanumérico con guiones/underscores)
 * - file: File (requerido)
 *
 * Campos opcionales:
 * - description: string
 * - type: 'video' | 'audio' | 'pdf' | 'ppt' (default: 'video')
 * - projectId: string (ID del proyecto al que asignar el recurso - debe ser propiedad del usuario)
 * - filters: string (JSON object para configuración Pinecone)
 * - user_metadata: string (JSON object para metadatos del usuario)
 *
 * VALIDACIONES DE SEGURIDAD:
 * - Usuario debe estar autenticado
 * - Si se proporciona projectId, debe ser propiedad del usuario (o usuario admin)
 * - Validación de ownership estricta para proyectos
 *
 * Flujo:
 * 1. Verificar autenticación del usuario
 * 2. Validar multipart form data y campos requeridos
 * 3. Validar ownership del proyecto (si se proporciona projectId)
 * 4. Validar archivo (formato, tamaño, duración)
 * 5. Subir archivo a S3 vía Media collection
 * 6. Solo si upload exitoso → Crear Resource con nuevos campos
 * 7. Encolar job de procesamiento
 * 8. Devolver Resource creado
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('[UPLOAD] Starting resource upload process')

    // Obtener payload instance
    const payload = await getPayload({ config })

    // Verificar autenticación del usuario
    let authenticatedUser = null
    try {
      const cookieHeader = request.headers.get('cookie')
      if (!cookieHeader) {
        return NextResponse.json(
          {
            success: false,
            error: 'Authentication required',
            details: 'You must be logged in to upload resources',
          },
          { status: 401 },
        )
      }

      // Verificar token de PayloadCMS
      const response = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/users/me`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader,
        },
        credentials: 'include',
        cache: 'no-store',
      })

      if (!response.ok) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid authentication',
            details: 'Your session has expired. Please log in again.',
          },
          { status: 401 },
        )
      }

      const userData = await response.json()
      authenticatedUser = userData.user

      if (!authenticatedUser) {
        return NextResponse.json(
          {
            success: false,
            error: 'User data not available',
            details: 'Unable to retrieve user information',
          },
          { status: 401 },
        )
      }

      console.log('[UPLOAD] User authenticated:', {
        id: authenticatedUser.id,
        email: authenticatedUser.email,
        role: authenticatedUser.role,
      })
    } catch (authError) {
      console.error('[UPLOAD] Authentication failed:', authError)
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication failed',
          details: 'Unable to verify user authentication',
        },
        { status: 401 },
      )
    }

    // Verificar Content-Type
    const contentType = request.headers.get('content-type')
    if (!contentType?.includes('multipart/form-data')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Content-Type must be multipart/form-data',
          details: 'Please include a file in the request',
        },
        { status: 400 },
      )
    }

    // Parsear form data
    let formData: FormData
    try {
      formData = await request.formData()
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to parse form data',
          details: String(error),
        },
        { status: 400 },
      )
    }

    // Extraer campos del form
    const title = formData.get('title') as string
    const description = formData.get('description') as string
    const type = (formData.get('type') as string) || 'video'
    const namespace = formData.get('namespace') as string
    const projectId = formData.get('projectId') as string
    const filtersStr = formData.get('filters') as string
    const userMetadataStr = formData.get('user_metadata') as string
    const file = formData.get('file') as File

    // Validaciones básicas
    if (!title || title.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Title is required',
          details: 'Please provide a title for the resource',
        },
        { status: 400 },
      )
    }

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        {
          success: false,
          error: 'File is required',
          details: 'Please include a file in the request',
        },
        { status: 400 },
      )
    }

    // Validar namespace (requerido)
    if (!namespace || namespace.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Namespace is required',
          details: 'Please provide a namespace to organize your content',
        },
        { status: 400 },
      )
    }

    // Validar formato de namespace
    if (!/^[a-zA-Z0-9-_]+$/.test(namespace)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid namespace format',
          details: 'Namespace must contain only letters, numbers, hyphens and underscores',
        },
        { status: 400 },
      )
    }

    // Validar projectId si se proporciona
    let projectRecord = null
    if (projectId && projectId.trim().length > 0) {
      try {
        console.log('[UPLOAD] Validating project access and ownership:', {
          projectId: projectId.trim(),
          userId: authenticatedUser.id,
          userRole: authenticatedUser.role,
        })

        // Verificar que el proyecto existe
        projectRecord = await payload.findByID({
          collection: 'projects' as any, // Uso 'as any' temporalmente hasta regenerar tipos
          id: projectId.trim(),
        })

        if (!projectRecord) {
          return NextResponse.json(
            {
              success: false,
              error: 'Project not found',
              details: 'The specified project does not exist',
            },
            { status: 404 },
          )
        }

        // Verificar ownership del proyecto
        const isAdmin = authenticatedUser.role === 'admin'

        // Manejar tanto ID string como objeto populado
        const projectOwnerId =
          typeof projectRecord.createdBy === 'object'
            ? projectRecord.createdBy.id
            : projectRecord.createdBy
        const isProjectOwner = projectOwnerId === authenticatedUser.id

        console.log('[UPLOAD] Ownership validation:', {
          projectId: projectRecord.id,
          projectOwnerId: projectOwnerId,
          currentUserId: authenticatedUser.id,
          isAdmin: isAdmin,
          isProjectOwner: isProjectOwner,
          createdByType: typeof projectRecord.createdBy,
        })

        if (!isAdmin && !isProjectOwner) {
          console.log('[UPLOAD] Project ownership validation failed:', {
            projectId: projectRecord.id,
            projectOwner: projectRecord.createdBy,
            currentUser: authenticatedUser.id,
            userRole: authenticatedUser.role,
          })

          return NextResponse.json(
            {
              success: false,
              error: 'Project access denied',
              details: 'You can only upload resources to your own projects',
            },
            { status: 403 },
          )
        }

        console.log('[UPLOAD] Project ownership validation successful:', {
          projectId: projectRecord.id,
          title: projectRecord.title,
          owner: projectRecord.createdBy,
          isAdmin,
          isProjectOwner,
        })
      } catch (error) {
        console.error('[UPLOAD] Project validation failed:', error)
        return NextResponse.json(
          {
            success: false,
            error: 'Project validation failed',
            details: 'Unable to validate project access and ownership',
          },
          { status: 500 },
        )
      }
    } else {
      console.log(
        '[UPLOAD] No projectId provided - resource will be created without project assignment',
      )
    }

    // Parsear campos JSON opcionales
    let filters: Record<string, unknown> = {}
    let userMetadata: Record<string, unknown> = {}

    if (filtersStr) {
      try {
        filters = JSON.parse(filtersStr)
      } catch (error) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid filters format',
            details: 'Filters must be valid JSON object',
          },
          { status: 400 },
        )
      }
    }

    if (userMetadataStr) {
      try {
        userMetadata = JSON.parse(userMetadataStr)
      } catch (error) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid user_metadata format',
            details: 'User metadata must be valid JSON object',
          },
          { status: 400 },
        )
      }
    }

    console.log('[UPLOAD] Validating file:', {
      name: file.name,
      size: file.size,
      type: file.type,
    })

    // Validar archivo según tipo
    let validationResult
    if (type === 'video') {
      // Adaptar File del navegador al tipo VideoFile
      const videoFile = {
        size: file.size,
        mimeType: file.type,
        filename: file.name,
      }
      validationResult = validateVideoFile(videoFile)
    } else {
      // Para otros tipos de archivos en el futuro
      validationResult = {
        isValid: true,
        error: null,
        metadata: { duration: 0 },
      }
    }

    if (!validationResult.isValid) {
      return NextResponse.json(
        {
          success: false,
          error: 'File validation failed',
          details: validationResult.error,
        },
        { status: 400 },
      )
    }

    console.log('[UPLOAD] File validation passed')

    // PASO 1: Subir archivo a S3 vía Media collection
    let mediaRecord: Media
    try {
      console.log('[UPLOAD] Uploading file to S3...')

      mediaRecord = (await payload.create({
        collection: 'media',
        data: {
          alt: title,
        },
        file: {
          data: Buffer.from(await file.arrayBuffer()),
          mimetype: file.type,
          name: addFileId(file.name), // ⭐ AÑADIR IDENTIFICADOR ÚNICO
          size: file.size,
        },
      })) as Media

      console.log('[UPLOAD] File uploaded successfully to S3:', {
        id: mediaRecord.id,
        filename: mediaRecord.filename,
        url: mediaRecord.url,
      })
    } catch (error) {
      console.error('[UPLOAD] Failed to upload file to S3:', error)
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to upload file',
          details: 'Could not upload file to storage. Please try again.',
        },
        { status: 500 },
      )
    }

    // PASO 2: Crear Resource (solo si upload exitoso)
    let resourceRecord: Resource
    try {
      console.log('[UPLOAD] Creating resource record...')

      // Obtener la empresa del usuario actual
      let empresaId: string | null = null
      if (authenticatedUser.empresa) {
        // Si la empresa viene como objeto, usar su ID
        if (typeof authenticatedUser.empresa === 'object' && authenticatedUser.empresa.id) {
          empresaId = authenticatedUser.empresa.id
        }
        // Si viene como string (ID), usarlo directamente
        else if (typeof authenticatedUser.empresa === 'string') {
          empresaId = authenticatedUser.empresa
        }
      }

      if (!empresaId) {
        // ROLLBACK: Eliminar archivo de S3 si el usuario no tiene empresa
        try {
          await payload.delete({
            collection: 'media',
            id: mediaRecord.id,
          })
          console.log('[UPLOAD] Rollback: Deleted file from S3 (no empresa)')
        } catch (rollbackError) {
          console.error('[UPLOAD] Rollback failed:', rollbackError)
        }

        return NextResponse.json(
          {
            success: false,
            error: 'User has no assigned company',
            details: 'El usuario no tiene una empresa asignada',
          },
          { status: 400 },
        )
      }

      // Crear objeto de datos con nuevos campos
      const resourceData = {
        title: title.trim(),
        description: description?.trim() || '',
        type: type as 'video' | 'audio' | 'pdf' | 'ppt',
        file: mediaRecord.id,
        status: 'pending' as const, // Se cambiará a 'processing' en el hook
        progress: 0,
        processingMetadata: {
          duration: validationResult.metadata?.duration || 0,
        },
        // Nuevos campos (pueden no estar en types hasta regenerar)
        namespace: namespace.trim(),
        filters: filters,
        user_metadata: userMetadata,
        // Asignar proyecto si se proporcionó
        ...(projectRecord && { project: projectRecord.id }),
        // Campo requerido: empresa del usuario
        empresa: empresaId,
      }

      resourceRecord = (await payload.create({
        collection: 'resources',
        data: resourceData,
      })) as Resource

      console.log('[UPLOAD] Resource created successfully:', {
        id: resourceRecord.id,
        title: resourceRecord.title,
        namespace: namespace,
        projectId: projectRecord?.id || 'none',
        projectTitle: projectRecord?.title || 'unassigned',
        status: resourceRecord.status,
        hasFilters: Object.keys(filters).length > 0,
        hasUserMetadata: Object.keys(userMetadata).length > 0,
      })
    } catch (error) {
      console.error('[UPLOAD] Failed to create resource:', error)

      // ROLLBACK: Eliminar archivo de S3 si falló la creación del resource
      try {
        await payload.delete({
          collection: 'media',
          id: mediaRecord.id,
        })
        console.log('[UPLOAD] Rollback: Deleted file from S3')
      } catch (rollbackError) {
        console.error('[UPLOAD] Rollback failed:', rollbackError)
      }

      return NextResponse.json(
        {
          success: false,
          error: 'Failed to create resource',
          details: 'Resource creation failed after file upload. Please try again.',
        },
        { status: 500 },
      )
    }

    // PASO 3: Obtener resource completo con relaciones populadas
    let populatedResource: Resource
    try {
      console.log('[UPLOAD] Fetching resource with populated relations...')

      populatedResource = (await payload.findByID({
        collection: 'resources',
        id: resourceRecord.id,
        depth: 2, // Popula relaciones hasta nivel 2 (resource -> project -> createdBy)
      })) as Resource

      console.log('[UPLOAD] Resource fetched with populated relations:', {
        id: populatedResource.id,
        title: populatedResource.title,
        hasProject: !!(populatedResource as any).project,
        hasFile: !!(populatedResource as any).file,
      })
    } catch (error) {
      console.error('[UPLOAD] Failed to populate resource relations:', error)
      // Fallback a resource sin populación si falla
      populatedResource = resourceRecord
    }

    // PASO 4: Respuesta exitosa con documento completo
    // Nota: La revalidación se maneja en el cliente mediante server actions
    console.log('[UPLOAD] Upload process completed successfully')

    return NextResponse.json(
      {
        success: true,
        data: {
          resource: {
            // Información básica del resource
            id: populatedResource.id,
            title: populatedResource.title,
            description: populatedResource.description,
            type: populatedResource.type,
            namespace: (populatedResource as any).namespace,
            status: populatedResource.status,
            progress: populatedResource.progress,
            createdAt: populatedResource.createdAt,
            updatedAt: populatedResource.updatedAt,

            // Relación con proyecto (populada)
            ...((populatedResource as any).project && {
              project: {
                id: (populatedResource as any).project.id,
                title: (populatedResource as any).project.title,
                slug: (populatedResource as any).project.slug,
                description: (populatedResource as any).project.description,
                createdAt: (populatedResource as any).project.createdAt,
                createdBy: (populatedResource as any).project.createdBy,
              },
            }),

            // Relación con archivo media (populada)
            file: {
              id: (populatedResource as any).file?.id || mediaRecord.id,
              filename: (populatedResource as any).file?.filename || mediaRecord.filename,
              url: (populatedResource as any).file?.url || mediaRecord.url,
              filesize: (populatedResource as any).file?.filesize || mediaRecord.filesize,
              mimeType: (populatedResource as any).file?.mimeType || mediaRecord.mimeType,
              alt: (populatedResource as any).file?.alt,
              createdAt: (populatedResource as any).file?.createdAt,
              updatedAt: (populatedResource as any).file?.updatedAt,
            },

            // Metadatos adicionales del resource
            filters: (populatedResource as any).filters || {},
            user_metadata: (populatedResource as any).user_metadata || {},
            processingMetadata: populatedResource.processingMetadata,
            logs: populatedResource.logs || [],
          },
          metadata: {
            hasFilters: Object.keys(filters).length > 0,
            hasUserMetadata: Object.keys(userMetadata).length > 0,
            hasProject: !!(populatedResource as any).project,
            populationDepth: 2,
            uploadedBy: authenticatedUser.id,
            uploadedAt: new Date().toISOString(),
          },
        },
        message: 'Resource uploaded and processing started successfully',
      },
      { status: 201 },
    )
  } catch (error) {
    console.error('[UPLOAD] Unexpected error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: 'An unexpected error occurred during upload',
      },
      { status: 500 },
    )
  }
}
