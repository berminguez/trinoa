'use client'
import { CreateApiKeyModal } from './CreateApiKeyModal'
import type { User } from '@/payload-types'

interface ApiKeysHeaderProps {
  user: User
}

export function ApiKeysHeader({ user }: ApiKeysHeaderProps) {
  return (
    <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
      <div className='space-y-1'>
        <h1 className='text-2xl sm:text-3xl font-bold tracking-tight'>API Keys</h1>
        <p className='text-muted-foreground text-sm sm:text-base'>
          Gestiona tus API Keys para conectar servicios externos mediante MCP
        </p>
      </div>

      <div className='flex-shrink-0'>
        <CreateApiKeyModal />
      </div>
    </div>
  )
}
