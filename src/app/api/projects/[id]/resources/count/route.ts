import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getCurrentUser } from '@/actions/auth/getUser'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Verificar autenticación
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: projectId } = await params
    const payload = await getPayload({ config })

    // Verificar que el proyecto existe y el usuario tiene acceso
    let project
    try {
      project = await payload.findByID({
        collection: 'projects',
        id: projectId,
        depth: 0, // Solo necesitamos verificar existencia y ownership
      })
    } catch (error) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Verificar ownership (usuario es dueño o admin)
    const createdByUserId =
      typeof project.createdBy === 'object' ? project.createdBy.id : project.createdBy
    const isOwner = createdByUserId === user.id
    const isAdmin = user.role === 'admin'

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Obtener conteo de recursos del proyecto
    const resourcesResult = await payload.find({
      collection: 'resources',
      where: {
        project: { equals: projectId },
      },
      limit: 0, // Solo necesitamos el total count
      pagination: false,
    })

    return NextResponse.json({
      count: resourcesResult.totalDocs,
      projectId: projectId,
    })
  } catch (error) {
    console.error('Error fetching resource count:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
