'use client'
import { IconTrash, IconKey, IconCopy } from '@tabler/icons-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import type { ApiKey, User, Project } from '@/payload-types'
import { DeleteApiKeyDialog } from './DeleteApiKeyDialog'

interface ApiKeysTableProps {
  apiKeys: ApiKey[]
}

export function ApiKeysTable({ apiKeys }: ApiKeysTableProps) {
  // Formatear API Key para display (asteriscos por seguridad visual)
  const formatApiKeyForDisplay = () => {
    return 'pcsk_****************************'
  }

  // Copiar la API Key real al portapapeles
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success('API Key copiada al portapapeles')
    } catch (error) {
      toast.error('Error al copiar la API Key')
    }
  }

  const formatDate = (date: string | Date) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    return dateObj.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatUserName = (user: string | User) => {
    if (typeof user === 'string') return 'Usuario'
    return user.name || user.email
  }

  const formatProjects = (apiKey: ApiKey) => {
    if (apiKey.hasAllProjects) {
      return (
        <Badge variant='secondary' className='bg-blue-100 text-blue-800'>
          Todos los proyectos
        </Badge>
      )
    }

    if (!apiKey.projects || apiKey.projects.length === 0) {
      return (
        <Badge variant='outline' className='text-muted-foreground'>
          Sin proyectos
        </Badge>
      )
    }

    // Si hay proyectos específicos, mostrar los primeros 2 + contador
    const projects = apiKey.projects as Project[]
    const firstTwo = projects.slice(0, 2)
    const remaining = projects.length - 2

    return (
      <div className='flex flex-wrap gap-1'>
        {firstTwo.map((project) => (
          <Badge key={project.id} variant='outline' className='text-xs'>
            {project.title}
          </Badge>
        ))}
        {remaining > 0 && (
          <Badge variant='outline' className='text-xs text-muted-foreground'>
            +{remaining} más
          </Badge>
        )}
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className='flex items-center justify-between'>
          <CardTitle className='flex items-center gap-2'>
            <IconKey className='h-5 w-5' />
            API Keys
          </CardTitle>
          <div className='flex items-center gap-2 text-sm text-muted-foreground'>
            <span>{apiKeys.length} de 10 máximo</span>
            {apiKeys.length >= 10 && (
              <Badge variant='outline' className='text-orange-600 border-orange-200 bg-orange-50'>
                Límite alcanzado
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Desktop Table */}
        <div className='hidden md:block'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Creado el</TableHead>
                <TableHead>Creado por</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Proyectos</TableHead>
                <TableHead className='w-[100px]'>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {apiKeys.map((apiKey) => (
                <TableRow key={apiKey.id}>
                  <TableCell className='font-medium'>{apiKey.name}</TableCell>
                  <TableCell>{formatDate(apiKey.createdAt)}</TableCell>
                  <TableCell>{formatUserName(apiKey.user)}</TableCell>
                  <TableCell>
                    <div className='flex items-center gap-2'>
                      <code className='text-xs bg-muted px-2 py-1 rounded font-mono'>
                        {formatApiKeyForDisplay()}
                      </code>
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={() => copyToClipboard(apiKey.keyValue)}
                        className='h-8 w-8 p-0'
                        title='Copiar API Key'
                      >
                        <IconCopy className='h-4 w-4' />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>{formatProjects(apiKey)}</TableCell>
                  <TableCell>
                    <div className='flex items-center gap-2'>
                      <DeleteApiKeyDialog apiKey={apiKey}>
                        <Button
                          variant='ghost'
                          size='sm'
                          className='h-8 w-8 p-0 text-destructive hover:text-destructive'
                        >
                          <IconTrash className='h-4 w-4' />
                        </Button>
                      </DeleteApiKeyDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Cards */}
        <div className='md:hidden space-y-4'>
          {apiKeys.map((apiKey) => (
            <Card key={apiKey.id} className='p-4'>
              <div className='space-y-3'>
                <div className='flex items-start justify-between'>
                  <div>
                    <h3 className='font-medium'>{apiKey.name}</h3>
                    <p className='text-sm text-muted-foreground'>
                      {formatDate(apiKey.createdAt)} • {formatUserName(apiKey.user)}
                    </p>
                  </div>
                  <DeleteApiKeyDialog apiKey={apiKey}>
                    <Button
                      variant='ghost'
                      size='sm'
                      className='h-8 w-8 p-0 text-destructive hover:text-destructive'
                    >
                      <IconTrash className='h-4 w-4' />
                    </Button>
                  </DeleteApiKeyDialog>
                </div>

                <div className='space-y-2'>
                  <div>
                    <label className='text-xs font-medium text-muted-foreground'>API Key</label>
                    <div className='flex items-center gap-2 mt-1'>
                      <code className='flex-1 text-xs bg-muted px-2 py-1 rounded font-mono break-all'>
                        {formatApiKeyForDisplay()}
                      </code>
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={() => copyToClipboard(apiKey.keyValue)}
                        className='h-8 w-8 p-0 flex-shrink-0'
                        title='Copiar API Key'
                      >
                        <IconCopy className='h-4 w-4' />
                      </Button>
                    </div>
                  </div>

                  <div>
                    <label className='text-xs font-medium text-muted-foreground'>Proyectos</label>
                    <div className='mt-1'>{formatProjects(apiKey)}</div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
