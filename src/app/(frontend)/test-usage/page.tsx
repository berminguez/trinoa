'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function TestUsagePage() {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any[]>([])

  const testVideoUsage = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/test-usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'video', quantity: 1 }),
      })
      const result = await response.json()
      setResults((prev) => [
        ...prev,
        {
          time: new Date().toLocaleTimeString(),
          action: 'Video +1',
          result,
        },
      ])
    } catch (error) {
      console.error('Error:', error)
    }
    setLoading(false)
  }

  const testStorageUsage = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/test-usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'storage', quantity: 0.5 }),
      })
      const result = await response.json()
      setResults((prev) => [
        ...prev,
        {
          time: new Date().toLocaleTimeString(),
          action: 'Storage +0.5GB',
          result,
        },
      ])
    } catch (error) {
      console.error('Error:', error)
    }
    setLoading(false)
  }

  return (
    <div className='container mx-auto px-4 py-8'>
      <h1 className='text-3xl font-bold mb-6'>🧪 Test de Facturación Medida</h1>

      <div className='grid gap-4 mb-6'>
        <Card>
          <CardHeader>
            <CardTitle>Simular Uso</CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            <Button onClick={testVideoUsage} disabled={loading} className='w-full'>
              📹 Procesar 1 Video (+€0.50 si excede límite)
            </Button>

            <Button onClick={testStorageUsage} disabled={loading} className='w-full'>
              💾 Añadir 0.5GB Storage (+€0.05 si excede límite)
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Resultados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='space-y-2'>
            {results.map((item, index) => (
              <div key={index} className='p-2 bg-gray-50 rounded text-sm'>
                <strong>{item.time}</strong> - {item.action}
                <pre className='mt-1 text-xs overflow-auto'>
                  {JSON.stringify(item.result, null, 2)}
                </pre>
              </div>
            ))}
            {results.length === 0 && (
              <p className='text-gray-500'>
                No hay resultados aún. Haz click en los botones arriba.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
