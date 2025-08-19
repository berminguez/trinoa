'use client'

import React, {
  useMemo,
  useState,
  useEffect,
  useCallback,
  useImperativeHandle,
  forwardRef,
} from 'react'
import Link from 'next/link'
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
  IconFileText,
  IconPhoto,
  IconExternalLink,
  IconTrash,
  IconCalendar,
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconArrowUp,
  IconArrowDown,
  IconSearch,
  IconEye,
  IconLoader2,
  IconPlayerPlay,
} from '@tabler/icons-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ConfidenceBadge } from '@/components/ui/confidence-badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Resource } from '@/payload-types'
import { deleteDocument } from '@/actions/documents/deleteDocument'
import { deleteBulkDocuments } from '@/actions/documents/deleteBulkDocuments'
import { toast } from 'sonner'
import { getProjectPreResources } from '@/actions/projects/getProjectPreResources'
import type { PreResource } from '@/payload-types'

// Interfaz para métodos expuestos del DocumentTable
export interface DocumentTableRef {
  addPreResource: (preResource: PreResource) => void
}

interface DocumentTableProps {
  resources: Resource[]
  projectId: string
  onAddResource?: (newResource: Resource) => void
  onUpdateResource?: (resourceId: string, updates: Partial<Resource>) => void
  onRemoveResource?: (resourceId: string) => void
  onResetResources?: () => void
  onResourceUploadFailed?: (tempResourceId: string) => void
  onTriggerPreResourcesRefresh?: () => void
  // Nuevo: Props para modo cliente
  clientMode?: {
    clientId: string
    projectId: string
  }
}

// Helper para crear columnas
const _columnHelper = createColumnHelper<Resource>()

export const DocumentTable = forwardRef<DocumentTableRef, DocumentTableProps>(
  (
    {
      resources,
      projectId,
      onAddResource: _onAddResource,
      onUpdateResource: _onUpdateResource,
      onRemoveResource,
      onResetResources,
      onResourceUploadFailed: _onResourceUploadFailed,
      onTriggerPreResourcesRefresh,
      clientMode,
    },
    ref,
  ) => {
    // Estados de la tabla
    const [sorting, setSorting] = useState<SortingState>([])
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
    const [globalFilter, setGlobalFilter] = useState('')

    // Estados de loading para borrado
    const [isDeleting, setIsDeleting] = useState(false)
    const [deletingResourceId, setDeletingResourceId] = useState<string | null>(null)
    const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)
    const [selectedDocumentsInfo, setSelectedDocumentsInfo] = useState<{
      ids: string[]
      titles: string[]
    }>({ ids: [], titles: [] })

    // Estados para monitoreo de pre-resources
    const [processingPreResources, setProcessingPreResources] = useState<PreResource[]>([])
    const [loadingPreResources, setLoadingPreResources] = useState(false)

    // Helper para generar URLs de recursos
    const getResourceUrl = (resourceId: string) => {
      if (clientMode) {
        return `/clients/${clientMode.clientId}/projects/${clientMode.projectId}/resource/${resourceId}`
      }
      return `/projects/${projectId}/resource/${resourceId}`
    }

    // Función para manejar el borrado de documentos
    const handleDeleteDocument = useCallback(
      async (resourceId: string, title: string) => {
        setDeletingResourceId(resourceId)

        try {
          console.log('🗑️ [TABLE] Deleting document:', { resourceId, title })

          const result = await deleteDocument({
            resourceId,
            projectId,
          })

          if (result.success) {
            console.log('✅ [TABLE] Document deleted successfully')
            // Remover el recurso de la tabla localmente (optimistic update)
            if (onRemoveResource) {
              onRemoveResource(resourceId)
            }
            toast.success('¡Documento eliminado!', {
              description: `"${title}" se ha borrado exitosamente`,
            })
          } else {
            console.error('❌ [TABLE] Failed to delete document:', result.error)
            toast.error('Error al borrar documento', {
              description: result.error,
            })
          }
        } catch (error) {
          console.error('❌ [TABLE] Error in delete handler:', error)
          toast.error('Error inesperado', {
            description: 'No se pudo borrar el documento',
          })
        } finally {
          setDeletingResourceId(null)
        }
      },
      [projectId, onRemoveResource],
    )

    // Función para abrir el diálogo de confirmación de borrado múltiple
    const handleBulkDeleteClick = useCallback(() => {
      const selectedIds = Object.keys(rowSelection)
      if (selectedIds.length === 0) return

      const selectedTitles = selectedIds.map((id) => {
        const resource = resources.find((r) => r.id === id)
        return resource?.title || 'Unknown'
      })

      setSelectedDocumentsInfo({ ids: selectedIds, titles: selectedTitles })
      setBulkDeleteDialogOpen(true)
    }, [rowSelection, resources])

    // Función para confirmar el borrado en bloque
    const confirmBulkDelete = useCallback(async () => {
      setBulkDeleteDialogOpen(false)
      setIsDeleting(true)

      try {
        console.log('🗑️ [TABLE] Bulk deleting documents:', selectedDocumentsInfo.ids)

        const result = await deleteBulkDocuments({
          resourceIds: selectedDocumentsInfo.ids,
          projectId,
        })

        if (result.success) {
          console.log(`✅ [TABLE] Bulk delete completed: ${result.deletedCount} deleted`)

          // Remover los recursos eliminados de la tabla localmente
          selectedDocumentsInfo.ids.forEach((id) => {
            if (onRemoveResource) {
              onRemoveResource(id)
            }
          })

          // Limpiar selección
          setRowSelection({})

          // Mostrar resultado
          if (result.errors.length > 0) {
            toast.warning('Borrado parcial completado', {
              description: `${result.message}\n\nErrores:\n${result.errors.map((e) => `• ${e.error}`).join('\n')}`,
            })
          } else {
            toast.success('¡Borrado exitoso!', {
              description: result.message,
            })
          }
        } else {
          console.error('❌ [TABLE] Bulk delete failed:', result.errors)
          toast.error('Error al borrar documentos', {
            description: `Errores:\n${result.errors.map((e) => `• ${e.error}`).join('\n')}`,
          })
        }
      } catch (error) {
        console.error('❌ [TABLE] Error in bulk delete handler:', error)
        toast.error('Error inesperado', {
          description: 'No se pudieron borrar los documentos',
        })
      } finally {
        setIsDeleting(false)
      }
    }, [selectedDocumentsInfo, projectId, onRemoveResource, setRowSelection])

    // Manejar responsive columns en el cliente
    useEffect(() => {
      const handleResize = () => {
        const width = window.innerWidth
        setColumnVisibility((prev) => ({
          ...prev,
          type: width > 768,
          createdAt: width > 1024,
          status: width > 640,
          actions: width > 480, // Ocultar acciones en móviles muy pequeños
        }))
      }

      // Configurar inicial
      handleResize()

      // Listener para cambios de tamaño
      window.addEventListener('resize', handleResize)
      return () => window.removeEventListener('resize', handleResize)
    }, [])

    // Función para agregar pre-resource al estado (disponible externamente)
    const addPreResourceToState = useCallback((preResource: PreResource) => {
      console.log(
        '🎯 [DOCUMENT-TABLE] Adding/updating pre-resource:',
        preResource.originalName,
        'ID:',
        preResource.id,
      )

      setProcessingPreResources((prev) => {
        // Verificar si ya existe un pre-resource con el mismo ID
        const existingIndex = prev.findIndex((pr) => pr.id === preResource.id)

        if (existingIndex >= 0) {
          // Actualizar pre-resource existente
          console.log('🔄 [DOCUMENT-TABLE] Updating existing pre-resource:', preResource.id)
          const updated = [...prev]
          updated[existingIndex] = preResource
          return updated
        } else {
          // Agregar nuevo pre-resource
          console.log('➕ [DOCUMENT-TABLE] Adding new pre-resource:', preResource.id)
          return [preResource, ...prev]
        }
      })
    }, [])

    // Exponer métodos al componente padre via ref
    useImperativeHandle(
      ref,
      () => ({
        addPreResource: addPreResourceToState,
      }),
      [addPreResourceToState],
    )

    // Función para verificar si un pre-resource está aún en proceso
    const isProcessingStatus = (status: string) => {
      return status === 'pending' || status === 'processing' || status === 'splitting'
    }

    // Cargar pre-resources en proceso al montar el componente
    useEffect(() => {
      const loadProcessingPreResources = async () => {
        if (!projectId) return

        setLoadingPreResources(true)
        try {
          const result = await getProjectPreResources(projectId)
          if (result.success && result.data) {
            // Solo mantener los que están en proceso
            const processingPrs = result.data.filter((pr) => isProcessingStatus(pr.status))
            setProcessingPreResources(processingPrs)
            console.log(
              `📋 [DOCUMENT-TABLE] Found ${processingPrs.length} processing pre-resources on mount`,
            )
          } else {
            console.error('Error loading pre-resources:', result.error)
          }
        } catch (error) {
          console.error('Error loading pre-resources:', error)
        } finally {
          setLoadingPreResources(false)
        }
      }

      loadProcessingPreResources()
    }, [projectId])

    // Polling para monitorear pre-resources en proceso
    useEffect(() => {
      if (processingPreResources.length === 0) return

      let isCancelled = false

      const checkPreResourcesStatus = async () => {
        try {
          const result = await getProjectPreResources(projectId)
          if (result.success && result.data && !isCancelled) {
            const allPreResources = result.data

            // Verificar el estado actual de cada pre-resource que estamos monitoreando
            const stillProcessing: PreResource[] = []
            const completedIds: string[] = []

            for (const processingPr of processingPreResources) {
              const current = allPreResources.find((pr) => pr.id === processingPr.id)

              if (current) {
                if (isProcessingStatus(current.status)) {
                  // Aún en proceso, mantener en la lista (actualizar datos)
                  stillProcessing.push(current)
                } else {
                  // Ya no está en proceso (done o error)
                  completedIds.push(current.id)
                  console.log(
                    `✅ [DOCUMENT-TABLE] Pre-resource completed: ${current.id} - Status: ${current.status}`,
                  )
                }
              } else {
                // Pre-resource no encontrado en la base de datos
                // Podría ser temporal o eliminado - solo agregar a completedIds si no es temporal
                if (!processingPr.id.startsWith('temp-') && processingPr.id.length > 10) {
                  completedIds.push(processingPr.id)
                  console.log(
                    `⚠️ [DOCUMENT-TABLE] Pre-resource not found (possibly deleted): ${processingPr.id}`,
                  )
                } else {
                  console.log(
                    `🗑️ [DOCUMENT-TABLE] Removing temporary pre-resource: ${processingPr.id}`,
                  )
                }
              }
            }

            // Actualizar estado con los que siguen en proceso
            setProcessingPreResources(stillProcessing)

            // Si alguno se completó, mostrar notificación y actualizar resources
            if (completedIds.length > 0) {
              console.log('🎯 [DOCUMENT-TABLE] Processing completed pre-resources:', {
                completedIds,
                allPreResourcesCount: allPreResources.length,
                processingPreResourcesCount: processingPreResources.length,
              })

              // Solo usar datos frescos de la base de datos para evitar estados obsoletos
              // NO usar processingPreResources como fallback porque puede contener datos temporales obsoletos
              const completedPreResources = completedIds
                .map((id) => allPreResources.find((pr) => pr.id === id))
                .filter(Boolean) // Solo incluir pre-resources que existen en la base de datos

              console.log(
                '🔍 [DOCUMENT-TABLE] Completed pre-resources details:',
                completedPreResources.map((pr) => ({
                  id: pr?.id || 'unknown',
                  status: pr?.status || 'unknown',
                  originalName: pr?.originalName || 'unknown',
                })),
              )

              const successCount = completedPreResources.filter(
                (pr) => pr && pr.status === 'done',
              ).length
              const errorCount = completedPreResources.filter(
                (pr) => pr && pr.status === 'error',
              ).length

              console.log('📊 [DOCUMENT-TABLE] Status counts:', {
                total: completedPreResources.length,
                successCount,
                errorCount,
                statuses: completedPreResources.map((pr) => pr?.status || 'unknown'),
              })

              if (successCount > 0) {
                toast.success('¡Documentos procesados!', {
                  description: `${successCount} documento${successCount !== 1 ? 's' : ''} ${successCount !== 1 ? 'han sido procesados' : 'ha sido procesado'} y dividido en segmentos`,
                })
              }

              if (errorCount > 0) {
                console.warn(
                  '⚠️ [DOCUMENT-TABLE] Detected errors in pre-resources:',
                  completedPreResources.filter((pr) => pr && pr.status === 'error'),
                )
                toast.error('Error en procesamiento', {
                  description: `${errorCount} documento${errorCount !== 1 ? 's' : ''} ${errorCount !== 1 ? 'fallaron' : 'falló'} al procesarse`,
                })
              }

              // Disparar actualización de la tabla de resources
              if (onResetResources) {
                onResetResources()
              }
            }
          }
        } catch (error) {
          console.error('Error checking pre-resources status:', error)
        }
      }

      // Primera verificación inmediata y luego cada 3 segundos
      checkPreResourcesStatus()
      const interval = setInterval(checkPreResourcesStatus, 3000)

      return () => {
        isCancelled = true
        clearInterval(interval)
      }
    }, [processingPreResources, projectId, onResetResources])

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
                Nombre del archivo
                {column.getIsSorted() === 'asc' ? (
                  <IconArrowUp className='ml-2 h-4 w-4' />
                ) : column.getIsSorted() === 'desc' ? (
                  <IconArrowDown className='ml-2 h-4 w-4' />
                ) : null}
              </Button>
            )
          },
          cell: ({ row }) => {
            const resource = row.original
            return (
              <div className='min-w-0 max-w-xs lg:max-w-sm xl:max-w-md'>
                <Link
                  href={getResourceUrl(resource.id)}
                  className='font-medium truncate text-sm lg:text-base block hover:underline'
                >
                  {row.getValue('title') as string}
                </Link>
              </div>
            )
          },
        },
        // Columna de tipo de documento
        {
          accessorKey: 'type',
          header: ({ column }) => {
            return (
              <Button
                variant='ghost'
                onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                className='h-auto p-0 hover:bg-transparent'
              >
                <IconFileText className='mr-2 h-4 w-4' />
                Tipo
                {column.getIsSorted() === 'asc' ? (
                  <IconArrowUp className='ml-2 h-4 w-4' />
                ) : column.getIsSorted() === 'desc' ? (
                  <IconArrowDown className='ml-2 h-4 w-4' />
                ) : null}
              </Button>
            )
          },
          cell: ({ row }) => {
            const type = row.original.type
            const isImage = type === 'image'
            const isPDF = type === 'document'

            return (
              <div className='flex items-center gap-2'>
                {isPDF ? (
                  <>
                    <IconFileText className='h-4 w-4 text-red-500' />
                    <span className='text-sm font-medium'>PDF</span>
                  </>
                ) : isImage ? (
                  <>
                    <IconPhoto className='h-4 w-4 text-blue-500' />
                    <span className='text-sm font-medium'>Image</span>
                  </>
                ) : (
                  <span className='text-sm text-muted-foreground'>Unknown</span>
                )}
              </div>
            )
          },
          enableGlobalFilter: false,
        },
        // Columna de Caso
        {
          accessorKey: 'caso',
          header: ({ column }) => (
            <Button
              variant='ghost'
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className='h-auto p-0 hover:bg-transparent'
            >
              Caso
              {column.getIsSorted() === 'asc' ? (
                <IconArrowUp className='ml-2 h-4 w-4' />
              ) : column.getIsSorted() === 'desc' ? (
                <IconArrowDown className='ml-2 h-4 w-4' />
              ) : null}
            </Button>
          ),
          cell: ({ row }) => {
            const value = (row.getValue('caso') as string) || '-'
            return <span className='text-sm'>{value}</span>
          },
        },
        // Columna de Tipo (negocio)
        {
          accessorKey: 'tipo',
          header: ({ column }) => (
            <Button
              variant='ghost'
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className='h-auto p-0 hover:bg-transparent'
            >
              Tipo (caso)
              {column.getIsSorted() === 'asc' ? (
                <IconArrowUp className='ml-2 h-4 w-4' />
              ) : column.getIsSorted() === 'desc' ? (
                <IconArrowDown className='ml-2 h-4 w-4' />
              ) : null}
            </Button>
          ),
          cell: ({ row }) => {
            const value = (row.getValue('tipo') as string) || '-'
            return <span className='text-sm'>{value}</span>
          },
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
                Subido
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
                Estado
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
                      Completado
                    </Badge>
                  )
                case 'uploading':
                  return (
                    <Badge className='bg-purple-100 text-purple-800 hover:bg-purple-100'>
                      Subiendo
                    </Badge>
                  )
                case 'processing':
                  return (
                    <Badge className='bg-blue-100 text-blue-800 hover:bg-blue-100 inline-flex items-center gap-1'>
                      <IconLoader2 className='h-3 w-3 animate-spin' />
                      Procesando
                    </Badge>
                  )
                case 'failed':
                case 'error':
                  return <Badge className='bg-red-100 text-red-800 hover:bg-red-100'>Fallido</Badge>
                case 'needs_review':
                  return (
                    <Badge className='bg-orange-100 text-orange-800 hover:bg-orange-100'>
                      Requiere revisión
                    </Badge>
                  )
                default:
                  return (
                    <Badge className='bg-yellow-100 text-yellow-800 hover:bg-yellow-100'>
                      Pendiente
                    </Badge>
                  )
              }
            }
            return getStatusBadge(status)
          },
          enableGlobalFilter: false,
        },
        // Columna de confidence
        {
          accessorKey: 'confidence',
          header: ({ column }) => {
            return (
              <Button
                variant='ghost'
                onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                className='h-auto p-0 hover:bg-transparent'
              >
                Confianza
                {column.getIsSorted() === 'asc' ? (
                  <IconArrowUp className='ml-2 h-4 w-4' />
                ) : column.getIsSorted() === 'desc' ? (
                  <IconArrowDown className='ml-2 h-4 w-4' />
                ) : null}
              </Button>
            )
          },
          cell: ({ row }) => {
            const confidence =
              (row.getValue('confidence') as 'empty' | 'needs_revision' | 'trusted' | 'verified') ||
              'empty'
            return (
              <ConfidenceBadge
                confidence={confidence}
                showIcon={true}
                showTooltip={true}
                className='min-w-fit'
              />
            )
          },
          enableGlobalFilter: true,
          filterFn: (row, columnId, filterValue) => {
            const confidence = row.getValue(columnId) as string
            if (!filterValue || filterValue === 'all') return true
            return confidence === filterValue
          },
        },
        // Columna de acciones (ver y borrar documento)
        {
          id: 'actions',
          header: 'Acciones',
          cell: ({ row }) => {
            const resource = row.original
            const mediaFile = resource.file

            // Construir URL del documento
            const documentUrl =
              typeof mediaFile === 'object' && mediaFile?.url ? mediaFile.url : null

            return (
              <div className='flex items-center gap-1'>
                {/* Botón para ver el recurso en el visualizador */}
                <Button
                  variant='ghost'
                  size='sm'
                  asChild
                  className='h-8 w-8 p-0'
                  title='Ver recurso'
                >
                  <Link href={getResourceUrl(resource.id)}>
                    <IconPlayerPlay className='h-4 w-4' />
                  </Link>
                </Button>

                {documentUrl ? (
                  <>
                    <Button
                      variant='ghost'
                      size='sm'
                      asChild
                      className='h-8 w-8 p-0'
                      title='Ver documento'
                    >
                      <a href={documentUrl} target='_blank' rel='noopener noreferrer'>
                        <IconExternalLink className='h-4 w-4' />
                      </a>
                    </Button>
                  </>
                ) : (
                  <span className='text-xs text-muted-foreground'>Sin archivo</span>
                )}

                {/* Botón de borrar con confirmación */}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant='ghost'
                      size='sm'
                      className='h-8 w-8 p-0 text-muted-foreground hover:text-red-600'
                      title='Borrar documento'
                      disabled={deletingResourceId === resource.id}
                    >
                      {deletingResourceId === resource.id ? (
                        <IconLoader2 className='h-4 w-4 animate-spin' />
                      ) : (
                        <IconTrash className='h-4 w-4' />
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Borrar Documento</AlertDialogTitle>
                      <AlertDialogDescription>
                        ¿Estás seguro de que quieres borrar &quot;{resource.title}&quot;? Esta
                        acción no se puede deshacer.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={deletingResourceId === resource.id}>
                        Cancelar
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDeleteDocument(resource.id, resource.title)}
                        disabled={deletingResourceId === resource.id}
                        className='bg-red-600 hover:bg-red-700 focus:ring-red-600'
                      >
                        {deletingResourceId === resource.id ? (
                          <>
                            <IconLoader2 className='h-4 w-4 mr-2 animate-spin' />
                            Borrando...
                          </>
                        ) : (
                          'Borrar'
                        )}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )
          },
          enableSorting: false,
          enableGlobalFilter: false,
        },
      ],
      [handleDeleteDocument, deletingResourceId, projectId, getResourceUrl], // Include getResourceUrl so links stay in sync
    )

    // Crear instancia de tabla
    const table = useReactTable({
      data: resources,
      columns,
      getRowId: (resource) => resource.id, // ⭐ CRITICAL: Use real resource ID, not array index
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

    // Polling: verificar cada 2s los resources en "processing" y actualizar estado (status, caso, tipo, progress)
    const processingResources = useMemo(
      () => resources.filter((r) => r.status === 'processing'),
      [resources],
    )

    useEffect(() => {
      if (processingResources.length === 0) return

      let isCancelled = false

      const poll = async () => {
        try {
          const results = await Promise.all(
            processingResources.map(async (res) => {
              try {
                const response = await fetch(`/api/resources/${res.id}`, {
                  method: 'GET',
                  credentials: 'include',
                  cache: 'no-store',
                })
                if (!response.ok) return null
                const json = await response.json()
                return { id: res.id, json }
              } catch {
                return null
              }
            }),
          )

          if (isCancelled) return

          results.forEach((entry) => {
            if (!entry || !entry.json) return
            const data = entry.json as Partial<Resource>
            const resourceId = entry.id
            const current = resources.find((r) => r.id === resourceId)
            if (!current) return

            const updates: Partial<Resource> = {}
            if (data.status && data.status !== current.status) {
              updates.status = data.status
            }
            if (typeof data.progress === 'number' && data.progress !== current.progress) {
              updates.progress = data.progress
            }
            if ((data as any).startedAt && (data as any).startedAt !== (current as any).startedAt) {
              ;(updates as any).startedAt = (data as any).startedAt
            }
            if (
              (data as any).completedAt &&
              (data as any).completedAt !== (current as any).completedAt
            ) {
              ;(updates as any).completedAt = (data as any).completedAt
            }
            if (
              typeof (data as any).caso === 'string' &&
              (data as any).caso !== (current as any).caso
            ) {
              ;(updates as any).caso = (data as any).caso
            }
            if (
              typeof (data as any).tipo === 'string' &&
              (data as any).tipo !== (current as any).tipo
            ) {
              ;(updates as any).tipo = (data as any).tipo
            }

            if (Object.keys(updates).length > 0) {
              _onUpdateResource?.(resourceId, updates)
            }
          })
        } catch {
          // silencioso
        }
      }

      // primera ejecución inmediata y luego cada 2s
      poll()
      const interval = setInterval(poll, 2000)
      return () => {
        isCancelled = true
        clearInterval(interval)
      }
    }, [processingResources, resources, _onUpdateResource])

    // Si no hay recursos, mostrar estado vacío
    if (resources.length === 0) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>Documentos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-center py-12'>
              <IconFileText className='h-12 w-12 text-muted-foreground mx-auto mb-4' />
              <h3 className='text-lg font-semibold mb-2'>Aún no hay documentos</h3>
              <p className='text-muted-foreground'>
                Sube documentos para empezar a construir tu proyecto
              </p>
            </div>
          </CardContent>
        </Card>
      )
    }

    return (
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <CardTitle>Documentos</CardTitle>
            <div className='flex items-center gap-2'>
              <span className='text-sm text-muted-foreground'>
                {resources.length} documento{resources.length !== 1 ? 's' : ''}
              </span>
              {Object.keys(rowSelection).length > 0 && (
                <Badge variant='secondary' className='text-xs'>
                  {Object.keys(rowSelection).length} seleccionado
                  {Object.keys(rowSelection).length !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          </div>

          {/* Badge de notificación para pre-resources en procesamiento */}
          {processingPreResources.length > 0 && (
            <div className='mt-3 flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg'>
              <IconLoader2 className='h-4 w-4 text-blue-600 animate-spin' />
              <div className='flex-1'>
                <p className='text-sm font-medium text-blue-800'>
                  Procesando {processingPreResources.length} documento
                  {processingPreResources.length !== 1 ? 's' : ''} multifactura
                </p>
                <p className='text-xs text-blue-600'>
                  {(() => {
                    const splittingCount = processingPreResources.filter(
                      (pr) => pr.status === 'splitting',
                    ).length
                    const processingCount = processingPreResources.filter(
                      (pr) => pr.status === 'processing',
                    ).length
                    const pendingCount = processingPreResources.filter(
                      (pr) => pr.status === 'pending',
                    ).length

                    const parts = []
                    if (pendingCount > 0) parts.push(`${pendingCount} analizando con IA`)
                    if (processingCount > 0) parts.push(`${processingCount} en análisis`)
                    if (splittingCount > 0) parts.push(`${splittingCount} dividiendo PDF`)

                    return parts.length > 0
                      ? `Estado: ${parts.join(', ')}. Los nuevos documentos aparecerán cuando esté listo.`
                      : 'Los documentos se están procesando. Los nuevos documentos aparecerán cuando estén listos.'
                  })()}
                </p>
              </div>
              <Badge className='bg-blue-100 text-blue-800 hover:bg-blue-100'>
                {processingPreResources.length} en proceso
              </Badge>
            </div>
          )}
        </CardHeader>
        <CardContent className='space-y-4'>
          {/* Barra de acciones para elementos seleccionados */}
          {Object.keys(rowSelection).length > 0 && (
            <div className='flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg'>
              <div className='flex items-center gap-2'>
                <span className='text-sm font-medium text-blue-800'>
                  {Object.keys(rowSelection).length} documento
                  {Object.keys(rowSelection).length !== 1 ? 's' : ''} seleccionado
                  {Object.keys(rowSelection).length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className='flex items-center gap-2'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => setRowSelection({})}
                  className='text-blue-700 border-blue-300 hover:bg-blue-100'
                >
                  Limpiar Selección
                </Button>
                <Button
                  variant='destructive'
                  size='sm'
                  onClick={handleBulkDeleteClick}
                  disabled={isDeleting}
                  className='bg-red-600 hover:bg-red-700'
                >
                  {isDeleting ? (
                    <IconLoader2 className='h-4 w-4 mr-1 animate-spin' />
                  ) : (
                    <IconTrash className='h-4 w-4 mr-1' />
                  )}
                  {isDeleting ? 'Borrando...' : 'Borrar Seleccionados'}
                </Button>
              </div>
            </div>
          )}

          {/* Barra de herramientas */}
          <div className='flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0'>
            <div className='flex flex-col space-y-2 lg:flex-row lg:items-center lg:space-y-0 lg:space-x-2'>
              {/* Búsqueda global */}
              <div className='relative flex-1 lg:flex-none'>
                <IconSearch className='absolute left-2 top-2.5 h-4 w-4 text-muted-foreground' />
                <Input
                  placeholder='Buscar documentos...'
                  value={globalFilter ?? ''}
                  onChange={(event) => setGlobalFilter(String(event.target.value))}
                  className='pl-8 w-full lg:max-w-sm'
                />
              </div>

              {/* Filtro de confianza */}
              <Select
                value={(table.getColumn('confidence')?.getFilterValue() as string) || 'all'}
                onValueChange={(value) =>
                  table.getColumn('confidence')?.setFilterValue(value === 'all' ? '' : value)
                }
              >
                <SelectTrigger className='w-full lg:w-[180px]'>
                  <SelectValue placeholder='Filtrar por confianza' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>Todas las confianzas</SelectItem>
                  <SelectItem value='empty'>
                    <div className='flex items-center gap-2'>
                      <ConfidenceBadge confidence='empty' showTooltip={false} size='sm' />
                    </div>
                  </SelectItem>
                  <SelectItem value='needs_revision'>
                    <div className='flex items-center gap-2'>
                      <ConfidenceBadge confidence='needs_revision' showTooltip={false} size='sm' />
                    </div>
                  </SelectItem>
                  <SelectItem value='trusted'>
                    <div className='flex items-center gap-2'>
                      <ConfidenceBadge confidence='trusted' showTooltip={false} size='sm' />
                    </div>
                  </SelectItem>
                  <SelectItem value='verified'>
                    <div className='flex items-center gap-2'>
                      <ConfidenceBadge confidence='verified' showTooltip={false} size='sm' />
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Selector de columnas */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant='outline' size='sm' className='self-end lg:self-auto'>
                  <IconEye className='mr-2 h-4 w-4' />
                  <span className='hidden sm:inline'>Ver</span>
                  <span className='sm:hidden'>Columnas</span>
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
              {Object.keys(rowSelection).length} de {table.getFilteredRowModel().rows.length} fila
              {table.getFilteredRowModel().rows.length !== 1 ? 's' : ''}
              seleccionada{Object.keys(rowSelection).length !== 1 ? 's' : ''}.
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
                Mostrando{' '}
                {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} a{' '}
                {Math.min(
                  (table.getState().pagination.pageIndex + 1) *
                    table.getState().pagination.pageSize,
                  table.getFilteredRowModel().rows.length,
                )}{' '}
                de {table.getFilteredRowModel().rows.length} entradas
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
                <span className='ml-1 hidden sm:inline'>Anterior</span>
              </Button>
              <span className='text-sm text-muted-foreground px-2'>
                <span className='hidden sm:inline'>Página </span>
                {table.getState().pagination.pageIndex + 1}
                <span className='hidden sm:inline'> de {table.getPageCount()}</span>
                <span className='sm:hidden'>/{table.getPageCount()}</span>
              </span>
              <Button
                variant='outline'
                size='sm'
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <span className='mr-1 hidden sm:inline'>Siguiente</span>
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

        {/* Diálogo de confirmación para borrado múltiple */}
        <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Borrar múltiples documentos</AlertDialogTitle>
              <AlertDialogDescription>
                ¿Estás seguro de que quieres borrar {selectedDocumentsInfo.ids.length} documento
                {selectedDocumentsInfo.ids.length !== 1 ? 's' : ''}?
              </AlertDialogDescription>
              <div className='my-4'>
                <strong className='text-sm'>Documentos seleccionados:</strong>
                <ul className='mt-2 space-y-1 max-h-32 overflow-y-auto'>
                  {selectedDocumentsInfo.titles.slice(0, 5).map((title, index) => (
                    <li key={index} className='text-sm'>
                      • {title}
                    </li>
                  ))}
                  {selectedDocumentsInfo.titles.length > 5 && (
                    <li className='text-sm text-muted-foreground'>
                      ... y {selectedDocumentsInfo.titles.length - 5} más
                    </li>
                  )}
                </ul>
              </div>
              <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmBulkDelete}
                disabled={isDeleting}
                className='bg-red-600 hover:bg-red-700'
              >
                {isDeleting ? (
                  <>
                    <IconLoader2 className='h-4 w-4 mr-2 animate-spin' />
                    Borrando...
                  </>
                ) : (
                  'Borrar documentos'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Card>
    )
  },
)

DocumentTable.displayName = 'DocumentTable'
