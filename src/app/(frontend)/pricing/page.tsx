import { Suspense } from 'react'

import PricingContent from './components/PricingContent'
import PricingPageSkeleton from './components/PricingPageSkeleton'

export const dynamic = 'force-dynamic'

export default function PricingPage() {
  return (
    <Suspense fallback={<PricingPageSkeleton />}>
      <PricingContent />
    </Suspense>
  )
}
