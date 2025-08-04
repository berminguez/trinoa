'use client'
import { IconFolder, IconVideo } from '@tabler/icons-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { getPayload } from 'payload'
import config from '@payload-config'
import type { Project } from '@/payload-types'

interface ProjectGridItemProps {
  project: Project
}

export function ProjectGridItem({ project }: ProjectGridItemProps) {
  const [videoCount, setVideoCount] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchVideoCount = async () => {
      try {
        setIsLoading(true)

        // Realizar llamada a la API para obtener el conteo de recursos del proyecto
        const response = await fetch(`/api/projects/${project.id}/resources/count`)

        if (response.ok) {
          const data = await response.json()
          setVideoCount(data.count || 0)
        } else {
          console.error('Error fetching video count:', response.statusText)
          setVideoCount(0)
        }
      } catch (error) {
        console.error('Error fetching video count:', error)
        setVideoCount(0)
      } finally {
        setIsLoading(false)
      }
    }

    fetchVideoCount()
  }, [project.id])

  return (
    <Link href={`/projects/${project.id}`}>
      <Card className='hover:shadow-md transition-shadow cursor-pointer'>
        <CardHeader className='p-0'>
          {/* Thumbnail placeholder */}
          <div className='h-48 w-full bg-muted rounded-t-lg flex items-center justify-center'>
            <IconFolder className='h-12 w-12 text-muted-foreground' />
          </div>
        </CardHeader>
        <CardContent className='p-4'>
          <h3 className='font-semibold text-lg mb-2 truncate'>{project.title}</h3>
          <div className='flex justify-between items-center text-sm text-muted-foreground'>
            <div className='flex items-center gap-1'>
              <IconVideo className='h-4 w-4' />
              <span>{isLoading ? '...' : `${videoCount} video${videoCount !== 1 ? 's' : ''}`}</span>
            </div>
            <span>{new Date(project.createdAt).toLocaleDateString()}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
