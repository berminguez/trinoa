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
  IconClipboardList,
} from '@tabler/icons-react'
import * as React from 'react'
// import { useEffect, useState } from 'react'

import { Logo } from '@/components/logo'
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

// Navegación base disponible para todos los usuarios
const baseNavigation = [
  {
    title: 'Dashboard',
    url: '/dashboard',
    icon: IconHome,
  },
  {
    title: 'Projectos',
    url: '/projects',
    icon: IconFolder,
  },
  {
    title: 'Analítica',
    url: '/analytics',
    icon: IconChartBar,
  },
  {
    title: 'Mi Cuenta',
    url: '/account',
    icon: IconUser,
  },
]

// Navegación exclusiva para administradores
const adminNavigation = [
  {
    title: 'Clientes',
    url: '/clients',
    icon: IconUserCog,
  },
  /*  {
    title: 'Tareas Pendientes',
    url: '/pending-tasks',
    icon: IconClipboardList,
  }, */
]

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

  // Construir navegación dinámicamente basado en el rol del usuario
  const navigationItems = React.useMemo(() => {
    const items = [...baseNavigation]

    // Añadir navegación de admin si el usuario es administrador
    if (isAdmin) {
      // Insertar "Clients" después de "Projects" (posición 2)
      items.splice(2, 0, ...adminNavigation)
    }

    return items
  }, [isAdmin])

  return (
    <Sidebar collapsible='offcanvas' {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <Link href='/dashboard'>
              <div className='ml-2 w-[120px] h-[36px]'>
                <Logo />
              </div>
            </Link>
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
