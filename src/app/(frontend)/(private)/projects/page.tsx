import { Suspense } from 'react'
import { Metadata } from 'next'

import { ProjectsContent } from './components/ProjectsContent'
import { ProjectsSkeleton } from './components/ProjectsSkeleton'

export const metadata: Metadata = {
  title: 'Projects - Eidetik Admin',
  description: 'Gestiona tus proyectos de video y recursos multimedia',
}

export default function ProjectsPage() {
  return (
    <Suspense fallback={<ProjectsSkeleton />}>
      <ProjectsContent />
    </Suspense>
  )
}
