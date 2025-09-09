import { useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  IconUser,
  IconFolder,
  IconCalendar,
  IconClock,
  IconMail,
  IconTrendingUp,
  IconChevronRight,
  IconCircleCheck,
  IconClock12,
  IconEdit,
  IconTrash,
  IconEye,
} from '@tabler/icons-react'
import { useUserRole } from '@/hooks/useUserRole'
import type { ClientWithStats } from '@/actions/clients/types'
import { EditClientModal } from './EditClientModal'
import { DeleteClientModal } from './DeleteClientModal'

interface ClientGridItemProps {
  client: ClientWithStats
}

/**
 * Tarjeta individual de cliente en el grid administrativo
 *
 * Componente completamente funcional con información detallada del cliente,
 * estadísticas, estado de actividad y navegación hacia sus proyectos.
 * Incluye botones de editar/eliminar para administradores.
 */
export function ClientGridItem({ client }: ClientGridItemProps) {
  const t = useTranslations('clients.clientCard')
  // Estados para modales
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [clientData, setClientData] = useState<ClientWithStats>(client)

  // Hook para verificar rol de admin
  const { isAdmin, isLoading: isLoadingRole } = useUserRole()

  // Formateo de datos del cliente
  const clientName = clientData.name || 'Usuario sin nombre'
  const displayEmail = clientData.email
  const joinDate = new Date(clientData.createdAt).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

  // Formateo de estadísticas
  const projectCount = clientData.projectCount || 0
  const lastActivity = clientData.lastActivity
    ? new Date(clientData.lastActivity).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null

  // Cálculo de tiempo desde registro
  const daysSinceJoin = Math.floor(
    (Date.now() - new Date(clientData.createdAt).getTime()) / (1000 * 60 * 60 * 24),
  )

  // Determinar color del avatar basado en rol
  const avatarColor =
    {
      admin: 'bg-red-100 text-red-600',
      user: 'bg-blue-100 text-blue-600',
      api: 'bg-purple-100 text-purple-600',
    }[clientData.role || 'user'] || 'bg-gray-100 text-gray-600'

  // Determinar badge variant basado en rol
  const badgeVariant =
    clientData.role === 'admin'
      ? 'destructive'
      : clientData.role === 'api'
        ? 'outline'
        : 'secondary'

  // Handlers para modales
  const handleEditSuccess = (updatedClient: ClientWithStats) => {
    setClientData(updatedClient)
  }

  const handleDeleteSuccess = () => {
    // La eliminación exitosa será manejada por el refresh del router
    // En el modal, por lo que no necesitamos hacer nada aquí
  }

  // Handlers para prevenir propagación de clicks en botones de acción
  const handleEditClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsEditModalOpen(true)
  }

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDeleteModalOpen(true)
  }

  return (
    <>
      <div className='group'>
        <Card className='h-full hover:shadow-lg transition-all duration-200 border-2 hover:border-primary/20 group-hover:bg-gradient-to-br group-hover:from-background group-hover:to-muted/30'>
          {/* Contenido clickeable del card */}
          <Link href={`/clients/${clientData.id}/projects`} className='block'>
            <CardHeader className='pb-4'>
              {/* Header con avatar y badge */}
              <div className='flex items-start justify-between mb-2'>
                <div className='flex items-center space-x-3 flex-1 min-w-0'>
                  <div
                    className={`h-12 w-12 rounded-full flex items-center justify-center ${avatarColor} ring-2 ring-background shadow-sm`}
                  >
                    <IconUser className='h-6 w-6' />
                  </div>
                  <div className='flex-1 min-w-0'>
                    <h3 className='font-semibold text-base truncate group-hover:text-primary transition-colors'>
                      {clientName}
                    </h3>
                    <div className='flex items-center space-x-1 text-sm text-muted-foreground'>
                      <IconMail className='h-3 w-3 flex-shrink-0' />
                      <span className='truncate'>{displayEmail}</span>
                    </div>
                  </div>
                </div>
                <Badge variant={badgeVariant} className='flex-shrink-0 ml-2'>
                  {clientData.role?.toUpperCase() || 'USER'}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className='space-y-4 pb-4'>
              {/* Estadísticas principales */}
              <div className='grid grid-cols-2 gap-3'>
                {/* Proyectos */}
                <div className='flex flex-col space-y-1'>
                  <div className='flex items-center space-x-2'>
                    <IconFolder className='h-4 w-4 text-primary' />
                    <span className='text-sm font-medium text-muted-foreground'>
                      {t('projects')}
                    </span>
                  </div>
                  <span className='text-lg font-bold text-foreground pl-6'>{projectCount}</span>
                </div>

                {/* Estado de actividad */}
                <div className='flex flex-col space-y-1'>
                  <div className='flex items-center space-x-2'>
                    <IconCircleCheck className='h-4 w-4 text-primary' />
                    <span className='text-sm font-medium text-muted-foreground'>{t('state')}</span>
                  </div>
                  <div className='pl-6'>
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        clientData.isActive
                          ? 'bg-green-100 text-green-800 border border-green-200'
                          : 'bg-gray-100 text-gray-600 border border-gray-200'
                      }`}
                    >
                      {clientData.isActive ? (
                        <>
                          <IconCircleCheck className='h-3 w-3 mr-1' />
                          {t('active')}
                        </>
                      ) : (
                        <>
                          <IconClock12 className='h-3 w-3 mr-1' />
                          {t('inactive')}
                        </>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Información temporal */}
              <div className='space-y-2 pt-2 border-t border-muted'>
                {/* Fecha de registro */}
                <div className='flex items-center space-x-2 text-sm text-muted-foreground'>
                  <IconCalendar className='h-4 w-4' />
                  <span>
                    {t('created')} {joinDate}
                  </span>
                  <span className='text-xs opacity-70'>
                    (
                    {daysSinceJoin === 0
                      ? 'hoy'
                      : `hace ${daysSinceJoin} día${daysSinceJoin !== 1 ? 's' : ''}`}
                    )
                  </span>
                </div>

                {/* Última actividad */}
                <div className='flex items-center space-x-2 text-sm text-muted-foreground'>
                  <IconClock className='h-4 w-4' />
                  <span>
                    {lastActivity ? `${t('lastActivity')} ${lastActivity}` : t('noRecentActivity')}
                  </span>
                </div>
              </div>

              {/* Métricas adicionales */}
              {projectCount > 0 && (
                <div className='flex items-center justify-between p-3 bg-muted/50 rounded-lg'>
                  <div className='flex items-center space-x-2'>
                    <IconTrendingUp className='h-4 w-4 text-green-600' />
                    <span className='text-sm font-medium'>
                      {projectCount > 1 ? 'Usuario activo' : 'Usuario nuevo'}
                    </span>
                  </div>
                  <span className='text-xs text-muted-foreground'>
                    {projectCount > 5
                      ? 'Alto uso'
                      : projectCount > 1
                        ? 'Uso moderado'
                        : 'Uso inicial'}
                  </span>
                </div>
              )}
            </CardContent>
          </Link>

          {/* Footer con botones de acción */}
          <CardFooter className='pt-2 pb-4 space-y-2 flex flex-col items-center'>
            {/* Botón principal - Ver proyectos */}
            <div className='w-full'>
              <Link href={`/clients/${clientData.id}/projects`} className='w-full inline-block'>
                <Button
                  variant='outline'
                  className='w-full group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all duration-200'
                >
                  <IconEye className='h-4 w-4 mr-2' />
                  <span>{t('viewProjects')}</span>
                  <IconChevronRight className='h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform duration-200' />
                </Button>
              </Link>
            </div>

            {/* Botones de administración - Solo para admins */}
            {isAdmin && !isLoadingRole && (
              <div className='w-full flex justify-center'>
                <div className='flex gap-2 w-full'>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={handleEditClick}
                    className='flex-1 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700'
                  >
                    <IconEdit className='h-4 w-4 mr-1' />
                    Editar
                  </Button>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={handleDeleteClick}
                    className='flex-1 hover:bg-red-50 hover:border-red-300 hover:text-red-700'
                  >
                    <IconTrash className='h-4 w-4 mr-1' />
                    Eliminar
                  </Button>
                </div>
              </div>
            )}
          </CardFooter>
        </Card>
      </div>

      {/* Modales */}
      <EditClientModal
        client={clientData}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={handleEditSuccess}
      />

      <DeleteClientModal
        client={clientData}
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onSuccess={handleDeleteSuccess}
      />
    </>
  )
}
