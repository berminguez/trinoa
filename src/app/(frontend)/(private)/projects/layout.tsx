import { ReactNode } from 'react'

interface ProjectsLayoutProps {
  children: ReactNode
}

export default function ProjectsLayout({ children }: ProjectsLayoutProps) {
  return (
    <div className='flex-1 flex flex-col'>
      {/* Contenido principal */}
      <div className='flex-1'>{children}</div>
    </div>
  )
}
