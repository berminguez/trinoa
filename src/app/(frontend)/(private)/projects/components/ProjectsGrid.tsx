'use client'
import { IconPlus, IconFolder, IconSearch } from '@tabler/icons-react'
import { Card, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useEffect } from 'react'
import { useProjectsStore } from '@/stores/projects-store'
import { CreateProjectModal } from './CreateProjectModal'
import { ProjectGridItem } from './ProjectGridItem'
import type { Project } from '@/payload-types'

interface ProjectsGridProps {
  projects: Project[]
}

export function ProjectsGrid({ projects }: ProjectsGridProps) {
  // Store state y actions
  const { filters, setProjects, setSearchTerm, setSortBy, getFilteredProjects } = useProjectsStore()

  const { searchTerm, sortBy } = filters

  // Sincronizar proyectos con el store cuando cambie la prop
  useEffect(() => {
    setProjects(projects)
  }, [projects, setProjects])

  // Obtener proyectos filtrados desde el store
  const sortedProjects = getFilteredProjects()

  return (
    <div className='space-y-4'>
      {/* Search and Sort controls */}
      <div className='flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between'>
        {/* Search field */}
        <div className='relative flex-1 max-w-sm'>
          <IconSearch className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground' />
          <Input
            placeholder='Search projects...'
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className='pl-10'
          />
        </div>

        {/* Sort dropdown */}
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className='w-48'>
            <SelectValue placeholder='Sort by' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='recent'>Recent upload</SelectItem>
            <SelectItem value='name'>Name</SelectItem>
            <SelectItem value='creation'>Creation date</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Grid de proyectos */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
        {/* Tarjeta "Create Project" */}
        <CreateProjectModal
          trigger={
            <Card className='border-dashed border-2 border-muted-foreground/25 hover:border-muted-foreground/50 transition-colors cursor-pointer'>
              <CardHeader className='flex items-center justify-center py-8'>
                <div className='h-auto flex-col gap-2 text-muted-foreground flex items-center'>
                  <IconPlus className='h-8 w-8' />
                  <span className='text-sm font-medium'>Create Project</span>
                </div>
              </CardHeader>
            </Card>
          }
        />

        {/* Tarjetas de proyectos */}
        {sortedProjects.map((project) => (
          <ProjectGridItem key={project.id} project={project} />
        ))}
      </div>

      {/* Estado vacío */}
      {sortedProjects.length === 0 && projects.length === 0 && (
        <div className='text-center py-12'>
          <IconFolder className='h-12 w-12 text-muted-foreground mx-auto mb-4' />
          <h3 className='text-lg font-semibold mb-2'>No projects yet</h3>
          <p className='text-muted-foreground mb-4'>
            Create your first project to start organizing your videos
          </p>
          <CreateProjectModal />
        </div>
      )}

      {/* Estado de búsqueda sin resultados */}
      {sortedProjects.length === 0 && projects.length > 0 && (
        <div className='text-center py-12'>
          <IconSearch className='h-12 w-12 text-muted-foreground mx-auto mb-4' />
          <h3 className='text-lg font-semibold mb-2'>No projects found</h3>
          <p className='text-muted-foreground mb-4'>
            No projects match your search for &quot;{searchTerm}&quot;. Try a different search term.
          </p>
          <Button variant='outline' onClick={() => setSearchTerm('')} className='gap-2'>
            Clear search
          </Button>
        </div>
      )}
    </div>
  )
}
