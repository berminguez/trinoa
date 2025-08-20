'use client'

import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useRouter, useSearchParams } from 'next/navigation'

interface AdminClientSelectorProps {
  clients: { id: string; name: string }[]
  value?: string
}

export default function AdminClientSelector({ clients, value }: AdminClientSelectorProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  return (
    <div className='flex flex-col gap-1 max-w-sm'>
      <Label>Cliente</Label>
      <Select
        value={value || 'actual'}
        onValueChange={(v) => {
          const params = new URLSearchParams(searchParams?.toString() || '')
          if (v === 'actual') params.delete('clientId')
          else
            params.set('clientId', v)
            // Reiniciar filtros al cambiar cliente
          ;['page', 'projectId', 'from', 'to', 'tipo', 'caso', 'provider'].forEach((k) =>
            params.delete(k),
          )
          const qs = params.toString()
          router.push(`/analytics${qs ? `?${qs}` : ''}`)
        }}
      >
        <SelectTrigger className='w-full'>
          <SelectValue placeholder='Cliente' />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='actual'>Mis documentos</SelectItem>
          {clients.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
