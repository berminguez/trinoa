import { Suspense } from 'react'

import PlaygroundContent from './components/PlaygroundContent'
import PlaygroundSkeleton from './components/PlaygroundSkeleton'

export const metadata = {
  title: 'Playground - TRINOA',
  description: 'Chat inteligente con IA y sistema RAG',
}

export default function PlaygroundPage() {
  return (
    <Suspense fallback={<PlaygroundSkeleton />}>
      <PlaygroundContent />
    </Suspense>
  )
}
