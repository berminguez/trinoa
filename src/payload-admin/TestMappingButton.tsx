'use client'

import * as React from 'react'

export function TestMappingButton({ resourceId }: { resourceId?: string }) {
  const [loading, setLoading] = React.useState(false)
  const [result, setResult] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  const resolvedId = React.useMemo(() => {
    if (resourceId && String(resourceId).length > 0) return String(resourceId)
    if (typeof window !== 'undefined') {
      try {
        const parts = window.location.pathname.split('/').filter(Boolean)
        // /admin/collections/resources/[id]
        const idx = parts.findIndex((p) => p === 'resources')
        if (idx >= 0 && parts[idx + 1]) return parts[idx + 1]
      } catch {}
    }
    return ''
  }, [resourceId])

  const handleClick = async () => {
    try {
      setLoading(true)
      setResult(null)
      setError(null)
      if (!resolvedId) throw new Error('No se pudo resolver el ID del recurso')
      const res = await fetch(`/api/resources/${resolvedId}/test-mapping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json()
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || `HTTP ${res.status}`)
      }
      setResult(JSON.stringify(data.data?.mapped ?? {}, null, 2))
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <button
        type='button'
        onClick={handleClick}
        disabled={loading}
        style={{ padding: '6px 10px' }}
      >
        {loading ? 'Probando mapeo…' : 'Probar mapeo (usa analyzeResult guardado)'}
      </button>
      <button
        type='button'
        onClick={async () => {
          try {
            setLoading(true)
            setResult(null)
            setError(null)
            if (!resolvedId) throw new Error('No se pudo resolver el ID del recurso')
            const res = await fetch(`/api/resources/${resolvedId}/test-mapping`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ apply: true }),
            })
            const data = await res.json()
            if (!res.ok || !data?.success) throw new Error(data?.error || `HTTP ${res.status}`)
            setResult(`Aplicado: ${JSON.stringify(data.data?.applied ?? [], null, 2)}`)
          } catch (e) {
            setError(String(e))
          } finally {
            setLoading(false)
          }
        }}
        disabled={loading}
        style={{ padding: '6px 10px' }}
      >
        {loading ? 'Aplicando…' : 'Aplicar mapeo y guardar'}
      </button>
      {result && (
        <pre style={{ whiteSpace: 'pre-wrap', background: '#f5f5f5', padding: 8, borderRadius: 6 }}>
          {result}
        </pre>
      )}
      {error && <div style={{ color: 'red' }}>{error}</div>}
    </div>
  )
}
