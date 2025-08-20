import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/actions/auth/getUser'
import PageContent from './components/PageContent'
import PageSkeleton from './components/PageSkeleton'

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string>>
}) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  return (
    <Suspense fallback={<PageSkeleton />}>
      {/* Server Component */}
      <PageContent searchParams={await searchParams} />
    </Suspense>
  )
}
