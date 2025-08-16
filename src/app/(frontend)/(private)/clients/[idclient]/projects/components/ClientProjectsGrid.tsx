'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  IconSearch,
  IconFilter,
  IconRefresh,
  IconChevronLeft,
  IconChevronRight,
  IconFolder,
} from '@tabler/icons-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import type { ClientProjectsFilters } from '@/actions/clients/types'
import type { User, Project } from '@/payload-types'
import { ClientProjectGridItem } from './ClientProjectGridItem'

interface PaginationInfo {
  currentPage: number
  totalPages: number
  totalProjects: number
  projectsPerPage: number
}

interface ClientProjectsGridProps {
  client: User
  projects: Project[]
  pagination?: PaginationInfo
  currentFilters?: ClientProjectsFilters
}

/**
 * Grid de proyectos de cliente con controles administrativos
 *
 * Adaptado de ProjectsGrid para contexto administrativo
 * Incluye navegación a detalles de proyecto en contexto de cliente
 */
export function ClientProjectsGrid({
  client,
  projects,
  pagination,
  currentFilters,
}: ClientProjectsGridProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Estado local para input de búsqueda (debounced)
  const [searchInput, setSearchInput] = useState(currentFilters?.searchTerm || '')

  // Construir URL base para navegación
  const baseUrl = `/clients/${client.id}/projects`

  // Función para navegar con filtros actualizados
  const navigateWithFilters = (newFilters: Partial<ClientProjectsFilters>) => {
    const params = new URLSearchParams()

    const filters = { ...currentFilters, ...newFilters }

    if (filters.searchTerm) params.set('search', filters.searchTerm)
    if (filters.sortBy && filters.sortBy !== 'createdAt') params.set('sortBy', filters.sortBy)
    if (filters.sortOrder && filters.sortOrder !== 'desc')
      params.set('sortOrder', filters.sortOrder)
    if (filters.page && filters.page > 1) params.set('page', filters.page.toString())
    if (filters.dateFrom) params.set('dateFrom', filters.dateFrom)
    if (filters.dateTo) params.set('dateTo', filters.dateTo)

    const newUrl = `${baseUrl}${params.toString() ? `?${params.toString()}` : ''}`
    router.push(newUrl)
  }

  // Debounce para búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== currentFilters?.searchTerm) {
        navigateWithFilters({ searchTerm: searchInput, page: 1 })
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [searchInput])

  // Handlers para filtros
  const handleSortChange = (sortBy: string) => {
    navigateWithFilters({ sortBy: sortBy as any, page: 1 })
  }

  const handleSortOrderChange = (sortOrder: string) => {
    navigateWithFilters({ sortOrder: sortOrder as any, page: 1 })
  }

  const handlePageChange = (page: number) => {
    navigateWithFilters({ page })
  }

  const handleResetFilters = () => {
    setSearchInput('')
    router.push(baseUrl)
  }

  // Calcular si hay filtros activos
  const hasActiveFilters = !!(
    currentFilters?.searchTerm ||
    (currentFilters?.sortBy && currentFilters.sortBy !== 'createdAt') ||
    (currentFilters?.sortOrder && currentFilters.sortOrder !== 'desc') ||
    currentFilters?.dateFrom ||
    currentFilters?.dateTo
  )

  return (
    <div className='space-y-6'>
      {/* Controles de búsqueda y filtros */}
      <div className='space-y-4'>
        {/* Barra de búsqueda y controles principales */}
        <div className='flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between'>
          {/* Búsqueda */}
          <div className='relative flex-1 max-w-sm'>
            <IconSearch className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground' />
            <Input
              placeholder='Buscar proyectos...'
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className='pl-10'
            />
          </div>

          {/* Controles de ordenamiento */}
          <div className='flex flex-wrap gap-2'>
            {/* Ordenar por */}
            <Select value={currentFilters?.sortBy || 'createdAt'} onValueChange={handleSortChange}>
              <SelectTrigger className='w-40'>
                <SelectValue placeholder='Ordenar por' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='createdAt'>Fecha creación</SelectItem>
                <SelectItem value='updatedAt'>Última actualización</SelectItem>
                <SelectItem value='title'>Título</SelectItem>
              </SelectContent>
            </Select>

            {/* Orden */}
            <Select
              value={currentFilters?.sortOrder || 'desc'}
              onValueChange={handleSortOrderChange}
            >
              <SelectTrigger className='w-36'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='desc'>Descendente</SelectItem>
                <SelectItem value='asc'>Ascendente</SelectItem>
              </SelectContent>
            </Select>

            {/* Botón reset filtros */}
            {hasActiveFilters && (
              <Button
                variant='outline'
                size='sm'
                onClick={handleResetFilters}
                className='flex items-center gap-2'
              >
                <IconRefresh className='h-4 w-4' />
                Reset
              </Button>
            )}
          </div>
        </div>

        {/* Filtros activos */}
        {hasActiveFilters && (
          <div className='flex flex-wrap gap-2'>
            {currentFilters?.searchTerm && (
              <Badge variant='secondary' className='flex items-center gap-1'>
                <IconSearch className='h-3 w-3' />
                Búsqueda: "{currentFilters.searchTerm}"
              </Badge>
            )}
            {currentFilters?.sortBy !== 'createdAt' && (
              <Badge variant='secondary'>
                Orden: {currentFilters?.sortBy} ({currentFilters?.sortOrder})
              </Badge>
            )}
            {(currentFilters?.dateFrom || currentFilters?.dateTo) && (
              <Badge variant='secondary' className='flex items-center gap-1'>
                <IconFilter className='h-3 w-3' />
                Fecha filtrada
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Grid de proyectos */}
      {projects.length === 0 ? (
        <div className='text-center py-12'>
          <div className='flex justify-center mb-4'>
            <IconFolder className='h-12 w-12 text-muted-foreground' />
          </div>
          <h3 className='text-lg font-semibold mb-2'>
            {hasActiveFilters ? 'No se encontraron proyectos' : 'No hay proyectos'}
          </h3>
          <p className='text-muted-foreground mb-4'>
            {hasActiveFilters
              ? 'Intenta ajustar los filtros para encontrar más resultados'
              : `${client.name || client.email} no ha creado proyectos aún`}
          </p>
          {hasActiveFilters && (
            <Button variant='outline' onClick={handleResetFilters}>
              Limpiar filtros
            </Button>
          )}
        </div>
      ) : (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
          {projects.map((project) => (
            <ClientProjectGridItem key={project.id} project={project} client={client} />
          ))}
        </div>
      )}

      {/* Paginación */}
      {pagination && pagination.totalPages > 1 && (
        <div className='flex flex-col sm:flex-row items-center justify-between gap-4 py-4'>
          {/* Información de página */}
          <div className='text-sm text-muted-foreground'>
            Mostrando {(pagination.currentPage - 1) * 12 + 1} a{' '}
            {Math.min(pagination.currentPage * 12, pagination.totalProjects)} de{' '}
            {pagination.totalProjects} proyectos
          </div>

          {/* Controles de paginación */}
          <div className='flex items-center space-x-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={() => handlePageChange(pagination.currentPage - 1)}
              disabled={pagination.currentPage <= 1}
            >
              <IconChevronLeft className='h-4 w-4' />
              Anterior
            </Button>

            {/* Números de página */}
            <div className='flex items-center space-x-1'>
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                const pageNum = i + 1
                return (
                  <Button
                    key={pageNum}
                    variant={pageNum === pagination.currentPage ? 'default' : 'outline'}
                    size='sm'
                    onClick={() => handlePageChange(pageNum)}
                    className='w-8 h-8 p-0'
                  >
                    {pageNum}
                  </Button>
                )
              })}

              {pagination.totalPages > 5 && (
                <>
                  <span className='text-sm text-muted-foreground'>...</span>
                  <Button
                    variant={
                      pagination.currentPage === pagination.totalPages ? 'default' : 'outline'
                    }
                    size='sm'
                    onClick={() => handlePageChange(pagination.totalPages)}
                    className='w-8 h-8 p-0'
                  >
                    {pagination.totalPages}
                  </Button>
                </>
              )}
            </div>

            <Button
              variant='outline'
              size='sm'
              onClick={() => handlePageChange(pagination.currentPage + 1)}
              disabled={pagination.currentPage >= pagination.totalPages}
            >
              Siguiente
              <IconChevronRight className='h-4 w-4' />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
