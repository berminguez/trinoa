'use client'

import React, { useMemo, useState, useEffect } from 'react'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type VisibilityState,
  type RowSelectionState,
} from '@tanstack/react-table'
import {
  IconVideo,
  IconClock,
  IconCalendar,
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconArrowUp,
  IconArrowDown,
  IconSearch,
  IconEye,
  IconEyeOff,
} from '@tabler/icons-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Resource } from '@/payload-types'

interface VideoTableProps {
  resources: Resource[]
  projectId: string
  onAddResource?: (newResource: Resource) => void
  onUpdateResource?: (resourceId: string, updates: Partial<Resource>) => void
  onRemoveResource?: (resourceId: string) => void
  onResetResources?: () => void
  onResourceUploadFailed?: (tempResourceId: string) => void
}

// Helper para crear columnas
const columnHelper = createColumnHelper<Resource>()

export function VideoTable({
  resources,
  projectId,
  onAddResource,
  onUpdateResource,
  onRemoveResource,
  onResetResources,
  onResourceUploadFailed,
}: VideoTableProps) {
  // Estados de la tabla
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})

  // Manejar responsive columns en el cliente
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth
      setColumnVisibility((prev) => ({
        ...prev,
        duration: width > 768,
        createdAt: width > 1024,
        status: width > 640,
      }))
    }

    // Configurar inicial
    handleResize()

    // Listener para cambios de tamaño
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [globalFilter, setGlobalFilter] = useState('')

  // Definición de columnas
  const columns = useMemo<ColumnDef<Resource>[]>(
    () => [
      // Columna de selección
      {
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && 'indeterminate')
            }
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label='Select all'
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label='Select row'
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      // Columna de thumbnail
      {
        accessorKey: 'title',
        id: 'thumbnail',
        header: 'Thumbnail',
        cell: ({ row }) => (
          <div className='flex items-center justify-center h-10 w-14 lg:h-12 lg:w-16 bg-muted rounded'>
            <IconVideo className='h-4 w-4 lg:h-6 lg:w-6 text-muted-foreground' />
          </div>
        ),
        enableSorting: false,
        enableGlobalFilter: false,
      },
      // Columna de filename
      {
        accessorKey: 'title',
        header: ({ column }) => {
          return (
            <Button
              variant='ghost'
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className='h-auto p-0 hover:bg-transparent'
            >
              Filename
              {column.getIsSorted() === 'asc' ? (
                <IconArrowUp className='ml-2 h-4 w-4' />
              ) : column.getIsSorted() === 'desc' ? (
                <IconArrowDown className='ml-2 h-4 w-4' />
              ) : null}
            </Button>
          )
        },
        cell: ({ row }) => (
          <div className='min-w-0 max-w-xs lg:max-w-sm xl:max-w-md'>
            <p className='font-medium truncate text-sm lg:text-base'>{row.getValue('title')}</p>
            <p className='text-xs lg:text-sm text-muted-foreground truncate hidden sm:block'>
              {row.original.namespace || 'No namespace'}
            </p>
          </div>
        ),
      },
      // Columna de duración
      {
        accessorKey: 'duration',
        header: ({ column }) => {
          return (
            <Button
              variant='ghost'
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className='h-auto p-0 hover:bg-transparent'
            >
              <IconClock className='mr-2 h-4 w-4' />
              Duration
              {column.getIsSorted() === 'asc' ? (
                <IconArrowUp className='ml-2 h-4 w-4' />
              ) : column.getIsSorted() === 'desc' ? (
                <IconArrowDown className='ml-2 h-4 w-4' />
              ) : null}
            </Button>
          )
        },
        cell: ({ row }) => {
          const duration = row.getValue('duration') as number | undefined
          const formatDuration = (seconds?: number) => {
            if (!seconds) return '--:--'
            const mins = Math.floor(seconds / 60)
            const secs = Math.floor(seconds % 60)
            return `${mins}:${secs.toString().padStart(2, '0')}`
          }
          return (
            <div className='flex items-center gap-1 text-sm text-muted-foreground'>
              <span>{formatDuration(duration)}</span>
            </div>
          )
        },
        enableGlobalFilter: false,
      },
      // Columna de fecha de subida
      {
        accessorKey: 'createdAt',
        header: ({ column }) => {
          return (
            <Button
              variant='ghost'
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className='h-auto p-0 hover:bg-transparent'
            >
              <IconCalendar className='mr-2 h-4 w-4' />
              Uploaded
              {column.getIsSorted() === 'asc' ? (
                <IconArrowUp className='ml-2 h-4 w-4' />
              ) : column.getIsSorted() === 'desc' ? (
                <IconArrowDown className='ml-2 h-4 w-4' />
              ) : null}
            </Button>
          )
        },
        cell: ({ row }) => {
          const date = new Date(row.getValue('createdAt'))
          return <div className='text-sm text-muted-foreground'>{date.toLocaleDateString()}</div>
        },
        enableGlobalFilter: false,
      },
      // Columna de estado
      {
        accessorKey: 'status',
        header: ({ column }) => {
          return (
            <Button
              variant='ghost'
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className='h-auto p-0 hover:bg-transparent'
            >
              Status
              {column.getIsSorted() === 'asc' ? (
                <IconArrowUp className='ml-2 h-4 w-4' />
              ) : column.getIsSorted() === 'desc' ? (
                <IconArrowDown className='ml-2 h-4 w-4' />
              ) : null}
            </Button>
          )
        },
        cell: ({ row }) => {
          const status = (row.getValue('status') as string) || 'pending'
          const getStatusBadge = (status: string) => {
            switch (status.toLowerCase()) {
              case 'completed':
                return (
                  <Badge className='bg-green-100 text-green-800 hover:bg-green-100'>
                    Completed
                  </Badge>
                )
              case 'processing':
                return (
                  <Badge className='bg-blue-100 text-blue-800 hover:bg-blue-100'>Processing</Badge>
                )
              case 'error':
                return <Badge className='bg-red-100 text-red-800 hover:bg-red-100'>Error</Badge>
              default:
                return (
                  <Badge className='bg-yellow-100 text-yellow-800 hover:bg-yellow-100'>
                    Pending
                  </Badge>
                )
            }
          }
          return getStatusBadge(status)
        },
        enableGlobalFilter: false,
      },
    ],
    [],
  )

  // Crear instancia de tabla
  const table = useReactTable({
    data: resources,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: 'includesString',
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
    },
    initialState: {
      pagination: {
        pageSize: 12,
      },
    },
  })

  // Si no hay recursos, mostrar estado vacío
  if (resources.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Videos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='text-center py-12'>
            <IconVideo className='h-12 w-12 text-muted-foreground mx-auto mb-4' />
            <h3 className='text-lg font-semibold mb-2'>No videos yet</h3>
            <p className='text-muted-foreground'>Upload videos to start building your project</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className='flex items-center justify-between'>
          <CardTitle>Videos</CardTitle>
          <span className='text-sm text-muted-foreground'>
            {resources.length} video{resources.length !== 1 ? 's' : ''}
          </span>
        </div>
      </CardHeader>
      <CardContent className='space-y-4'>
        {/* Barra de herramientas */}
        <div className='flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0'>
          <div className='flex items-center space-x-2'>
            {/* Búsqueda global */}
            <div className='relative flex-1 lg:flex-none'>
              <IconSearch className='absolute left-2 top-2.5 h-4 w-4 text-muted-foreground' />
              <Input
                placeholder='Search videos...'
                value={globalFilter ?? ''}
                onChange={(event) => setGlobalFilter(String(event.target.value))}
                className='pl-8 w-full lg:max-w-sm'
              />
            </div>
          </div>

          {/* Selector de columnas */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant='outline' size='sm' className='self-end lg:self-auto'>
                <IconEye className='mr-2 h-4 w-4' />
                <span className='hidden sm:inline'>View</span>
                <span className='sm:hidden'>Columns</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className='capitalize'
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) => column.toggleVisibility(!!value)}
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  )
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Información de selección */}
        {Object.keys(rowSelection).length > 0 && (
          <div className='text-sm text-muted-foreground'>
            {Object.keys(rowSelection).length} of {table.getFilteredRowModel().rows.length} row(s)
            selected.
          </div>
        )}

        {/* Tabla */}
        <div className='rounded-md border overflow-hidden'>
          <div className='overflow-x-auto'>
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      return (
                        <TableHead key={header.id} className='px-4'>
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      )
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && 'selected'}
                      className='hover:bg-muted/50'
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className='px-4'>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className='h-24 text-center'>
                      No results found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Paginación */}
        <div className='flex flex-col space-y-4 px-2 lg:flex-row lg:items-center lg:justify-between lg:space-y-0'>
          <div className='text-sm text-muted-foreground text-center lg:text-left'>
            <span className='hidden sm:inline'>
              Showing{' '}
              {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{' '}
              {Math.min(
                (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                table.getFilteredRowModel().rows.length,
              )}{' '}
              of {table.getFilteredRowModel().rows.length} entries
            </span>
            <span className='sm:hidden'>{table.getFilteredRowModel().rows.length} total</span>
          </div>
          <div className='flex items-center justify-center space-x-2 lg:justify-end'>
            <Button
              variant='outline'
              size='sm'
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
              className='hidden sm:flex'
            >
              <IconChevronsLeft className='h-4 w-4' />
            </Button>
            <Button
              variant='outline'
              size='sm'
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <IconChevronLeft className='h-4 w-4' />
              <span className='ml-1 hidden sm:inline'>Previous</span>
            </Button>
            <span className='text-sm text-muted-foreground px-2'>
              <span className='hidden sm:inline'>Page </span>
              {table.getState().pagination.pageIndex + 1}
              <span className='hidden sm:inline'> of {table.getPageCount()}</span>
              <span className='sm:hidden'>/{table.getPageCount()}</span>
            </span>
            <Button
              variant='outline'
              size='sm'
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <span className='mr-1 hidden sm:inline'>Next</span>
              <IconChevronRight className='h-4 w-4' />
            </Button>
            <Button
              variant='outline'
              size='sm'
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
              className='hidden sm:flex'
            >
              <IconChevronsRight className='h-4 w-4' />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
