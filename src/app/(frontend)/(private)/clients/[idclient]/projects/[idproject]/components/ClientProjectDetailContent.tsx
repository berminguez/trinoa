import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@payload-config'
import { AdminBreadcrumbs } from '@/components'
import type { User, Project } from '@/payload-types'
import { requireAdminAccess } from '@/actions/auth/getUser'
import { ClientProjectDetailHeader } from './ClientProjectDetailHeader'
import { DocumentTable } from '@/app/(frontend)/(private)/projects/[id]/components/VideoTable'
import { ClientProjectDetailContentEditable } from './ClientProjectDetailContentEditable'

interface ClientProjectDetailContentProps {
  adminUser: User
  clientId: string
  projectId: string
  editable?: boolean
}

/**
 * Contenido principal para detalle de proyecto en contexto administrativo
 *
 * Adaptado de ProjectDetailContent.tsx para administradores
 * Permite ver y gestionar recursos de cualquier proyecto/cliente
 */
export async function ClientProjectDetailContent({
  adminUser,
  clientId,
  projectId,
  editable = true,
}: ClientProjectDetailContentProps) {
  try {
    // Verificar acceso de administrador
    await requireAdminAccess()

    // Obtener payload instance
    const payload = await getPayload({ config })

    // Obtener datos del proyecto con información del cliente
    let project: Project
    let client: User

    try {
      console.log(
        `ClientProjectDetailContent: Cargando proyecto ${projectId} para cliente ${clientId}`,
      )

      // Obtener proyecto con profundidad para relaciones
      project = await payload.findByID({
        collection: 'projects',
        id: projectId,
        depth: 2,
      })

      console.log(`ClientProjectDetailContent: Proyecto encontrado: ${project.title}`)

      // Verificar que el proyecto pertenece al cliente especificado
      const createdByUserId =
        typeof project.createdBy === 'object' ? project.createdBy.id : project.createdBy

      if (createdByUserId !== clientId) {
        console.log(
          `ClientProjectDetailContent: Proyecto no pertenece al cliente. Proyecto creado por: ${createdByUserId}, Cliente esperado: ${clientId}`,
        )
        notFound()
      }

      // Obtener información del cliente
      client = await payload.findByID({
        collection: 'users',
        id: clientId,
        depth: 1,
      })

      console.log(`ClientProjectDetailContent: Cliente encontrado: ${client.email}`)
    } catch (error) {
      console.error('ClientProjectDetailContent: Error obteniendo proyecto o cliente:', error)
      notFound()
    }

    // Obtener recursos del proyecto
    const resources = await payload.find({
      collection: 'resources',
      where: {
        project: { equals: projectId },
      },
      limit: 50,
      sort: '-createdAt',
      depth: 2,
    })

    console.log(
      `ClientProjectDetailContent: ${resources.docs.length} recursos encontrados para proyecto ${project.title}`,
    )

    // Usar versión editable o solo lectura según el parámetro
    if (editable) {
      return (
        <ClientProjectDetailContentEditable
          project={project}
          client={client}
          adminUser={adminUser}
          initialResources={resources.docs}
        />
      )
    }

    // Versión solo lectura
    return (
      <div className='flex-1 space-y-6 p-4 pt-6'>
        {/* Breadcrumb de navegación administrativa */}
        {AdminBreadcrumbs.projectDetail(
          client.name || client.email,
          clientId,
          project.title,
          projectId,
        )}

        {/* Header del proyecto con información del cliente */}
        <ClientProjectDetailHeader
          project={project}
          client={client}
          adminUser={adminUser}
          totalResources={resources.totalDocs}
        />

        {/* Tabla de recursos con funcionalidad administrativa */}
        <DocumentTable
          resources={resources.docs}
          projectId={projectId}
          clientMode={{
            clientId: clientId,
            projectId: projectId,
          }}
          key={resources.docs.length} // Force re-render cuando recursos cambien
        />
      </div>
    )
  } catch (error) {
    console.error('ClientProjectDetailContent: Error inesperado:', error)
    notFound()
  }
}
