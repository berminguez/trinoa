'use client'
import { IconFolder, IconFileDescription } from '@tabler/icons-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { Project } from '@/payload-types'
import { ConfidenceStats } from '@/components/ui/confidence-badge'

interface ProjectGridItemProps {
  project: Project
}

export function ProjectGridItem({ project }: ProjectGridItemProps) {
  const [docCount, setDocCount] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(true)
  const [confidenceStats, setConfidenceStats] = useState<{
    total: number
    empty?: number
    needs_revision?: number
    trusted?: number
    verified?: number
  } | null>(null)

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
  useEffect(() => {
    let isCancelled = false

    const fetchConfidenceStats = async () => {
      try {
        const response = await fetch(`/api/projects/${project.id}/resources/confidence`, {
          cache: 'no-store',
          credentials: 'include',
        })
        if (!response.ok) return
        const data = await response.json()
        if (isCancelled) return
        setConfidenceStats({
          total: data.total || 0,
          empty: data.empty || 0,
          needs_revision: data.needs_revision || 0,
          trusted: data.trusted || 0,
          verified: data.verified || 0,
        })
        setDocCount(data.total || 0)
      } catch {}
    }

    // Primera carga
    fetchConfidenceStats()

    // Intervalo: 2s si hay documentos en processing, 6s si no
    const interval = setInterval(fetchConfidenceStats, 3000)
    return () => {
      isCancelled = true
      clearInterval(interval)
    }
  }, [project.id])

  return (
    <Link href={`/projects/${project.id}`}>
      <Card className='hover:shadow-md transition-shadow cursor-pointer'>
        <CardContent className='px-6 py-4'>
          <h3 className='font-semibold text-lg mb-2 truncate'>{project.title}</h3>
          <div className='flex justify-between items-center text-sm text-muted-foreground'>
            <div className='flex items-center gap-1'>
              <IconFileDescription className='h-4 w-4' />
              <span>{isLoading ? '...' : `${docCount} documento${docCount !== 1 ? 's' : ''}`}</span>
            </div>
            <span>{new Date(project.createdAt).toLocaleDateString('es-ES')}</span>
          </div>

          {/* Stats de confianza si hay datos */}
          {confidenceStats && confidenceStats.total > 0 && (
            <div className='mt-3'>
              <ConfidenceStats
                stats={{
                  empty: confidenceStats.empty,
                  needs_revision: confidenceStats.needs_revision,
                  trusted: confidenceStats.trusted,
                  verified: confidenceStats.verified,
                }}
                total={confidenceStats.total}
                className='justify-start flex-wrap gap-1'
                showPercentages={false}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
