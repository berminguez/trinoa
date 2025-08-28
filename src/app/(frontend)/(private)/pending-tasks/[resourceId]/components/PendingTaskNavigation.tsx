'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  IconChevronLeft,
  IconChevronRight,
  IconClipboardList,
  IconArrowLeft,
  IconFolder,
  IconUser,
} from '@tabler/icons-react'
import Link from 'next/link'
import { AdminBreadcrumb } from '@/components/admin-breadcrumb'
import { ConfidenceBadge } from '@/components/ConfidenceBadge'
import type { Resource, Project, User } from '@/payload-types'

interface PendingTaskNavigationProps {
  resource: Resource
  project: Project
  navigation: {
    prevId: string | null
    nextId: string | null
    currentIndex: number
    total: number
  }
}

/**
 * Navegación superior para vista de tarea pendiente
 *
 * Incluye breadcrumbs, información del recurso y navegación anterior/siguiente
 */
export function PendingTaskNavigation({
  resource,
  project,
  navigation,
}: PendingTaskNavigationProps) {
  const createdBy = project.createdBy as User
  const clientName = createdBy?.name || createdBy?.email || 'Cliente desconocido'
  const clientId = typeof project.createdBy === 'object' ? project.createdBy.id : project.createdBy

  return (
    <div className='border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60'>
      <div className='p-4 space-y-4'>
        {/* Breadcrumbs */}
        <AdminBreadcrumb
          customSegments={[
            { label: 'Dashboard', href: '/dashboard', icon: 'home' },
            { label: 'Tareas Pendientes', href: '/pending-tasks', icon: 'clipboard-list' },
            { label: resource.title, icon: 'file', isActive: true },
          ]}
        />

        {/* Información del recurso y navegación */}
        <div className='flex items-center justify-between gap-4'>
          {/* Info del recurso */}
          <div className='flex-1 min-w-0'>
            <div className='flex items-center gap-3 mb-2'>
              <h1 className='text-lg font-semibold truncate'>{resource.title}</h1>
              <div className='flex items-center gap-2'>
                <Badge variant={resource.status === 'completed' ? 'default' : 'destructive'}>
                  {resource.status}
                </Badge>
                <ConfidenceBadge confidence={resource.confidence} />
              </div>
            </div>

            <div className='flex items-center gap-4 text-sm text-muted-foreground'>
              <div className='flex items-center gap-1'>
                <IconFolder className='h-3 w-3' />
                <span>{project.title}</span>
              </div>
              <div className='flex items-center gap-1'>
                <IconUser className='h-3 w-3' />
                <span>{clientName}</span>
              </div>
              <span>
                Tarea {navigation.currentIndex + 1} de {navigation.total}
              </span>
            </div>
          </div>

          {/* Navegación */}
          <div className='flex items-center gap-2'>
            <Button variant='outline' size='sm' asChild>
              <Link href='/pending-tasks'>
                <IconArrowLeft className='h-4 w-4 mr-2' />
                Ver todas
              </Link>
            </Button>

            <div className='flex items-center border rounded-lg'>
              <Button
                variant='ghost'
                size='sm'
                disabled={!navigation.prevId}
                asChild={!!navigation.prevId}
                className='border-0 rounded-r-none'
              >
                {navigation.prevId ? (
                  <Link href={`/pending-tasks/${navigation.prevId}`}>
                    <IconChevronLeft className='h-4 w-4' />
                    Anterior
                  </Link>
                ) : (
                  <>
                    <IconChevronLeft className='h-4 w-4' />
                    Anterior
                  </>
                )}
              </Button>

              <div className='px-3 py-1.5 text-sm border-x bg-muted/50'>
                {navigation.currentIndex + 1} / {navigation.total}
              </div>

              <Button
                variant='ghost'
                size='sm'
                disabled={!navigation.nextId}
                asChild={!!navigation.nextId}
                className='border-0 rounded-l-none'
              >
                {navigation.nextId ? (
                  <Link href={`/pending-tasks/${navigation.nextId}`}>
                    Siguiente
                    <IconChevronRight className='h-4 w-4' />
                  </Link>
                ) : (
                  <>
                    Siguiente
                    <IconChevronRight className='h-4 w-4' />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Enlaces de contexto */}
        <div className='flex items-center gap-2 text-xs'>
          <Button variant='ghost' size='sm' asChild className='h-6 px-2 text-xs'>
            <Link href={`/clients/${clientId}`}>Ver cliente</Link>
          </Button>
          <span className='text-muted-foreground'>•</span>
          <Button variant='ghost' size='sm' asChild className='h-6 px-2 text-xs'>
            <Link href={`/clients/${clientId}/projects/${project.id}`}>Ver proyecto</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
