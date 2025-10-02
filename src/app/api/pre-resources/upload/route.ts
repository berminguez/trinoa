import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

// Crea Media + PreResource a partir de multipart/form-data
// Campos requeridos: projectId, file (PDF)
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const payload = await getPayload({ config })

    // Autenticación mediante cookie de Payload (igual que /api/resources/upload)
    const cookieHeader = request.headers.get('cookie')
    if (!cookieHeader) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 },
      )
    }
    const meRes = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/users/me`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', Cookie: cookieHeader },
      credentials: 'include',
      cache: 'no-store',
    })
    if (!meRes.ok) {
      return NextResponse.json({ success: false, error: 'Invalid authentication' }, { status: 401 })
    }
    const meData = await meRes.json()
    const authUser = meData?.user
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'User data not available' },
        { status: 401 },
      )
    }

    // Validar content-type
    const contentType = request.headers.get('content-type')
    if (!contentType?.includes('multipart/form-data')) {
      return NextResponse.json(
        { success: false, error: 'multipart/form-data required' },
        { status: 400 },
      )
    }

    const formData = await request.formData()
    const projectId = String(formData.get('projectId') || '')
    const file = formData.get('file') as File | null
    const splitMode = String(formData.get('splitMode') || 'auto')
    const manualPages = String(formData.get('manualPages') || '')

    if (!projectId || !file) {
      return NextResponse.json(
        { success: false, error: 'projectId and file are required' },
        { status: 400 },
      )
    }

    if (!file.type?.includes('pdf')) {
      return NextResponse.json({ success: false, error: 'Only PDF is allowed' }, { status: 400 })
    }

    // Validar modo manual si está seleccionado
    if (splitMode === 'manual') {
      if (!manualPages || !manualPages.trim()) {
        return NextResponse.json(
          { success: false, error: 'Los números de página son requeridos para el modo manual' },
          { status: 400 },
        )
      }

      // Validar formato de números de página (números separados por comas)
      const pageNumbers = manualPages
        .split(',')
        .map((p) => p.trim())
        .filter((p) => p)
      const validPages = pageNumbers.every((p) => /^\d+$/.test(p) && parseInt(p) > 0)

      if (!validPages) {
        return NextResponse.json(
          {
            success: false,
            error:
              'Los números de página deben ser números positivos separados por comas (ej: 1,3,5)',
          },
          { status: 400 },
        )
      }

      if (pageNumbers.length < 2) {
        return NextResponse.json(
          {
            success: false,
            error: 'Debe especificar al menos 2 números de página para dividir el documento',
          },
          { status: 400 },
        )
      }
    }

    // Validar proyecto y ownership (mismo patrón que upload)
    const project = await payload.findByID({ collection: 'projects' as any, id: projectId })
    if (!project) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 })
    }
    const isAdmin = authUser.role === 'admin'
    const ownerId = typeof project.createdBy === 'object' ? project.createdBy.id : project.createdBy
    if (!isAdmin && ownerId !== authUser.id) {
      return NextResponse.json({ success: false, error: 'Project access denied' }, { status: 403 })
    }

    // Subir a Media
    const buffer = Buffer.from(await file.arrayBuffer())
    const media = await payload.create({
      collection: 'media',
      data: {
        filename: file.name,
        mimeType: file.type,
        filesize: buffer.length,
        alt: file.name,
        title: file.name.replace(/\.[^/.]+$/, ''),
        description: 'PDF para proceso Splitter',
        mediaType: 'document',
      },
      file: {
        data: buffer,
        mimetype: file.type,
        name: file.name,
        size: buffer.length,
      },
    } as any)

    // Extraer nombre original limpio sin extensión para usar en recursos derivados
    const originalNameWithoutExtension = file.name
      .replace(/\.[^/.]+$/, '')
      .replace(/[^a-zA-Z0-9\s.-]/g, '_')

    // Crear PreResource
    const pre = await payload.create({
      collection: 'pre-resources',
      data: {
        project: projectId,
        user: authUser.id,
        file: (media as any).id,
        originalName: originalNameWithoutExtension,
        splitMode: splitMode as 'auto' | 'manual',
        manualPageNumbers: splitMode === 'manual' ? manualPages : undefined,
        status: 'pending',
      },
      overrideAccess: true,
    } as any)

    // El procesamiento del splitter se ejecuta automáticamente via hook afterChange
    // que usa OpenAI para analizar el PDF y dividirlo en segmentos

    return NextResponse.json({
      success: true,
      data: { preResourceId: String((pre as any).id) },
      message: 'Pre-resource creado; procesamiento con OpenAI iniciado automáticamente',
    })
  } catch (e) {
    console.error('[PRE-RESOURCES UPLOAD] Error:', e)
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 })
  }
}
