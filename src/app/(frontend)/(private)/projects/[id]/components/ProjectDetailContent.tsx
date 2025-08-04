import { getCurrentUser } from '@/actions/auth/getUser'
import { redirect, notFound } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@payload-config'
import type { Project } from '@/payload-types'

import { ProjectDetailHeader } from './ProjectDetailHeader'
import { VideoTableContainer } from './VideoTableContainer'

interface ProjectDetailContentProps {
  projectId: string
}

export async function ProjectDetailContent({ projectId }: ProjectDetailContentProps) {
  // Verificar autenticación
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login')
  }

  // Obtener payload instance
  const payload = await getPayload({ config })

  // Obtener proyecto con verificación de ownership
  let project: Project
  try {
    console.log('Attempting to fetch project with ID:', projectId)
    console.log('Current user:', { id: user.id, role: user.role })

    project = await payload.findByID({
      collection: 'projects',
      id: projectId,
      depth: 1,
    })

    console.log('Project found:', {
      id: project.id,
      title: project.title,
      createdBy: project.createdBy,
    })

    // Verificar ownership (usuario es dueño o admin)
    const createdByUserId =
      typeof project.createdBy === 'object' ? project.createdBy.id : project.createdBy
    const isOwner = createdByUserId === user.id
    const isAdmin = user.role === 'admin'

    console.log('Access check:', {
      isOwner,
      isAdmin,
      userRole: user.role,
      createdByUserId,
      currentUserId: user.id,
    })

    if (!isOwner && !isAdmin) {
      console.log('Access denied: User is not owner or admin')
      notFound()
    }
  } catch (error) {
    console.error('Error fetching project:', error)

    // Log más detalles del error
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }

    notFound()
  }

  // Obtener videos/recursos del proyecto
  const resources = await payload.find({
    collection: 'resources',
    where: {
      project: { equals: projectId },
    },
    limit: 50, // Límite temporal
    sort: '-createdAt',
    depth: 2,
  })

  return (
    <div className='flex-1 space-y-6 p-4 pt-6'>
      <ProjectDetailHeader project={project} user={user} />
      <VideoTableContainer initialResources={resources.docs} projectId={projectId} />
    </div>
  )
}
