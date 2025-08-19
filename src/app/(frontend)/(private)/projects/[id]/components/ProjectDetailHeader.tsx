'use client'

import { useState, useEffect } from 'react'
import {
  IconUpload,
  IconCopy,
  IconGrid3x3,
  IconList,
  IconEdit,
  IconCheck,
  IconX,
} from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { updateProjectAction } from '@/actions/projects/updateProject'
import { useProjectsStore } from '@/stores/projects-store'
import { DocumentUploadModal } from './DocumentUploadModal'
import type { Project, User, Resource } from '@/payload-types'
import type { DocumentTableRef } from './VideoTable'

interface ProjectDetailHeaderProps {
  project: Project
  user: User
  onResourceUploaded?: (resource: Resource) => void
  onResourceUploadFailed?: (tempResourceId: string) => void
  onResourceAdded?: (resource: Resource) => void
  onUploadComplete?: () => void
  onMultiInvoiceUploadStarted?: (fileName: string) => void
  documentTableRef?: React.RefObject<DocumentTableRef | null>
}

export function ProjectDetailHeader({
  project,
  user,
  onResourceUploaded,
  onResourceUploadFailed,
  onResourceAdded,
  onUploadComplete,
  onMultiInvoiceUploadStarted,
  documentTableRef,
}: ProjectDetailHeaderProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(project.title)
  const [isUpdating, setIsUpdating] = useState(false)
  const [titleError, setTitleError] = useState('')

  const { updateProject } = useProjectsStore()

  // Sincronizar el estado local con el prop project
  useEffect(() => {
    if (!isEditing) {
      setEditTitle(project.title)
    }
  }, [project.title, isEditing])

  const handleCopyId = async () => {
    try {
      // Fallback para navegadores que no soportan clipboard API
      if (!navigator.clipboard) {
        // Crear elemento temporal para fallback
        const textArea = document.createElement('textarea')
        textArea.value = project.id
        textArea.style.position = 'fixed'
        textArea.style.left = '-999999px'
        textArea.style.top = '-999999px'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()

        try {
          document.execCommand('copy')
          toast.success(`Project ID copied to clipboard`, {
            description: `${project.id.slice(0, 12)}...`,
            duration: 3000,
          })
        } catch (err) {
          toast.error('Failed to copy to clipboard', {
            description: 'Your browser does not support clipboard access',
          })
        } finally {
          document.body.removeChild(textArea)
        }
        return
      }

      // Usar clipboard API si está disponible
      await navigator.clipboard.writeText(project.id)
      toast.success('Project ID copied to clipboard', {
        description: `${project.id.slice(0, 12)}...`,
        duration: 3000,
      })
    } catch (error) {
      console.error('Copy to clipboard error:', error)
      toast.error('Failed to copy to clipboard', {
        description: 'Please try again or copy manually',
      })
    }
  }

  const validateTitle = (title: string) => {
    const trimmed = title.trim()
    if (!trimmed) {
      return 'El título es requerido'
    }
    if (trimmed.length < 3) {
      return 'El título debe tener al menos 3 caracteres'
    }
    if (trimmed.length > 100) {
      return 'El título no puede exceder 100 caracteres'
    }
    return ''
  }

  const handleStartEdit = () => {
    setIsEditing(true)
    setEditTitle(project.title)
    setTitleError('')
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditTitle(project.title)
    setTitleError('')
  }

  const handleSaveEdit = async () => {
    const error = validateTitle(editTitle)
    if (error) {
      setTitleError(error)
      return
    }

    if (editTitle.trim() === project.title) {
      setIsEditing(false)
      return
    }

    setIsUpdating(true)
    try {
      const result = await updateProjectAction(project.id, {
        title: editTitle.trim(),
      })

      if (result.success) {
        // Actualizar el store local
        updateProject(project.id, { title: editTitle.trim() })
        toast.success('Project title updated successfully')
        setIsEditing(false)
        setTitleError('')
      } else {
        setTitleError(result.error || 'Failed to update project')
        toast.error(result.error || 'Failed to update project')
      }
    } catch (error) {
      setTitleError('Error interno del servidor')
      toast.error('Error interno del servidor')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit()
    } else if (e.key === 'Escape') {
      handleCancelEdit()
    }
  }

  return (
    <div className='space-y-4'>
      {/* Title and badges */}
      <div className='flex items-center justify-between'>
        <div className='space-y-2 flex-1'>
          {/* Título editable */}
          <div className='flex items-center gap-2 group'>
            {isEditing ? (
              <div className='flex-1 space-y-1'>
                <div className='flex items-center gap-2'>
                  <Input
                    value={editTitle}
                    onChange={(e) => {
                      setEditTitle(e.target.value)
                      // Validación en tiempo real
                      const error = validateTitle(e.target.value)
                      setTitleError(error)
                    }}
                    onKeyDown={handleKeyDown}
                    className={`text-3xl font-bold tracking-tight h-auto py-2 ${
                      titleError ? 'border-red-500' : ''
                    }`}
                    placeholder='Enter project title...'
                    disabled={isUpdating}
                    autoFocus
                  />
                  <div className='flex items-center gap-1'>
                    <Button
                      size='sm'
                      onClick={handleSaveEdit}
                      disabled={isUpdating || !!titleError || !editTitle.trim()}
                      className='h-8 w-8 p-0'
                    >
                      <IconCheck className='h-4 w-4' />
                    </Button>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={handleCancelEdit}
                      disabled={isUpdating}
                      className='h-8 w-8 p-0'
                    >
                      <IconX className='h-4 w-4' />
                    </Button>
                  </div>
                </div>
                {titleError && <p className='text-sm text-red-600'>{titleError}</p>}
              </div>
            ) : (
              <>
                <h1 className='text-3xl font-bold tracking-tight'>{project.title}</h1>
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={handleStartEdit}
                  className='opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0'
                >
                  <IconEdit className='h-4 w-4' />
                </Button>
              </>
            )}
          </div>

          <div className='flex items-center gap-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={handleCopyId}
              className='text-xs font-mono hover:bg-muted transition-colors group'
              title='Click to copy full Project ID'
            >
              <IconCopy className='h-3 w-3 mr-1 group-hover:text-primary transition-colors' />
              <span className='group-hover:text-primary transition-colors'>
                {project.id.slice(0, 8)}...
              </span>
            </Button>
          </div>
        </div>

        <DocumentUploadModal
          project={project}
          onUploadComplete={() => {
            console.log('🎉 [PROJECT-HEADER] Upload completed, triggering refresh...')
            if (onUploadComplete) {
              onUploadComplete()
            }
          }}
          onResourceUploaded={onResourceUploaded}
          onResourceUploadFailed={onResourceUploadFailed}
          onMultiInvoiceUploadStarted={onMultiInvoiceUploadStarted}
          documentTableRef={documentTableRef}
        />
      </div>

      {/* Toolbar */}
      <div className='flex items-center justify-between'></div>
    </div>
  )
}
