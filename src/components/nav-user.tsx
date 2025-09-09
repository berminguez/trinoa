'use client'

import { useState, useEffect } from 'react'
import {
  IconCreditCard,
  IconDotsVertical,
  IconLogout,
  IconNotification,
  IconUserCircle,
  IconLoader,
  IconAlertCircle,
  IconShield,
  IconCrown,
} from '@tabler/icons-react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { getUserDisplayData } from '@/actions/auth/getUser'
import { logoutWithRedirect } from '@/actions/auth/logout'
import { useUserRole } from '@/hooks/useUserRole'

interface UserData {
  id: string
  name: string
  email: string
}

export function NavUser() {
  const [user, setUser] = useState<UserData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [error, setError] = useState<string>('')

  const { isMobile } = useSidebar()
  const { isAdmin } = useUserRole() // Hook para verificar si es admin
  const t = useTranslations('user')

  // Obtener datos del usuario al cargar el componente
  useEffect(() => {
    async function fetchUser() {
      try {
        setIsLoading(true)
        setError('')

        const userData = await getUserDisplayData()

        if (userData) {
          setUser(userData)
        } else {
          setError(t('userDataError'))
        }
      } catch (err) {
        console.error('Error loading user data:', err)
        setError(t('loadingError'))
      } finally {
        setIsLoading(false)
      }
    }

    fetchUser()
  }, [])

  // Manejar logout
  async function handleLogout() {
    try {
      setIsLoggingOut(true)

      toast.info(t('loggingOut'))

      // Usar logoutWithRedirect que maneja la redirección automáticamente
      await logoutWithRedirect()

      // Si llegamos aquí, mostrar mensaje de éxito (aunque normalmente se redirige)
      toast.success(t('sessionClosed'))
    } catch (error) {
      console.error('Error durante logout:', error)
      toast.error(t('logoutError'))
    } finally {
      setIsLoggingOut(false)
    }
  }

  // Generar iniciales para el avatar fallback
  function getInitials(name: string, email: string): string {
    if (name && name.trim()) {
      return name
        .split(' ')
        .map((word) => word.charAt(0))
        .join('')
        .toUpperCase()
        .slice(0, 2)
    }

    // Fallback al email si no hay nombre
    return email.charAt(0).toUpperCase()
  }

  // Componente de skeleton loader
  function UserSkeleton() {
    return (
      <SidebarMenuButton
        size='lg'
        className='data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground'
        disabled
      >
        <Skeleton className='h-8 w-8 rounded-lg' />
        <div className='grid flex-1 text-left text-sm leading-tight'>
          <Skeleton className='h-4 w-24' />
          <Skeleton className='h-3 w-32 mt-1' />
        </div>
        <IconLoader className='ml-auto size-4 animate-spin' />
      </SidebarMenuButton>
    )
  }

  // Componente de error
  function UserError() {
    return (
      <SidebarMenuButton
        size='lg'
        className='data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground opacity-60'
        disabled
      >
        <Avatar className='h-8 w-8 rounded-lg'>
          <AvatarFallback className='rounded-lg bg-red-100'>
            <IconAlertCircle className='h-4 w-4 text-red-600' />
          </AvatarFallback>
        </Avatar>
        <div className='grid flex-1 text-left text-sm leading-tight'>
          <span className='truncate font-medium text-red-600'>Error</span>
          <span className='text-red-500 truncate text-xs'>{error}</span>
        </div>
      </SidebarMenuButton>
    )
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        {/* Estado de carga */}
        {isLoading && <UserSkeleton />}

        {/* Estado de error */}
        {!isLoading && error && <UserError />}

        {/* Estado normal con datos del usuario */}
        {!isLoading && !error && user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size='lg'
                className='data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground'
                disabled={isLoggingOut}
              >
                <Avatar className='h-8 w-8 rounded-lg grayscale'>
                  <AvatarFallback className='rounded-lg'>
                    {getInitials(user.name, user.email)}
                  </AvatarFallback>
                </Avatar>
                <div className='grid flex-1 text-left text-sm leading-tight'>
                  <div className='flex items-center gap-2'>
                    <span className='truncate font-medium'>{user.name}</span>
                    {isAdmin && (
                      <IconShield
                        className='h-3 w-3 text-orange-600 flex-shrink-0'
                        title={t('administrator')}
                      />
                    )}
                  </div>
                  <span className='text-muted-foreground truncate text-xs'>{user.email}</span>
                </div>
                {isLoggingOut ? (
                  <IconLoader className='ml-auto size-4 animate-spin' />
                ) : (
                  <IconDotsVertical className='ml-auto size-4' />
                )}
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className='w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg'
              side={isMobile ? 'bottom' : 'right'}
              align='end'
              sideOffset={4}
            >
              <DropdownMenuLabel className='p-0 font-normal'>
                <div className='flex items-center gap-2 px-1 py-1.5 text-left text-sm'>
                  <Avatar className='h-8 w-8 rounded-lg'>
                    <AvatarFallback className='rounded-lg'>
                      {getInitials(user.name, user.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div className='grid flex-1 text-left text-sm leading-tight'>
                    <div className='flex items-center gap-2'>
                      <span className='truncate font-medium'>{user.name}</span>
                      {isAdmin && (
                        <Badge
                          variant='outline'
                          className='h-5 px-1.5 text-xs border-orange-200 text-orange-700 bg-orange-50'
                        >
                          <IconCrown className='h-3 w-3 mr-1' />
                          {t('admin')}
                        </Badge>
                      )}
                    </div>
                    <span className='text-muted-foreground truncate text-xs'>{user.email}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem disabled>
                  <IconUserCircle />
                  {t('account')}
                </DropdownMenuItem>
                <DropdownMenuItem disabled>
                  <IconCreditCard />
                  {t('billing')}
                </DropdownMenuItem>
                <DropdownMenuItem disabled>
                  <IconNotification />
                  {t('notifications')}
                </DropdownMenuItem>
              </DropdownMenuGroup>

              {/* Sección especial para administradores */}
              {isAdmin && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem className='text-orange-700 focus:text-orange-700 focus:bg-orange-50'>
                      <IconShield />
                      {t('adminPanel')}
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                disabled={isLoggingOut}
                className='text-red-600 focus:text-red-600'
              >
                {isLoggingOut ? <IconLoader className='animate-spin' /> : <IconLogout />}
                {t('logout')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
