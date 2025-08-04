'use client'
import { CreateProjectModal } from './CreateProjectModal'
import type { User } from '@/payload-types'

interface ProjectsHeaderProps {
  user: User
}

export function ProjectsHeader({ user }: ProjectsHeaderProps) {
  return (
    <div className='flex items-center justify-between'>
      <div className='space-y-1'>
        <h1 className='text-3xl font-bold tracking-tight'>Projects</h1>
        <p className='text-muted-foreground'>
          Gestiona tus proyectos de video y recursos multimedia
        </p>
      </div>

      <CreateProjectModal />
    </div>
  )
}
