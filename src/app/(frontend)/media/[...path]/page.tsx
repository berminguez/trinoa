import { Suspense } from 'react'
import type { Metadata } from 'next'
import MediaViewerContent from './components/MediaViewerContent'
import MediaViewerSkeleton from './components/MediaViewerSkeleton'

interface MediaPageProps {
  params: Promise<{ path: string[] }>
}

export async function generateMetadata({ params }: MediaPageProps): Promise<Metadata> {
  const { path } = await params
  const fileName = path[path.length - 1] || 'archivo'
  
  return {
    title: `${fileName} - Archivo Protegido`,
    description: 'Ver archivo protegido',
  }
}

export const dynamic = 'force-dynamic'

export default async function MediaPage({ params }: MediaPageProps) {
  const { path } = await params
  
  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={<MediaViewerSkeleton />}>
        <MediaViewerContent path={path} />
      </Suspense>
    </div>
  )
}

