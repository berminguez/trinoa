'use client'
import { IconKey } from '@tabler/icons-react'
import { Card, CardContent } from '@/components/ui/card'
import { CreateApiKeyModal } from './CreateApiKeyModal'

export function ApiKeysEmptyState() {
  return (
    <Card className='border-dashed'>
      <CardContent className='flex flex-col items-center justify-center py-12'>
        <div className='flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4'>
          <IconKey className='h-6 w-6 text-muted-foreground' />
        </div>
        <h3 className='text-lg font-semibold mb-2'>No tienes API Keys</h3>
        <p className='text-muted-foreground text-center mb-6 max-w-md'>
          Crea tu primera API Key para conectar servicios externos mediante MCP o API y acceder a la
          información de tus proyectos
        </p>
        <CreateApiKeyModal />
      </CardContent>
    </Card>
  )
}
