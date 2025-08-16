'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  IconSearch,
  IconFilter,
  IconRefresh,
  IconChevronLeft,
  IconChevronRight,
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
import type { ClientsFilters, ClientWithStats } from '@/actions/clients/types'
import { useClientsStore } from '@/stores/clients-store'
import { ClientGridItem } from './ClientGridItem'
import { ClientsSkeleton } from './ClientsSkeleton'

interface PaginationInfo {
  currentPage: number
  totalPages: number
  totalClients: number
  clientsPerPage: number
}

interface ClientsGridProps {
  clients: ClientWithStats[]
  isLoading?: boolean
  pagination?: PaginationInfo
  currentFilters?: ClientsFilters
}

/**
 * Grid de clientes con búsqueda, filtros y ordenamiento interactivos
 *
 * Integra Zustand store para estado y navegación URL para persistencia
 * Incluye controles de búsqueda, filtros y paginación funcionales
 */
export function ClientsGrid({
  clients,
  isLoading = false,
  pagination,
  currentFilters,
}: ClientsGridProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Store de Zustand
  const {
    filters,
    setSearchTerm,
    setSortBy,
    setSortOrder,
    setRole,
    setPage,
    resetFilters,
    getSearchParams,
    applyFromSearchParams,
  } = useClientsStore()

  // Estado local para input de búsqueda (debounced)
  const [searchInput, setSearchInput] = useState(filters.searchTerm)

  // Sincronizar store con filtros actuales del servidor al montar
  useEffect(() => {
    if (currentFilters) {
      const urlParams = new URLSearchParams()
      Object.entries(currentFilters).forEach(([key, value]) => {
        if (value !== undefined && value !== '' && value !== 1) {
          urlParams.set(key === 'searchTerm' ? 'search' : key, String(value))
        }
      })
      applyFromSearchParams(urlParams)
      setSearchInput(currentFilters.searchTerm || '')
    }
  }, [currentFilters, applyFromSearchParams])

  // Debounce para búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== filters.searchTerm) {
        setSearchTerm(searchInput || '')
        navigateWithFilters()
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [searchInput, filters.searchTerm, setSearchTerm])

  // Función para navegar con filtros actualizados
  const navigateWithFilters = () => {
    const params = getSearchParams()
    const newUrl = `/clients${params.toString() ? `?${params.toString()}` : ''}`
    router.push(newUrl)
  }

  // Handlers para filtros
  const handleSortChange = (sortBy: string) => {
    setSortBy(sortBy as any)
    navigateWithFilters()
  }

  const handleSortOrderChange = (sortOrder: string) => {
    setSortOrder(sortOrder as any)
    navigateWithFilters()
  }

  const handleRoleChange = (role: string) => {
    setRole(role === 'all' ? undefined : (role as any))
    navigateWithFilters()
  }

  const handlePageChange = (page: number) => {
    setPage(page)
    navigateWithFilters()
  }

  const handleResetFilters = () => {
    resetFilters()
    setSearchInput('')
    router.push('/clients')
  }

  // Calcular si hay filtros activos
  const hasActiveFilters = !!(
    filters.searchTerm ||
    filters.role ||
    (filters.sortBy && filters.sortBy !== 'createdAt') ||
    (filters.sortOrder && filters.sortOrder !== 'desc')
  )

  if (isLoading) {
    return <ClientsSkeleton />
  }

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
              placeholder='Buscar por nombre o email...'
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className='pl-10'
            />
          </div>

          {/* Controles de ordenamiento y filtros */}
          <div className='flex flex-wrap gap-2'>
            {/* Ordenar por */}
            <Select value={filters.sortBy} onValueChange={handleSortChange}>
              <SelectTrigger className='w-40'>
                <SelectValue placeholder='Ordenar por' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='createdAt'>Fecha registro</SelectItem>
                <SelectItem value='name'>Nombre</SelectItem>
                <SelectItem value='email'>Email</SelectItem>
                <SelectItem value='projectCount'>Proyectos</SelectItem>
              </SelectContent>
            </Select>

            {/* Orden */}
            <Select value={filters.sortOrder} onValueChange={handleSortOrderChange}>
              <SelectTrigger className='w-36'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='desc'>Descendente</SelectItem>
                <SelectItem value='asc'>Ascendente</SelectItem>
              </SelectContent>
            </Select>

            {/* Filtro por rol */}
            <Select value={filters.role || 'all'} onValueChange={handleRoleChange}>
              <SelectTrigger className='w-32'>
                <SelectValue placeholder='Rol' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>Todos</SelectItem>
                <SelectItem value='user'>Usuario</SelectItem>
                <SelectItem value='admin'>Admin</SelectItem>
                <SelectItem value='api'>API</SelectItem>
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
            {filters.searchTerm && (
              <Badge variant='secondary' className='flex items-center gap-1'>
                <IconSearch className='h-3 w-3' />
                Búsqueda: "{filters.searchTerm}"
              </Badge>
            )}
            {filters.role && (
              <Badge variant='secondary' className='flex items-center gap-1'>
                <IconFilter className='h-3 w-3' />
                Rol: {filters.role}
              </Badge>
            )}
            {filters.sortBy !== 'createdAt' && (
              <Badge variant='secondary'>
                Orden: {filters.sortBy} ({filters.sortOrder})
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Grid de clientes */}
      {clients.length === 0 ? (
        <div className='text-center py-12'>
          <div className='flex justify-center mb-4'>
            <IconSearch className='h-12 w-12 text-muted-foreground' />
          </div>
          <h3 className='text-lg font-semibold mb-2'>
            {hasActiveFilters ? 'No se encontraron clientes' : 'No hay clientes'}
          </h3>
          <p className='text-muted-foreground mb-4'>
            {hasActiveFilters
              ? 'Intenta ajustar los filtros para encontrar más resultados'
              : 'La lista de clientes aparecerá aquí cuando se registren usuarios'}
          </p>
          {hasActiveFilters && (
            <Button variant='outline' onClick={handleResetFilters}>
              Limpiar filtros
            </Button>
          )}
        </div>
      ) : (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
          {clients.map((client) => (
            <ClientGridItem key={client.id} client={client} />
          ))}
        </div>
      )}

      {/* Paginación */}
      {pagination && pagination.totalPages > 1 && (
        <div className='flex flex-col sm:flex-row items-center justify-between gap-4 py-4'>
          {/* Información de página */}
          <div className='text-sm text-muted-foreground'>
            Mostrando {(pagination.currentPage - 1) * 12 + 1} a{' '}
            {Math.min(pagination.currentPage * 12, pagination.totalClients)} de{' '}
            {pagination.totalClients} clientes
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
