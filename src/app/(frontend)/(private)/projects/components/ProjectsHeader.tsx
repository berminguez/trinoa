'use client'
import { CreateProjectModal } from './CreateProjectModal'
import type { User } from '@/payload-types'
import { useTranslations } from 'next-intl'

interface ProjectsHeaderProps {
  user: User
}

export function ProjectsHeader({ user: _user }: ProjectsHeaderProps) {
  const tNav = useTranslations('navigation')
  const t = useTranslations('projects.header')
  return (
    <div className='flex items-center justify-between'>
      <div className='space-y-1'>
        <h1 className='text-3xl font-bold tracking-tight'>{tNav('projects')}</h1>
        <p className='text-muted-foreground'>{t('subtitle')}</p>
      </div>

      <CreateProjectModal />
    </div>
  )
}
