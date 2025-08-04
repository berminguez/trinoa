import { Suspense } from 'react'

import PricingContent from './components/PricingContent'
import PricingPageSkeleton from './components/PricingPageSkeleton'

export default function PricingPage() {
  return (
    <Suspense fallback={<PricingPageSkeleton />}>
      <PricingContent />
    </Suspense>
  )
}
