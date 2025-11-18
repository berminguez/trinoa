import { getCurrentUser } from '@/actions/auth/getUser'
import { redirect, notFound } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@payload-config'
import type { Project } from '@/payload-types'
import { getProjectResources } from '@/actions/projects/getProjectResources'

import { ProjectDetailClientWrapper } from './ProjectDetailClientWrapper'

interface ProjectDetailContentProps {
  projectId: string
}

export async function ProjectDetailContent({ projectId }: ProjectDetailContentProps) {
  // Verificar autenticación
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login')
    return // Esto nunca se ejecuta pero ayuda a TypeScript
  }

  // Obtener payload instance
  const payload = await getPayload({ config })

  // Obtener proyecto con verificación de ownership
  let project: Project
  let resources: any
  try {
    project = await payload.findByID({
      collection: 'projects',
      id: projectId,
      depth: 1,
    })

    // Verificar ownership (usuario es dueño o admin)
    const createdByUserId =
      typeof project.createdBy === 'object' ? project.createdBy.id : project.createdBy
    const isOwner = createdByUserId === user.id
    const isAdmin = user.role === 'admin'

    if (!isOwner && !isAdmin) {
      console.log('Access denied: User is not owner or admin')
      notFound()
      return // Esto nunca se ejecuta pero ayuda a TypeScript
    }
  } catch (error) {
    console.error('Error fetching project:', error)

    // Log más detalles del error
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }

    notFound()
    return // Esto nunca se ejecuta pero ayuda a TypeScript
  }

  // Obtener videos/recursos del proyecto
  resources = await payload.find({
    collection: 'resources',
    where: {
      project: { equals: projectId },
    },
    limit: 50000, // Límite muy alto - la tabla tiene paginación frontend
    sort: '-createdAt',
    depth: 2,
  })

  return (
    <ProjectDetailClientWrapper
      project={project}
      user={user}
      initialResources={resources.docs}
      projectId={projectId}
      getProjectResourcesAction={getProjectResources}
    />
  )
}
