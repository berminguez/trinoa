import { User } from '@/payload-types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  IconUser,
  IconFolder,
  IconFileText,
  IconUpload,
  IconMessageCircle,
  IconKey,
} from '@tabler/icons-react'

import PersonalProjects from './PersonalProjects'
import ResourcesOverview from './ResourcesOverview'
import AlertsPanel from '../shared/AlertsPanel'
import RealtimeActivityPanel from '../shared/RealtimeActivityPanel'

interface UserDashboardProps {
  user: User
}

/**
 * Dashboard principal para usuarios normales
 * Muestra vista personal con solo los datos del usuario
 */
export default function UserDashboard({ user }: UserDashboardProps) {
  return (
    <div className='flex flex-1 flex-col'>
      <div className='@container/main flex flex-1 flex-col gap-6'>
        <div className='flex flex-col gap-6 py-6'>
          {/* Header del dashboard usuario */}
          <div className='flex flex-col gap-2 px-4 lg:px-6'>
            <div className='flex items-center gap-3'>
              <IconUser className='h-8 w-8 text-primary' />
              <div>
                <h1 className='text-3xl font-bold text-gray-900'>Mi Dashboard</h1>
                <p className='text-gray-600'>Bienvenido de vuelta, {user.name || user.email}</p>
              </div>
            </div>
            <div className='flex items-center gap-2'>
              <Badge variant='secondary' className='bg-green-100 text-green-800'>
                <IconUser className='h-3 w-3 mr-1' />
                Usuario
              </Badge>
              <Badge variant='outline'>Vista personal</Badge>
            </div>
          </div>

          {/* Overview de recursos personales */}
          <div className='px-4 lg:px-6'>
            <ResourcesOverview userId={user.id} />
          </div>

          {/* Proyectos personales y acciones rápidas */}
          <div className='px-4 lg:px-6'>
            <div className='grid grid-cols-1 gap-6 xl:grid-cols-2'>
              {/* Proyectos del usuario */}
              <PersonalProjects userId={user.id} />
            </div>
          </div>

          {/* Alertas y actividad reciente */}
          <div className='px-4 lg:px-6'>
            <div className='grid grid-cols-1 gap-6 xl:grid-cols-2'>
              {/* Alertas de recursos que necesitan atención */}
              <AlertsPanel />

              {/* Actividad reciente */}
              <RealtimeActivityPanel userId={user.id} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
