'use client'

import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { IconSettings, IconKey, IconShield, IconClock, IconExternalLink } from '@tabler/icons-react'
import type { User } from '@/payload-types'
import { ChangePasswordModal } from '@/components/change-password-modal'

interface AccountSettingsProps {
  user: User
}

/**
 * Configuraciones adicionales de la cuenta
 *
 * Incluye configuraciones de seguridad y preferencias
 */
export function AccountSettings({ user }: AccountSettingsProps) {
  const t = useTranslations('account.accountSettings')

  // Calcular días desde el registro
  const daysSinceJoin = Math.floor(
    (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24),
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          <IconSettings className='h-5 w-5' />
          {t('title')}
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-6'>
        {/* Información de seguridad */}
        <div className='space-y-4'>
          <h4 className='text-sm font-medium text-muted-foreground uppercase tracking-wide'>
            {t('security')}
          </h4>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            {/* Estado de la cuenta */}
            <div className='space-y-2'>
              <label className='text-sm font-medium text-muted-foreground'>
                {t('accountStatus')}
              </label>
              <div className='flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg'>
                <IconShield className='h-4 w-4 text-green-600' />
                <span className='text-sm text-green-800 font-medium'>{t('active')}</span>
              </div>
            </div>

            {/* Tiempo activo */}
            <div className='space-y-2'>
              <label className='text-sm font-medium text-muted-foreground'>{t('timeAsUser')}</label>
              <div className='flex items-center gap-2 p-3 bg-muted/50 rounded-lg'>
                <IconClock className='h-4 w-4 text-muted-foreground' />
                <span className='text-sm'>
                  {daysSinceJoin === 0
                    ? t('registeredToday')
                    : `${daysSinceJoin} ${daysSinceJoin !== 1 ? t('daysPlural') : t('days')}`}
                </span>
              </div>
            </div>
          </div>

          {/* Permisos y rol */}
          <div className='space-y-2'>
            <label className='text-sm font-medium text-muted-foreground'>{t('accessLevel')}</label>
            <div className='flex items-center justify-between p-3 bg-muted/50 rounded-lg'>
              <div className='flex items-center gap-2'>
                <IconShield className='h-4 w-4 text-muted-foreground' />
                <span className='text-sm font-medium'>
                  {user.role === 'admin' && t('systemAdmin')}
                  {user.role === 'user' && t('standardUser')}
                  {user.role === 'api' && t('apiUser')}
                  {!user.role && t('standardUser')}
                </span>
              </div>
              <Badge
                variant={
                  user.role === 'admin'
                    ? 'destructive'
                    : user.role === 'api'
                      ? 'outline'
                      : 'default'
                }
              >
                {user.role?.toUpperCase() || 'USER'}
              </Badge>
            </div>
            {user.role === 'admin' && (
              <p className='text-xs text-muted-foreground'>{t('adminDescription')}</p>
            )}
          </div>
        </div>

        {/* Configuraciones futuras */}
        <div className='space-y-4'>
          <h4 className='text-sm font-medium text-muted-foreground uppercase tracking-wide'>
            {t('settings')}
          </h4>

          <div className='space-y-3'>
            {/* Cambio de contraseña */}
            <div className='flex items-center justify-between p-3 bg-muted/50 rounded-lg border'>
              <div className='flex items-center gap-3'>
                <IconKey className='h-4 w-4 text-muted-foreground' />
                <div>
                  <p className='text-sm font-medium'>{t('changePassword')}</p>
                  <p className='text-xs text-muted-foreground'>{t('changePasswordDesc')}</p>
                </div>
              </div>
              <ChangePasswordModal>
                <Button variant='outline' size='sm'>
                  <IconKey className='h-4 w-4' />
                </Button>
              </ChangePasswordModal>
            </div>

            {/* API Keys (próximamente para usuarios que las necesiten) */}
            {(user.role === 'admin' || user.enableAPIKey) && (
              <div className='flex items-center justify-between p-3 bg-muted/20 rounded-lg border border-dashed'>
                <div className='flex items-center gap-3'>
                  <IconKey className='h-4 w-4 text-muted-foreground' />
                  <div>
                    <p className='text-sm font-medium text-muted-foreground'>
                      {t('apiKeysManagement')}
                    </p>
                    <p className='text-xs text-muted-foreground'>{t('apiKeysDesc')}</p>
                  </div>
                </div>
                <Button variant='ghost' size='sm' disabled>
                  <IconExternalLink className='h-4 w-4' />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Información adicional */}
        <div className='pt-4 border-t border-muted'>
          <p className='text-xs text-muted-foreground'>{t('contactAdmin')}</p>
        </div>
      </CardContent>
    </Card>
  )
}
