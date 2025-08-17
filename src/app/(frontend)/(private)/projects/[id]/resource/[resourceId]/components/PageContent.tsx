'use server'

import { notFound, redirect } from 'next/navigation'
import { getCurrentUser } from '@/actions/auth/getUser'
import { getPayload } from 'payload'
import config from '@/payload.config'
import type { Media } from '@/payload-types'
import { getSafeMediaUrl } from '@/lib/utils/fileUtils'
import ResizableSplit from './ResizableSplit'
import PDFViewer from './PDFViewer'
import ImageViewer from './ImageViewer'
import ResourceForm from './ResourceForm'
import InlineTitleEditor from './InlineTitleEditor'
import { ConfidenceBadge } from '@/components/ui/confidence-badge'

interface PageContentProps {
  params: Promise<{ id: string; resourceId: string }>
}

export default async function PageContent({ params }: PageContentProps) {
  // 1) Autenticación básica
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login')
  }

  // 2) Carga de datos de proyecto y recurso con depth suficiente
  const payload = await getPayload({ config })
  const { id, resourceId } = await params

  const projectRes = await payload.findByID({
    collection: 'projects',
    id,
    depth: 2,
  })

  if (!projectRes) notFound()

  const resourceRes = await payload.findByID({
    collection: 'resources',
    id: resourceId,
    depth: 2,
  })

  if (!resourceRes) notFound()

  // Verificar ownership del proyecto (owner o admin)
  const createdByUserId =
    typeof projectRes.createdBy === 'object' ? projectRes.createdBy.id : projectRes.createdBy
  const isOwner = createdByUserId === user.id
  const isAdmin = user.role === 'admin'
  if (!isOwner && !isAdmin) notFound()

  // Verificar pertenencia del recurso al proyecto
  const resourceProjectId =
    typeof resourceRes.project === 'object' ? resourceRes.project.id : resourceRes.project
  if (String(resourceProjectId) !== String(id)) notFound()

  // Preparar datos para visor y formulario (props para componentes cliente)
  const media = (typeof resourceRes.file === 'object' ? resourceRes.file : null) as Media | null
  const mime = media?.mimeType || undefined
  const filename = media?.filename || undefined
  const safeUrl = await getSafeMediaUrl(media)
  const viewerKind: 'pdf' | 'image' | 'unknown' = mime
    ? mime.toLowerCase().includes('pdf')
      ? 'pdf'
      : mime.toLowerCase().startsWith('image/')
        ? 'image'
        : 'unknown'
    : 'unknown'

  const viewerProps = {
    projectId: String(projectRes.id),
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

  // Calcular anterior/siguiente dentro del proyecto por createdAt desc
  const resourceList = await payload.find({
    collection: 'resources',
    where: { project: { equals: String(projectRes.id) } },
    limit: 100,
    sort: '-createdAt',
    depth: 0,
  })
  const ids = resourceList.docs.map((d: any) => String(d.id))
  const currentIdx = ids.indexOf(String(resourceRes.id))
  const prevId = currentIdx > 0 ? ids[currentIdx - 1] : null
  const nextId = currentIdx >= 0 && currentIdx < ids.length - 1 ? ids[currentIdx + 1] : null

  return (
    <div className='flex h-[calc(100vh-50px)] w-full min-w-0 max-w-full flex-col overflow-hidden'>
      {/* Split panes */}
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
                  projectId={String(projectRes.id)}
                  resourceId={String(resourceRes.id)}
                  initialTitle={viewerProps.title}
                />
                
                {/* Confidence Badge */}
                <div className='flex items-center gap-2 mt-2 mb-2'>
                  <ConfidenceBadge 
                    confidence={resourceRes.confidence || 'empty'}
                    showIcon={true}
                    showTooltip={true}
                    size="default"
                  />
                  <span className='text-xs text-muted-foreground'>
                    Estado de confianza del documento
                  </span>
                </div>
                
                {viewerProps.file.filename ? (
                  <p className='text-xs text-muted-foreground break-all'>
                    {viewerProps.file.filename}
                  </p>
                ) : null}
              </div>
              <ResourceForm
                projectId={String(projectRes.id)}
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

        {/*
        <ResizableSplit
          left={
            <div className='flex h-full w-full min-w-0 max-w-full items-start justify-center p-0 text-xs text-muted-foreground overflow-x-hidden overflow-y-auto'>
              {viewerProps.file.url ? (
                viewerProps.file.kind === 'pdf' ? (
                  <PDFViewer url={viewerProps.file.url} />
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
            <div className='h-full w-full p-4 min-w-0 max-w-full overflow-auto'>
              <ResourceForm
                projectId={String(projectRes.id)}
                resourceId={String(resourceRes.id)}
                initialValues={{
                  nombre_cliente: viewerProps.globals.nombre_cliente,
                  caso: viewerProps.globals.caso,
                  tipo: viewerProps.globals.tipo,
                  caseData: undefined,
                }}
              />
            </div>
          }
        />
        */}
      </div>
    </div>
  )
}
