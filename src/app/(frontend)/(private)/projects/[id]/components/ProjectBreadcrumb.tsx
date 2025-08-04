import Link from 'next/link'
import { IconChevronRight } from '@tabler/icons-react'
import type { Project } from '@/payload-types'

interface ProjectBreadcrumbProps {
  project: Project
}

export function ProjectBreadcrumb({ project }: ProjectBreadcrumbProps) {
  return (
    <nav className='flex items-center space-x-2 text-sm text-muted-foreground'>
      <Link href='/admin' className='hover:text-foreground transition-colors'>
        Admin
      </Link>
      <IconChevronRight className='h-4 w-4' />
      <Link href='/projects' className='hover:text-foreground transition-colors'>
        Projects
      </Link>
      <IconChevronRight className='h-4 w-4' />
      <span className='text-foreground font-medium'>{project.title}</span>
    </nav>
  )
}
