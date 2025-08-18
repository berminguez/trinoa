// Server actions para el dashboard
export { getDashboardMetrics, getRecentProjects } from './getDashboardMetrics'
export { getResourcesNeedingAttention, getAlertsStats } from './getResourcesNeedingAttention'
export { getRealtimeActivity, getActivityStats } from './getRealtimeActivity'
export { getOptimizedDashboardData, getCachedDashboardData } from './optimizedQueries'
export type {
  DashboardMetrics,
  ResourceMetrics,
  ProjectMetrics,
  UserMetrics,
  SystemMetrics,
} from './getDashboardMetrics'
export type { ResourceAlert } from './getResourcesNeedingAttention'
export type { ActivityItem } from './getRealtimeActivity'
