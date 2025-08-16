import { Suspense } from 'react'
import { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { ProjectDetailContent } from './components/ProjectDetailContent'
import { ProjectDetailSkeleton } from './components/ProjectDetailSkeleton'

interface ProjectDetailPageProps {
  params: { id: string }
}

export async function generateMetadata({ params }: ProjectDetailPageProps): Promise<Metadata> {
  const { id } = params

  return {
    title: `Project Detail - Eidetik Admin`,
    description: `Gestiona los videos y recursos del proyecto`,
  }
}

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { id } = params

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
