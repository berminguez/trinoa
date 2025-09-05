'use client'

import {
  IconChartBar,
  IconFolder,
  IconHelp,
  IconSearch,
  IconSettings,
  IconHome,
  IconUserCog,
  IconDatabase,
  IconReport,
  IconFileWord,
  IconCamera,
  IconFileAi,
  IconFileDescription,
  IconUser,
} from '@tabler/icons-react'
import * as React from 'react'
import { useTranslations } from 'next-intl'
// import { useEffect, useState } from 'react'

import { Logo } from '@/components/logo'
import { LanguageSelector } from '@/components/language-selector'
// import { NavDocuments } from '@/components/nav-documents'
import { NavMain } from '@/components/nav-main'
// import { NavSecondary } from '@/components/nav-secondary'
import { NavUser } from '@/components/nav-user'
import { useUserRole } from '@/hooks/useUserRole'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import Link from 'next/link'

// Navigation items will be created dynamically using translations

const data = {
  user: {
    name: 'shadcn',
    email: 'm@example.com',
    avatar: '/avatars/shadcn.jpg',
  },
  navClouds: [
    {
      title: 'Capture',
      icon: IconCamera,
      isActive: true,
      url: '#',
      items: [
        {
          title: 'Active Proposals',
          url: '#',
        },
        {
          title: 'Archived',
          url: '#',
        },
      ],
    },
    {
      title: 'Proposal',
      icon: IconFileDescription,
      url: '#',
      items: [
        {
          title: 'Active Proposals',
          url: '#',
        },
        {
          title: 'Archived',
          url: '#',
        },
      ],
    },
    {
      title: 'Prompts',
      icon: IconFileAi,
      url: '#',
      items: [
        {
          title: 'Active Proposals',
          url: '#',
        },
        {
          title: 'Archived',
          url: '#',
        },
      ],
    },
  ],
  navSecondary: [
    {
      title: 'Settings',
      url: '#',
      icon: IconSettings,
    },
    {
      title: 'Get Help',
      url: '#',
      icon: IconHelp,
    },
    {
      title: 'Search',
      url: '#',
      icon: IconSearch,
    },
  ],
  documents: [
    {
      name: 'Data Library',
      url: '#',
      icon: IconDatabase,
    },
    {
      name: 'Reports',
      url: '#',
      icon: IconReport,
    },
    {
      name: 'Word Assistant',
      url: '#',
      icon: IconFileWord,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { isAdmin, isLoading } = useUserRole()
  const t = useTranslations('navigation')

  // Construir navegación dinámicamente basado en el rol del usuario
  const navigationItems = React.useMemo(() => {
    const baseNavigation = [
      {
        title: t('dashboard'),
        url: '/dashboard',
        icon: IconHome,
      },
      {
        title: t('projects'),
        url: '/projects',
        icon: IconFolder,
      },
      {
        title: t('analytics'),
        url: '/analytics',
        icon: IconChartBar,
      },
      {
        title: t('account'),
        url: '/account',
        icon: IconUser,
      },
    ]

    const items = [...baseNavigation]

    // Añadir navegación de admin si el usuario es administrador
    if (isAdmin) {
      const adminNavigation = [
        {
          title: t('clients'),
          url: '/clients',
          icon: IconUserCog,
        },
      ]
      // Insertar "Clients" después de "Projects" (posición 2)
      items.splice(2, 0, ...adminNavigation)
    }

    return items
  }, [isAdmin, t])

  return (
    <Sidebar collapsible='offcanvas' {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className='flex items-top justify-between w-full'>
              <Link href='/dashboard'>
                <div className='ml-2 w-[120px] h-[36px]'>
                  <Logo />
                </div>
              </Link>
              <div className='mr-2'>
                <LanguageSelector />
              </div>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {/* Solo renderizar navegación cuando no esté cargando */}
        {!isLoading && <NavMain items={navigationItems} />}
        {/*   <NavDocuments items={data.documents} /> */}
        {/*   <NavSecondary items={data.navSecondary} className='mt-auto' /> */}
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}
