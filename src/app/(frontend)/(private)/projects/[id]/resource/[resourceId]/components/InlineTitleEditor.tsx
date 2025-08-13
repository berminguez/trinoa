'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { updateResourceAction } from '@/actions/resources/updateResource'

interface InlineTitleEditorProps {
  projectId: string
  resourceId: string
  initialTitle: string
}

export default function InlineTitleEditor({
  projectId,
  resourceId,
  initialTitle,
}: InlineTitleEditorProps) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [displayTitle, setDisplayTitle] = useState(initialTitle)
  const [draft, setDraft] = useState(initialTitle)
  const [submitting, setSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)

  // Sincroniza con cambios del servidor, pero no dependemos del estado de edición
  useEffect(() => {
    setDisplayTitle(initialTitle)
    setDraft(initialTitle)
  }, [initialTitle])

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const canSave = useMemo(() => {
    const t = draft.trim()
    return t.length > 0 && t !== displayTitle
  }, [draft, displayTitle])

  const handleSave = useCallback(async () => {
    const next = draft.trim()
    if (!next) {
      toast.error('El título no puede estar vacío')
      return
    }
    if (next === displayTitle) {
      setIsEditing(false)
      return
    }
    try {
      setSubmitting(true)
      const res = await updateResourceAction(projectId, resourceId, { title: next })
      if (!res.success) {
        toast.error(res.error || 'No se pudo actualizar el título')
        return
      }
      setDisplayTitle(next)
      setIsEditing(false)
      toast.success('Título actualizado')
      router.refresh()
    } catch (e) {
      toast.error('Error al actualizar el título')
    } finally {
      setSubmitting(false)
    }
  }, [draft, displayTitle, projectId, resourceId])

  if (!isEditing) {
    return (
      <button
        type='button'
        className='text-left w-full group'
        onClick={() => setIsEditing(true)}
        aria-label='Editar título'
      >
        <h2 className='text-base font-semibold leading-none tracking-tight mb-2'>{displayTitle}</h2>
      </button>
    )
  }

  return (
    <div className='mb-2 space-y-2'>
      <Input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            void handleSave()
          }
          if (e.key === 'Escape') {
            e.preventDefault()
            setDraft(displayTitle)
            setIsEditing(false)
          }
        }}
        className='text-base font-semibold leading-none tracking-tight'
        aria-label='Título del documento'
      />
      <div className='flex items-center gap-2'>
        <Button size='sm' onClick={() => void handleSave()} disabled={!canSave || submitting}>
          Guardar
        </Button>
        <Button
          size='sm'
          variant='outline'
          onClick={() => {
            setDraft(displayTitle)
            setIsEditing(false)
          }}
          disabled={submitting}
        >
          Cancelar
        </Button>
      </div>
    </div>
  )
}
