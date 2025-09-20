import { getCurrentUser } from '@/actions/auth/getUser'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@payload-config'

import { ProjectsGrid } from './ProjectsGrid'
import { ProjectsHeader } from './ProjectsHeader'

export async function ProjectsContent() {
  // Verificar autenticación
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login')
    return // Esto nunca se ejecuta pero ayuda a TypeScript
  }

  // Obtener payload instance
  const payload = await getPayload({ config })

  // Obtener proyectos del usuario actual
  const projects = await payload.find({
    collection: 'projects' as any,
    where: {
      createdBy: { equals: user.id },
    },
    limit: 50, // Límite temporal
    sort: '-createdAt', // Ordenar por más recientes primero
    depth: 1,
  })

  return (
    <div className='flex-1 space-y-6 p-4 pt-6'>
      <ProjectsHeader user={user} />
      <ProjectsGrid projects={projects.docs} />
    </div>
  )
}
