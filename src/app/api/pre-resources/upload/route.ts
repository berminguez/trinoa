import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { processPreResource } from '@/actions/splitter/processPreResource'

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
    if (!projectId || !file) {
      return NextResponse.json(
        { success: false, error: 'projectId and file are required' },
        { status: 400 },
      )
    }

    if (!file.type?.includes('pdf')) {
      return NextResponse.json({ success: false, error: 'Only PDF is allowed' }, { status: 400 })
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
        status: 'pending',
      },
      overrideAccess: true,
    } as any)

    // Llamar al Splitter inmediatamente para obtener pages y guardarlas en el pre-resource
    let pages: number[] | undefined
    try {
      const splitRes = await processPreResource({ preResourceId: String((pre as any).id) })
      if (splitRes.success) {
        pages = splitRes.data?.pages
      }
    } catch {}

    return NextResponse.json({
      success: true,
      data: { preResourceId: String((pre as any).id), pages },
      message: pages
        ? 'Pre-resource creado y páginas detectadas'
        : 'Pre-resource creado; procesamiento iniciado',
    })
  } catch (e) {
    console.error('[PRE-RESOURCES UPLOAD] Error:', e)
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 })
  }
}
