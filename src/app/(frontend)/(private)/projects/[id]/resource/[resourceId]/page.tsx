import { Suspense } from 'react'
import PageContent from './components/PageContent'
import PageSkeleton from './components/PageSkeleton'

interface PageProps {
  params: Promise<{ id: string; resourceId: string }>
}

export default function Page({ params }: PageProps) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      {/* Lógica principal en server component */}
      <PageContent params={params} />
    </Suspense>
  )
}
