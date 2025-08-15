'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  IconHome,
  IconChartBar,
  IconMessage,
  IconLogin,
  IconRobot,
  IconSettings,
  IconFolder,
} from '@tabler/icons-react'

import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb'

// Mapeo de rutas a información user-friendly
const routeMap: Record<string, { label: string; icon: React.ComponentType<any> }> = {
  '/': { label: 'Inicio', icon: IconHome },
  '/dashboard': { label: 'Dashboard', icon: IconHome },
  '/playground': { label: 'Playground', icon: IconRobot },
  '/login': { label: 'Iniciar Sesión', icon: IconLogin },
  '/admin': { label: 'Admin', icon: IconSettings },
  '/projects': { label: 'Projects', icon: IconFolder },
}

export function DynamicBreadcrumb() {
  const pathname = usePathname()

  // Dividir la ruta en segmentos
  const pathSegments = pathname.split('/').filter(Boolean)

  // Determinar si estamos en una ruta privada (que usa el layout privado)
  const isPrivateRoute =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/playground') ||
    pathname.startsWith('/admin')

  // Crear los breadcrumbs
  const breadcrumbs: Array<{ path: string; label: string; icon: React.ComponentType<any> }> = []

  // Para rutas públicas o login, incluir "Inicio"
  if (!isPrivateRoute && pathname !== '/') {
    breadcrumbs.push({ path: '/', label: 'Inicio', icon: IconHome })
  }

  // Agregar segmentos de la ruta actual
  let currentPath = ''
  pathSegments.forEach((segment, index) => {
    currentPath += `/${segment}`
    const routeInfo = routeMap[currentPath]

    if (routeInfo) {
      // Para rutas privadas, solo agregar la ruta actual (no incluir "Inicio")
      if (!isPrivateRoute || currentPath !== '/') {
        breadcrumbs.push({
          path: currentPath,
          label: routeInfo.label,
          icon: routeInfo.icon,
        })
      }
    } else {
      // Manejar rutas especiales de proyectos dinámicas
      if (currentPath.startsWith('/projects/') && pathSegments.length === 3 && index === 2) {
        // Es una ruta de proyecto específico: /projects/[id]
        breadcrumbs.push({
          path: currentPath,
          label: 'Project Detail', // Por ahora genérico, se puede mejorar con el nombre real
          icon: IconFolder,
        })
      } else if (
        // Deshabilitar enlace "Resource" en rutas de recurso
        currentPath.match(/^\/projects\/[\w-]+\/resource$/)
      ) {
        breadcrumbs.push({ path: currentPath, label: 'Resource', icon: IconFolder })
      } else {
        // Para rutas no mapeadas, usar el segment con formato capitalizado
        breadcrumbs.push({
          path: currentPath,
          label: segment.charAt(0).toUpperCase() + segment.slice(1).replace('-', ' '),
          icon: IconHome, // Icono por defecto
        })
      }
    }
  })

  // Si no hay breadcrumbs o estamos en la home, solo mostrar "Inicio"
  if (breadcrumbs.length === 0 || pathname === '/') {
    const HomeIcon = IconHome
    return (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage className='flex items-center gap-2'>
              <HomeIcon className='h-4 w-4' />
              Inicio
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    )
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {breadcrumbs.map((breadcrumb, index) => {
          const Icon = breadcrumb.icon
          const isLast = index === breadcrumbs.length - 1

          return (
            <div key={breadcrumb.path} className='flex items-center'>
              <BreadcrumbItem>
                {isLast || breadcrumb.label === 'Resource' ? (
                  <BreadcrumbPage className='flex items-center gap-2'>
                    <Icon className='h-4 w-4' />
                    {breadcrumb.label}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={breadcrumb.path} className='flex items-center gap-2'>
                      <Icon className='h-4 w-4' />
                      {breadcrumb.label}
                    </Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLast && <BreadcrumbSeparator />}
            </div>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
