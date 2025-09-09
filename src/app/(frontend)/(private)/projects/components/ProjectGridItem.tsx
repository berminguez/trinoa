'use client'
import { IconFileDescription } from '@tabler/icons-react'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { Project } from '@/payload-types'
// import { ConfidenceStats } from '@/components/ui/confidence-badge'
import { useTranslations, useLocale } from 'next-intl'

interface ProjectGridItemProps {
  project: Project
}

export function ProjectGridItem({ project }: ProjectGridItemProps) {
  const [docCount, setDocCount] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(true)
  // Eliminado: estadísticas de confianza no se usan en la vista de proyectos

  const t = useTranslations('projects.item')
  const locale = useLocale()

  useEffect(() => {
    const fetchDocCount = async () => {
      try {
        setIsLoading(true)

        // Realizar llamada a la API para obtener el conteo de recursos del proyecto
        const response = await fetch(`/api/projects/${project.id}/resources/count`)

        if (response.ok) {
          const data = await response.json()
          setDocCount(data.count || 0)
        } else {
          console.error('Error fetching documents count:', response.statusText)
          setDocCount(0)
        }
      } catch (error) {
        console.error('Error fetching documents count:', error)
        setDocCount(0)
      } finally {
        setIsLoading(false)
      }
    }

    fetchDocCount()
  }, [project.id])

  // Polling ligero para refrescar estadísticas de confianza cuando haya documentos en procesamiento
  // Eliminado: polling de estadísticas de confianza

  //

  return (
    <Link href={`/projects/${project.id}`}>
      <Card className='hover:shadow-md transition-shadow cursor-pointer'>
        <CardContent className='px-6 py-4'>
          <h3 className='font-semibold text-lg mb-2 truncate'>{project.title}</h3>
          <div className='flex justify-between items-center text-sm text-muted-foreground'>
            <div className='flex items-center gap-1'>
              <IconFileDescription className='h-4 w-4' />
              <span>{isLoading ? '...' : t('documents', { count: docCount })}</span>
            </div>
            <span>{new Date(project.createdAt).toLocaleDateString(locale)}</span>
          </div>

          {/* Eliminadas estadísticas de confianza en la vista de proyectos */}
        </CardContent>
      </Card>
    </Link>
  )
}
