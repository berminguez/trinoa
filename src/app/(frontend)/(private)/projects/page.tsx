import { Suspense } from 'react'
import { Metadata } from 'next'

import { ProjectsContent } from './components/ProjectsContent'
import { ProjectsSkeleton } from './components/ProjectsSkeleton'

export const metadata: Metadata = {
  title: 'Projects - TRINOA Admin',
  description: 'Gestiona tus proyectos de video y recursos multimedia',
}

export const dynamic = 'force-dynamic'

export default function ProjectsPage() {
  return (
    <Suspense fallback={<ProjectsSkeleton />}>
      <ProjectsContent />
    </Suspense>
  )
}
