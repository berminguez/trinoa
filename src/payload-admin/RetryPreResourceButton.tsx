'use client'

import * as React from 'react'

export function RetryPreResourceButton({ preResourceId }: { preResourceId?: string }) {
  const [loading, setLoading] = React.useState(false)
  const [message, setMessage] = React.useState<string | null>(null)

  const resolvedId = React.useMemo(() => {
    if (preResourceId && String(preResourceId).length > 0) return String(preResourceId)
    if (typeof window !== 'undefined') {
      try {
        const parts = window.location.pathname.split('/').filter(Boolean)
        const idx = parts.findIndex((p) => p === 'pre-resources')
        if (idx >= 0 && parts[idx + 1]) return parts[idx + 1]
      } catch {}
    }
    return ''
  }, [preResourceId])

  const handleRetry = async () => {
    try {
      setLoading(true)
      setMessage(null)
      if (!resolvedId) throw new Error('No se pudo resolver el ID')
      const res = await fetch(`/api/pre-resources/${resolvedId}/retry`, {
        method: 'POST',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || data?.success === false) throw new Error(data?.error || `HTTP ${res.status}`)
      setMessage('Reintento encolado/procesado correctamente')
    } catch (e) {
      setMessage(`Error: ${String(e)}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <button
        type='button'
        onClick={handleRetry}
        disabled={loading}
        style={{ padding: '6px 10px' }}
      >
        {loading ? 'Reintentando…' : 'Reintentar Splitter'}
      </button>
      {message && <div style={{ fontSize: 12 }}>{message}</div>}
    </div>
  )
}
