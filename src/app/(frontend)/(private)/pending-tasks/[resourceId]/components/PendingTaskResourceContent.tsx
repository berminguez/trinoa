'use server'

import { notFound, redirect } from 'next/navigation'
import { requireAdminAccess } from '@/actions/auth/getUser'
import { getPayload } from 'payload'
import config from '@/payload.config'
import type { User, Media, Resource, Project } from '@/payload-types'
import { getSafeMediaUrl } from '@/lib/utils/fileUtils'
import { getPendingResourceNavigation } from '@/actions/pending-tasks/getPendingResources'
import ResizableSplit from '@/app/(frontend)/(private)/projects/[id]/resource/[resourceId]/components/ResizableSplit'
import PDFViewer from '@/app/(frontend)/(private)/projects/[id]/resource/[resourceId]/components/PDFViewer'
import ImageViewer from '@/app/(frontend)/(private)/projects/[id]/resource/[resourceId]/components/ImageViewer'
import ResourceForm from '@/app/(frontend)/(private)/projects/[id]/resource/[resourceId]/components/ResourceForm'
import InlineTitleEditor from '@/app/(frontend)/(private)/projects/[id]/resource/[resourceId]/components/InlineTitleEditor'
import { PendingTaskNavigation } from './PendingTaskNavigation'

interface PendingTaskResourceContentProps {
  adminUser: User
  resourceId: string
}

/**
 * Contenido principal para vista de recurso pendiente con pantalla partida
 *
 * Replica la funcionalidad de PageContent pero para tareas pendientes:
 * - Pantalla partida: documento + formulario
 * - Navegación entre recursos pendientes (no por proyecto)
 * - Validaciones de administrador
 */
export async function PendingTaskResourceContent({
  adminUser,
  resourceId,
}: PendingTaskResourceContentProps) {
  try {
    const payload = await getPayload({ config })

    // Obtener el recurso con relaciones completas
    let resourceRes: Resource
    try {
      resourceRes = (await payload.findByID({
        collection: 'resources',
        id: resourceId,
        depth: 2,
      })) as Resource
    } catch (error) {
      console.error(`PendingTaskResourceContent: Error obteniendo recurso ${resourceId}:`, error)
      notFound()
      return
    }

    if (!resourceRes) {
      console.log(`PendingTaskResourceContent: Recurso ${resourceId} no encontrado`)
      notFound()
      return
    }

    console.log(`PendingTaskResourceContent: Recurso ${resourceId} encontrado:`, {
      status: resourceRes.status,
      confidence: resourceRes.confidence,
      title: resourceRes.title,
    })

    // Verificar que el recurso es efectivamente una tarea pendiente
    const isPendingTask =
      (resourceRes.status === 'completed' || resourceRes.status === 'failed') &&
      (resourceRes.confidence === 'empty' || resourceRes.confidence === 'needs_revision')

    if (!isPendingTask) {
      console.log(
        `PendingTaskResourceContent: Recurso ${resourceId} no es una tarea pendiente - status: ${resourceRes.status}, confidence: ${resourceRes.confidence}`,
      )

      // En lugar de redirect, mostrar mensaje de error en la UI
      return (
        <div className='flex h-[calc(100vh-50px)] w-full items-center justify-center'>
          <div className='text-center space-y-4'>
            <h2 className='text-xl font-semibold text-destructive'>Recurso no válido</h2>
            <p className='text-muted-foreground max-w-md'>
              Este recurso no cumple los criterios para ser una tarea pendiente.
            </p>
            <p className='text-sm text-muted-foreground'>
              Status: {resourceRes.status} | Confidence: {resourceRes.confidence || 'vacío'}
            </p>
            <div className='pt-4'>
              <a
                href='/pending-tasks'
                className='inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90'
              >
                Volver a tareas pendientes
              </a>
            </div>
          </div>
        </div>
      )
    }

    // Obtener información del proyecto y cliente para contexto
    const project = resourceRes.project as Project
    const projectId =
      typeof resourceRes.project === 'object' ? resourceRes.project.id : resourceRes.project

    // Preparar datos para visor y formulario
    const media = (typeof resourceRes.file === 'object' ? resourceRes.file : null) as Media | null
    const mime = media?.mimeType || undefined
    const filename = media?.filename || undefined

    let safeUrl: string | null = null
    try {
      safeUrl = await getSafeMediaUrl(media)
    } catch (error) {
      console.error(`PendingTaskResourceContent: Error obteniendo URL segura para media:`, error)
      safeUrl = null
    }

    const viewerKind: 'pdf' | 'image' | 'unknown' = mime
      ? mime.toLowerCase().includes('pdf')
        ? 'pdf'
        : mime.toLowerCase().startsWith('image/')
          ? 'image'
          : 'unknown'
      : 'unknown'

    const viewerProps = {
      projectId: String(projectId),
      resourceId: String(resourceRes.id),
      title: resourceRes.title,
      file: { url: safeUrl, mimeType: mime, filename, kind: viewerKind },
      globals: {
        nombre_cliente: resourceRes.nombre_cliente ?? '',
        caso: resourceRes.caso ?? null,
        tipo: resourceRes.tipo ?? null,
      },
      status: resourceRes.status,
    }

    // Obtener navegación entre tareas pendientes
    let navigationResponse
    try {
      navigationResponse = await getPendingResourceNavigation(resourceId)
    } catch (error) {
      console.error(`PendingTaskResourceContent: Error obteniendo navegación:`, error)
      navigationResponse = { success: false, error: 'Error al obtener navegación' }
    }

    const navigation = navigationResponse.success
      ? {
          prevId: navigationResponse.data?.prevId || null,
          nextId: navigationResponse.data?.nextId || null,
          currentIndex: navigationResponse.data?.currentIndex ?? 0,
          total: navigationResponse.data?.total ?? 0,
        }
      : {
          prevId: null,
          nextId: null,
          currentIndex: 0,
          total: 0,
        }

    console.log(
      `PendingTaskResourceContent: Navegación - Tarea ${navigation.currentIndex + 1} de ${navigation.total}`,
    )

    return (
      <div className='flex h-[calc(100vh-50px)] w-full min-w-0 max-w-full flex-col overflow-hidden'>
        {/* Navegación superior entre tareas pendientes */}
        <PendingTaskNavigation resource={resourceRes} project={project} navigation={navigation} />

        {/* Split panes - igual que en PageContent original */}
        <div className='flex min-w-0 max-w-full flex-1 overflow-hidden'>
          <ResizableSplit
            left={
              <div className='h-full p-4'>
                {viewerProps.file.url ? (
                  viewerProps.file.kind === 'pdf' ? (
                    <PDFViewer url={viewerProps.file.url} filename={viewerProps.file.filename} />
                  ) : viewerProps.file.kind === 'image' ? (
                    <ImageViewer url={viewerProps.file.url} alt={viewerProps.title} />
                  ) : (
                    <span>Tipo de archivo no soportado</span>
                  )
                ) : (
                  <span>Sin archivo disponible</span>
                )}
              </div>
            }
            right={
              <div className='p-4'>
                <div className='mb-4'>
                  <InlineTitleEditor
                    projectId={String(projectId)}
                    resourceId={String(resourceRes.id)}
                    initialTitle={viewerProps.title}
                  />
                  {viewerProps.file.filename ? (
                    <p className='text-xs text-muted-foreground break-all'>
                      {viewerProps.file.filename}
                    </p>
                  ) : null}
                </div>
                <ResourceForm
                  projectId={String(projectId)}
                  resourceId={String(resourceRes.id)}
                  initialValues={{
                    nombre_cliente: viewerProps.globals.nombre_cliente,
                    caso: viewerProps.globals.caso,
                    tipo: viewerProps.globals.tipo,
                    caseData:
                      (viewerProps.globals.caso
                        ? (resourceRes as any)[viewerProps.globals.caso]
                        : undefined) || undefined,
                  }}
                  initialStatus={viewerProps.status as any}
                />
              </div>
            }
          />
        </div>
      </div>
    )
  } catch (error) {
    console.error('PendingTaskResourceContent: Error inesperado:', error)
    notFound()
  }
}
