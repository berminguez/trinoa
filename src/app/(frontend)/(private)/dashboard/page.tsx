import { Suspense } from 'react'
import DashboardContent from './components/DashboardContent'
import DashboardSkeleton from './components/DashboardSkeleton'

/**
 * Página principal del dashboard con estructura Suspense
 * El layout privado ya maneja toda la autenticación y protección
 */
export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  )
}
