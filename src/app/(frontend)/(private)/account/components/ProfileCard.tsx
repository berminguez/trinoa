'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  IconUser,
  IconMail,
  IconBuilding,
  IconCalendar,
  IconEdit,
  IconShield,
  IconClock,
  IconBuildingSkyscraper,
} from '@tabler/icons-react'
import type { User } from '@/payload-types'
import { EditProfileModal } from './EditProfileModal'

interface ProfileCardProps {
  user: User
}

/**
 * Tarjeta de perfil del usuario con información personal
 *
 * Muestra datos del usuario y permite editarlos
 */
export function ProfileCard({ user }: ProfileCardProps) {
  const t = useTranslations('account.profileCard')
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [userData, setUserData] = useState<User>(user)

  // Formatear fechas
  const joinDate = new Date(userData.createdAt).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const lastUpdate = new Date(userData.updatedAt).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  // Determinar color del avatar basado en rol
  const avatarColor =
    {
      admin: 'bg-red-100 text-red-600',
      user: 'bg-blue-100 text-blue-600',
      api: 'bg-purple-100 text-purple-600',
    }[userData.role || 'user'] || 'bg-gray-100 text-gray-600'

  // Determinar badge variant basado en rol
  const badgeVariant =
    userData.role === 'admin' ? 'destructive' : userData.role === 'api' ? 'outline' : 'default'

  // Handler para actualización exitosa
  const handleUpdateSuccess = (updatedUser: User) => {
    setUserData(updatedUser)
  }

  // Generar iniciales para el avatar
  const getInitials = (name?: string | null, email?: string) => {
    if (name && name.trim()) {
      return name
        .split(' ')
        .map((word) => word.charAt(0))
        .join('')
        .toUpperCase()
        .slice(0, 2)
    }

    if (email) {
      return email.charAt(0).toUpperCase()
    }

    return 'U'
  }

  // Obtener nombre de la empresa (puede ser string o relación)
  const getCompanyName = (empresa: string | any) => {
    if (!empresa) return null
    
    // Si es un objeto (relación), usar el nombre
    if (typeof empresa === 'object' && empresa.name) {
      return empresa.name
    }
    
    // Si es string (legacy), usar directamente
    if (typeof empresa === 'string') {
      return empresa
    }
    
    return null
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <CardTitle className='flex items-center gap-2'>
              <IconUser className='h-5 w-5' />
              {t('title')}
            </CardTitle>
            <Button
              variant='outline'
              size='sm'
              onClick={() => setIsEditModalOpen(true)}
              className='flex items-center gap-2'
            >
              <IconEdit className='h-4 w-4' />
              {t('edit')}
            </Button>
          </div>
        </CardHeader>
        <CardContent className='space-y-6'>
          {/* Avatar y información principal */}
          <div className='flex items-center space-x-4'>
            <div
              className={`h-16 w-16 rounded-full flex items-center justify-center ${avatarColor} ring-2 ring-background shadow-sm`}
            >
              <span className='text-xl font-semibold'>
                {getInitials(userData.name, userData.email)}
              </span>
            </div>
            <div className='flex-1 min-w-0'>
              <h3 className='text-xl font-semibold truncate'>{userData.name || t('noName')}</h3>
              <div className='flex items-center gap-2 mt-1'>
                <p className='text-muted-foreground truncate'>{userData.email}</p>
                <Badge variant={badgeVariant}>
                  {userData.role === 'admin' && (
                    <>
                      <IconShield className='h-3 w-3 mr-1' />
                      {t('roles.admin')}
                    </>
                  )}
                  {userData.role === 'user' && t('roles.user')}
                  {userData.role === 'api' && t('roles.api')}
                </Badge>
              </div>
            </div>
          </div>

          {/* Información detallada */}
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
            {/* Nombre */}
            <div className='space-y-2'>
              <label className='text-sm font-medium text-muted-foreground'>{t('name')}</label>
              <div className='flex items-center gap-2 p-3 bg-muted/50 rounded-lg'>
                <IconUser className='h-4 w-4 text-muted-foreground' />
                <span className='text-sm'>{userData.name || t('notSpecified')}</span>
              </div>
            </div>

            {/* Empresa */}
            <div className='space-y-2'>
              <label className='text-sm font-medium text-muted-foreground'>{t('company')}</label>
              <div className='flex items-center gap-2 p-3 bg-muted/50 rounded-lg'>
                <IconBuilding className='h-4 w-4 text-muted-foreground' />
                {getCompanyName(userData.empresa) ? (
                  <Badge variant="secondary" className="text-sm">
                    {getCompanyName(userData.empresa)}
                  </Badge>
                ) : (
                  <span className='text-sm text-muted-foreground'>{t('notSpecifiedCompany')}</span>
                )}
              </div>
            </div>

            {/* Filial */}
            <div className='space-y-2'>
              <label className='text-sm font-medium text-muted-foreground'>{t('branch')}</label>
              <div className='flex items-center gap-2 p-3 bg-muted/50 rounded-lg'>
                <IconBuildingSkyscraper className='h-4 w-4 text-muted-foreground' />
                {userData.filial ? (
                  <Badge variant="outline" className="text-sm">
                    {userData.filial}
                  </Badge>
                ) : (
                  <span className='text-sm text-muted-foreground'>{t('notSpecifiedBranch')}</span>
                )}
              </div>
            </div>

            {/* Email */}
            <div className='space-y-2'>
              <label className='text-sm font-medium text-muted-foreground'>{t('email')}</label>
              <div className='flex items-center gap-2 p-3 bg-muted/50 rounded-lg'>
                <IconMail className='h-4 w-4 text-muted-foreground' />
                <span className='text-sm truncate'>{userData.email}</span>
              </div>
            </div>

            {/* Rol */}
            <div className='space-y-2'>
              <label className='text-sm font-medium text-muted-foreground'>{t('role')}</label>
              <div className='flex items-center gap-2 p-3 bg-muted/50 rounded-lg'>
                <IconShield className='h-4 w-4 text-muted-foreground' />
                <span className='text-sm'>
                  {userData.role === 'admin' && t('roles.admin')}
                  {userData.role === 'user' && t('roles.user')}
                  {userData.role === 'api' && t('roles.api')}
                  {!userData.role && t('roles.user')}
                </span>
              </div>
            </div>
          </div>

          {/* Información temporal */}
          <div className='pt-4 border-t border-muted'>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <div className='flex items-center gap-3 text-sm text-muted-foreground'>
                <IconCalendar className='h-4 w-4' />
                <div>
                  <span className='font-medium'>{t('registered')}</span>
                  <span className='ml-1'>{joinDate}</span>
                </div>
              </div>
              <div className='flex items-center gap-3 text-sm text-muted-foreground'>
                <IconClock className='h-4 w-4' />
                <div>
                  <span className='font-medium'>{t('lastUpdate')}</span>
                  <span className='ml-1'>{lastUpdate}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal de edición */}
      <EditProfileModal
        user={userData}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={handleUpdateSuccess}
      />
    </>
  )
}
