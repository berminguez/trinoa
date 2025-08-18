import { User } from '@/payload-types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  IconUsers,
  IconFolder,
  IconFileCheck,
  IconClock,
  IconTrendingUp,
  IconServer,
} from '@tabler/icons-react'

import GlobalMetrics from './GlobalMetrics'
import UsersOverview from './UsersOverview'
// import SystemStats from './SystemStats'
import AlertsPanel from '../shared/AlertsPanel'
import SystemHealthIndicator from '../shared/SystemHealthIndicator'
import RealtimeActivityPanel from '../shared/RealtimeActivityPanel'

interface AdminDashboardProps {
  user: User
}

/**
 * Dashboard principal para usuarios administradores
 * Muestra vista global del sistema con métricas de todos los usuarios
 */
export default function AdminDashboard({ user }: AdminDashboardProps) {
  return (
    <div className='flex flex-1 flex-col'>
      <div className='@container/main flex flex-1 flex-col gap-6'>
        <div className='flex flex-col gap-6 py-6'>
          {/* Header del dashboard admin */}
          <div className='flex flex-col gap-2 px-4 lg:px-6'>
            <div className='flex items-center gap-3'>
              <IconServer className='h-8 w-8 text-primary' />
              <div>
                <h1 className='text-3xl font-bold text-gray-900'>Dashboard Administrativo</h1>
                <p className='text-gray-600'>
                  Vista global del sistema - Bienvenido, {user.name || user.email}
                </p>
              </div>
            </div>
            <div className='flex items-center gap-2'>
              <Badge variant='secondary' className='bg-blue-100 text-blue-800'>
                <IconUsers className='h-3 w-3 mr-1' />
                Administrador
              </Badge>
              <Badge variant='outline'>Acceso completo al sistema</Badge>
            </div>
          </div>

          {/* Indicador de salud del sistema */}
          <div className='px-4 lg:px-6'>
            <SystemHealthIndicator />
          </div>

          {/* Métricas globales del sistema */}
          <div className='px-4 lg:px-6'>
            <GlobalMetrics />
          </div>

          {/* Vista de usuarios y proyectos */}
          <div className='px-4 lg:px-6'>
            <div className='grid grid-cols-1 gap-6 xl:grid-cols-2'>
              {/* Overview de usuarios */}
              <UsersOverview />

              {/* Estadísticas del sistema */}
              {/*   <SystemStats /> */}
            </div>
          </div>

          {/* Alertas globales y acciones rápidas */}
          <div className='px-4 lg:px-6'>
            <div className='grid grid-cols-1 gap-6 xl:grid-cols-2'>
              {/* Alertas de recursos que necesitan atención */}
              <AlertsPanel />

              {/* Acciones rápidas para administradores */}
              <Card>
                <CardHeader>
                  <CardTitle className='flex items-center gap-2'>
                    <IconTrendingUp className='h-5 w-5' />
                    Acciones Rápidas
                  </CardTitle>
                  <CardDescription>
                    Accesos directos a funcionalidades administrativas
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                    <a
                      href='/clients'
                      className='flex flex-col items-center gap-2 p-4 border rounded-lg hover:bg-gray-50 transition-colors'
                    >
                      <IconUsers className='h-6 w-6 text-blue-600' />
                      <span className='text-sm font-medium'>Gestionar Usuarios</span>
                    </a>
                    <a
                      href='/projects'
                      className='flex flex-col items-center gap-2 p-4 border rounded-lg hover:bg-gray-50 transition-colors'
                    >
                      <IconFolder className='h-6 w-6 text-green-600' />
                      <span className='text-sm font-medium'>Ver Proyectos</span>
                    </a>
                    <a
                      href='/admin'
                      className='flex flex-col items-center gap-2 p-4 border rounded-lg hover:bg-gray-50 transition-colors'
                    >
                      <IconServer className='h-6 w-6 text-purple-600' />
                      <span className='text-sm font-medium'>Panel Admin</span>
                    </a>
                    <a
                      href='/playground'
                      className='flex flex-col items-center gap-2 p-4 border rounded-lg hover:bg-gray-50 transition-colors'
                    >
                      <IconFileCheck className='h-6 w-6 text-orange-600' />
                      <span className='text-sm font-medium'>Playground</span>
                    </a>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Actividad global en tiempo real */}
          <div className='px-4 lg:px-6'>
            <RealtimeActivityPanel />
          </div>
        </div>
      </div>
    </div>
  )
}
