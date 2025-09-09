'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getProjectResources } from '@/actions/resources/getProjectResources'
import { useTranslations } from 'next-intl'

interface ResourceOption {
  id: string
  title: string
}

function extractProjectAndResourceIds(pathname: string): {
  projectId?: string
  resourceId?: string
} {
  // Espera rutas del estilo /projects/[projectId]/resource/[resourceId]
  const parts = pathname.split('/').filter(Boolean)
  const idxProjects = parts.indexOf('projects')
  const idxResource = parts.indexOf('resource')
  const projectId = idxProjects >= 0 && parts[idxProjects + 1] ? parts[idxProjects + 1] : undefined
  const resourceId = idxResource >= 0 && parts[idxResource + 1] ? parts[idxResource + 1] : undefined
  return { projectId, resourceId }
}

export function ResourceNavigator() {
  const t = useTranslations('documents')
  const pathname = usePathname()
  const router = useRouter()

  const { projectId, resourceId } = useMemo(
    () => extractProjectAndResourceIds(pathname),
    [pathname],
  )

  const [options, setOptions] = useState<ResourceOption[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const loadResources = useCallback(async () => {
    if (!projectId) return
    setIsLoading(true)
    const result = await getProjectResources(projectId)
    if (result.success && result.resources) {
      setOptions(
        result.resources.map((r) => ({
          id: r.id,
          title: r.title || r.id,
        })),
      )
    } else {
      setOptions([])
    }
    setIsLoading(false)
  }, [projectId])

  useEffect(() => {
    loadResources()
  }, [loadResources])

  const currentIndex = useMemo(
    () => options.findIndex((o) => o.id === resourceId),
    [options, resourceId],
  )
  const hasPrev = currentIndex > 0
  const hasNext = currentIndex >= 0 && currentIndex < options.length - 1

  const goTo = useCallback(
    (id: string) => {
      if (!projectId || !id) return
      router.push(`/projects/${projectId}/resource/${id}`)
    },
    [projectId, router],
  )

  const goPrev = useCallback(() => {
    if (hasPrev) {
      goTo(options[currentIndex - 1].id)
    }
  }, [currentIndex, goTo, hasPrev, options])

  const goNext = useCallback(() => {
    if (hasNext) {
      goTo(options[currentIndex + 1].id)
    }
  }, [currentIndex, goTo, hasNext, options])

  // Si no estamos en una ruta de resource, no mostrar nada
  if (!projectId) return null

  return (
    <div className='flex items-center gap-2'>
      <Button
        size='icon'
        variant='outline'
        disabled={!hasPrev || isLoading}
        onClick={goPrev}
        aria-label={t('previous')}
      >
        <IconChevronLeft className='h-4 w-4' />
      </Button>
      <Select
        value={resourceId || undefined}
        onValueChange={(value) => goTo(value)}
        disabled={isLoading || options.length === 0}
      >
        <SelectTrigger className='w-[260px]'>
          <SelectValue
            placeholder={
              isLoading ? t('loading') : t('selectResource', { default: 'Select a resource' })
            }
          />
        </SelectTrigger>
        <SelectContent className='max-h-80 overflow-y-auto'>
          {options.map((opt) => (
            <SelectItem key={opt.id} value={opt.id}>
              {opt.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        size='icon'
        variant='outline'
        disabled={!hasNext || isLoading}
        onClick={goNext}
        aria-label={t('next')}
      >
        <IconChevronRight className='h-4 w-4' />
      </Button>
    </div>
  )
}
