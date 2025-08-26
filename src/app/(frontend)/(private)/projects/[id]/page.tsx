import { Suspense } from 'react'
import { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { ProjectDetailContent } from './components/ProjectDetailContent'
import { ProjectDetailSkeleton } from './components/ProjectDetailSkeleton'

// Asegurar que la página se regenere en cada request para que revalidatePath funcione
export const dynamic = 'force-dynamic'

interface ProjectDetailPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: ProjectDetailPageProps): Promise<Metadata> {
  const { id } = await params

  return {
    title: `Project Detail - TRINOA Admin`,
    description: `Gestiona los videos y recursos del proyecto`,
  }
}

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { id } = await params

  console.log('id param', id)

  // Validar que el ID es válido
  if (!id || id.length < 10) {
    notFound()
  }

  return (
    <Suspense fallback={<ProjectDetailSkeleton />}>
      <ProjectDetailContent projectId={id} />
    </Suspense>
  )
}
