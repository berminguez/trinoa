'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  IconChevronRight,
  IconUsers,
  IconFolder,
  IconFile,
  IconHome,
  IconClipboardList,
} from '@tabler/icons-react'
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

// Mapeo de strings a iconos para permitir serialización entre Server/Client Components
const iconMap = {
  home: IconHome,
  users: IconUsers,
  folder: IconFolder,
  file: IconFile,
  'clipboard-list': IconClipboardList,
} as const

type IconName = keyof typeof iconMap

// Helper para resolver iconos desde strings o componentes
function resolveIcon(icon: React.ComponentType<any> | IconName): React.ComponentType<any> {
  if (typeof icon === 'string') {
    return iconMap[icon] || IconHome
  }
  return icon
}

interface BreadcrumbSegment {
  label: string
  href?: string
  icon?: React.ComponentType<any> | IconName
  isActive?: boolean
}

interface AdminBreadcrumbProps {
  /**
   * Datos adicionales para personalizar los breadcrumbs
   * Útil cuando se tiene información específica del cliente/proyecto
   */
  clientName?: string
  projectName?: string
  resourceName?: string
  customSegments?: BreadcrumbSegment[]
}

/**
 * Componente de breadcrumb especializado para rutas administrativas
 *
 * Genera automáticamente breadcrumbs basado en la URL actual y permite
 * personalización con nombres específicos de cliente/proyecto/recurso
 */
export function AdminBreadcrumb({
  clientName,
  projectName,
  resourceName,
  customSegments,
}: AdminBreadcrumbProps) {
  const pathname = usePathname()

  // Si se proporcionan segmentos personalizados, usarlos directamente
  if (customSegments) {
    return <CustomBreadcrumb segments={customSegments} />
  }

  // Generar breadcrumbs automáticamente basado en la ruta
  const segments = generateSegmentsFromPath(pathname, {
    clientName,
    projectName,
    resourceName,
  })

  return <CustomBreadcrumb segments={segments} />
}

/**
 * Genera segmentos de breadcrumb basado en la ruta actual
 */
function generateSegmentsFromPath(
  pathname: string,
  data: { clientName?: string; projectName?: string; resourceName?: string },
): BreadcrumbSegment[] {
  const pathParts = pathname.split('/').filter(Boolean)
  const segments: BreadcrumbSegment[] = []

  // Siempre empezar con Dashboard
  segments.push({
    label: 'Dashboard',
    href: '/dashboard',
    icon: IconHome,
  })

  // Procesar partes de la ruta
  for (let i = 0; i < pathParts.length; i++) {
    const part = pathParts[i]
    const isLast = i === pathParts.length - 1

    switch (part) {
      case 'clients':
        segments.push({
          label: 'Clientes',
          href: isLast ? undefined : '/clients',
          icon: IconUsers,
          isActive: isLast,
        })
        break

      case 'projects':
        // Si estamos en /clients/{id}/projects
        if (pathParts[i - 2] === 'clients' && pathParts[i - 1]) {
          segments.push({
            label: 'Proyectos',
            href: isLast ? undefined : `/${pathParts.slice(0, i + 1).join('/')}`,
            icon: IconFolder,
            isActive: isLast,
          })
        }
        break

      case 'resource':
        // Si estamos en una ruta de recurso
        segments.push({
          label: data.resourceName || 'Recurso',
          href: isLast ? undefined : `/${pathParts.slice(0, i + 2).join('/')}`, // Incluir el ID del recurso
          icon: IconFile,
          isActive: i >= pathParts.length - 2, // Activo si es resource o el ID del recurso
        })
        break

      default:
        // Manejar IDs y otros segmentos
        if (pathParts[i - 1] === 'clients' && data.clientName) {
          // ID de cliente
          segments.push({
            label: data.clientName,
            href: isLast ? undefined : `/${pathParts.slice(0, i + 1).join('/')}`,
            isActive: isLast,
          })
        } else if (pathParts[i - 1] === 'projects' && data.projectName) {
          // ID de proyecto
          segments.push({
            label: data.projectName,
            href: isLast ? undefined : `/${pathParts.slice(0, i + 1).join('/')}`,
            isActive: isLast,
          })
        } else if (pathParts[i - 1] === 'resource' && data.resourceName) {
          // ID de recurso - ya manejado en el case 'resource'
          break
        } else if (!isNaN(Number(part))) {
          // ID genérico
          segments.push({
            label: `ID: ${part.slice(0, 8)}...`,
            href: isLast ? undefined : `/${pathParts.slice(0, i + 1).join('/')}`,
            isActive: isLast,
          })
        }
        break
    }
  }

  return segments
}

/**
 * Renderiza los breadcrumbs con soporte para colapso cuando hay muchos elementos
 */
function CustomBreadcrumb({ segments }: { segments: BreadcrumbSegment[] }) {
  // Si hay muchos segmentos, colapsar los del medio
  const shouldCollapse = segments.length > 4
  const visibleSegments = shouldCollapse ? [segments[0], ...segments.slice(-2)] : segments
  const collapsedSegments = shouldCollapse ? segments.slice(1, -2) : []

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {/* Primer segmento (siempre visible) */}
        <BreadcrumbItem>
          {segments[0]?.href ? (
            <BreadcrumbLink asChild>
              <Link href={segments[0].href} className='flex items-center gap-2'>
                {segments[0].icon &&
                  (() => {
                    const IconComponent = segments[0].icon
                    return <IconComponent className='h-4 w-4' />
                  })()}
                {segments[0].label}
              </Link>
            </BreadcrumbLink>
          ) : (
            <BreadcrumbPage className='flex items-center gap-2'>
              {segments[0]?.icon &&
                (() => {
                  const IconComponent = segments[0].icon
                  return <IconComponent className='h-4 w-4' />
                })()}
              {segments[0]?.label}
            </BreadcrumbPage>
          )}
        </BreadcrumbItem>

        {/* Segmentos colapsados */}
        {shouldCollapse && collapsedSegments.length > 0 && (
          <>
            <BreadcrumbSeparator>
              <IconChevronRight className='h-4 w-4' />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <DropdownMenu>
                <DropdownMenuTrigger className='flex h-9 w-9 items-center justify-center'>
                  <BreadcrumbEllipsis className='h-4 w-4' />
                  <span className='sr-only'>Mostrar más</span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align='start'>
                  {collapsedSegments.map((segment, index) => (
                    <DropdownMenuItem key={index} asChild>
                      {segment.href ? (
                        <Link href={segment.href} className='flex items-center gap-2'>
                          {segment.icon &&
                            (() => {
                              const IconComponent = segment.icon
                              return <IconComponent className='h-4 w-4' />
                            })()}
                          {segment.label}
                        </Link>
                      ) : (
                        <span className='flex items-center gap-2'>
                          {segment.icon &&
                            (() => {
                              const IconComponent = segment.icon
                              return <IconComponent className='h-4 w-4' />
                            })()}
                          {segment.label}
                        </span>
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </BreadcrumbItem>
          </>
        )}

        {/* Segmentos visibles */}
        {visibleSegments.slice(shouldCollapse ? 1 : 1).map((segment, index) => (
          <div key={index} className='flex items-center'>
            <BreadcrumbSeparator>
              <IconChevronRight className='h-4 w-4' />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              {segment.href && !segment.isActive ? (
                <BreadcrumbLink asChild>
                  <Link href={segment.href} className='flex items-center gap-2'>
                    {segment.icon &&
                      (() => {
                        const IconComponent = resolveIcon(segment.icon)
                        return <IconComponent className='h-4 w-4' />
                      })()}
                    {segment.label}
                  </Link>
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage className='flex items-center gap-2'>
                  {segment.icon &&
                    (() => {
                      const IconComponent = resolveIcon(segment.icon)
                      return <IconComponent className='h-4 w-4' />
                    })()}
                  {segment.label}
                </BreadcrumbPage>
              )}
            </BreadcrumbItem>
          </div>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}

/**
 * Breadcrumbs predefinidos para rutas comunes
 */
export const AdminBreadcrumbs = {
  clients: () => (
    <AdminBreadcrumb
      customSegments={[
        { label: 'Dashboard', href: '/dashboard', icon: IconHome },
        { label: 'Clientes', icon: IconUsers, isActive: true },
      ]}
    />
  ),

  pendingTasks: () => (
    <AdminBreadcrumb
      customSegments={[
        { label: 'Dashboard', href: '/dashboard', icon: IconHome },
        { label: 'Tareas Pendientes', icon: IconClipboardList, isActive: true },
      ]}
    />
  ),

  clientProjects: (clientName: string, clientId: string) => (
    <AdminBreadcrumb
      customSegments={[
        { label: 'Dashboard', href: '/dashboard', icon: IconHome },
        { label: 'Clientes', href: '/clients', icon: IconUsers },
        { label: clientName, href: `/clients/${clientId}` },
        { label: 'Proyectos', icon: IconFolder, isActive: true },
      ]}
    />
  ),

  projectDetail: (clientName: string, clientId: string, projectName: string, projectId: string) => (
    <AdminBreadcrumb
      customSegments={[
        { label: 'Dashboard', href: '/dashboard', icon: IconHome },
        { label: 'Clientes', href: '/clients', icon: IconUsers },
        { label: clientName, href: `/clients/${clientId}` },
        { label: 'Proyectos', href: `/clients/${clientId}/projects`, icon: IconFolder },
        { label: projectName, icon: IconFolder, isActive: true },
      ]}
    />
  ),

  resourceDetail: (
    clientName: string,
    clientId: string,
    projectName: string,
    projectId: string,
    resourceName: string,
    resourceId: string,
  ) => (
    <AdminBreadcrumb
      customSegments={[
        { label: 'Dashboard', href: '/dashboard', icon: IconHome },
        { label: 'Clientes', href: '/clients', icon: IconUsers },
        { label: clientName, href: `/clients/${clientId}` },
        { label: 'Proyectos', href: `/clients/${clientId}/projects`, icon: IconFolder },
        {
          label: projectName,
          href: `/clients/${clientId}/projects/${projectId}`,
          icon: IconFolder,
        },
        { label: resourceName, icon: IconFile, isActive: true },
      ]}
    />
  ),
}
