'use client'

import * as React from 'react'

type FieldsRecord = Record<string, any>

function getConfidenceColor(conf?: number): string {
  if (typeof conf !== 'number') return '#6b7280' // gray
  if (conf >= 0.8) return '#10b981' // green
  if (conf >= 0.7) return '#f59e0b' // amber
  return '#ef4444' // red
}

function asString(val: any): string {
  if (!val || typeof val !== 'object') return ''
  if (typeof val.valueString === 'string') return val.valueString
  if (typeof val.content === 'string') return val.content
  return ''
}

export function AnalyzeFieldsEditor() {
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState<string | null>(null)
  const [apiVersion, setApiVersion] = React.useState<string | undefined>(undefined)
  const [content, setContent] = React.useState<string | undefined>(undefined)
  const [confidence, setConfidence] = React.useState<number | undefined>(undefined)
  const [fields, setFields] = React.useState<FieldsRecord>({})

  const resourceId = React.useMemo(() => {
    try {
      const parts = window.location.pathname.split('/').filter(Boolean)
      const idx = parts.findIndex((p) => p === 'resources')
      if (idx >= 0 && parts[idx + 1]) return parts[idx + 1]
    } catch {}
    return ''
  }, [])

  const load = React.useCallback(async () => {
    setError(null)
    setSuccess(null)
    if (!resourceId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/resources/${resourceId}?depth=0`)
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`)
      const ar = (data?.analyzeResult || {}) as any
      setApiVersion(ar?.apiVersion)
      setContent(ar?.content)
      setConfidence(typeof ar?.confidence === 'number' ? ar.confidence : undefined)
      setFields(ar?.fields && typeof ar.fields === 'object' ? ar.fields : {})
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [resourceId])

  React.useEffect(() => {
    load()
  }, [load])

  const handleChange = (key: string, newValue: string) => {
    setFields((prev) => {
      const current = prev[key] || {}
      return {
        ...prev,
        [key]: {
          ...current,
          valueString: newValue,
          content: newValue,
        },
      }
    })
  }

  const handleSave = async () => {
    if (!resourceId) return
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const updated = {
        apiVersion,
        content,
        confidence,
        fields,
      }
      const res = await fetch(`/api/resources/${resourceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analyzeResult: updated }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`)
      setSuccess('Guardado correctamente')
    } catch (e) {
      setError(String(e))
    } finally {
      setSaving(false)
    }
  }

  const entries = Object.entries(fields || {})

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <strong>Campos detectados (editable)</strong>
        <button type='button' onClick={load} disabled={loading} style={{ padding: '4px 8px' }}>
          {loading ? 'Cargando…' : 'Recargar'}
        </button>
      </div>

      {typeof apiVersion !== 'undefined' && (
        <div style={{ fontSize: 12, color: '#6b7280' }}>apiVersion: {String(apiVersion)}</div>
      )}
      {typeof content !== 'undefined' && (
        <div style={{ fontSize: 12, color: '#6b7280' }}>
          content: {String(content).slice(0, 140)}
          {String(content || '').length > 140 ? '…' : ''}
        </div>
      )}
      {typeof confidence !== 'undefined' && (
        <div style={{ fontSize: 12, color: getConfidenceColor(confidence) }}>
          confianza general: {Math.round(confidence * 100)}%
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {entries.length === 0 && !loading && (
          <div style={{ fontSize: 13, color: '#6b7280' }}>No hay campos en analyzeResult.</div>
        )}
        {entries.map(([key, val]) => {
          const value = asString(val)
          const conf = typeof val?.confidence === 'number' ? val.confidence : undefined
          return (
            <div key={key} style={{ border: '1px solid #e5e7eb', borderRadius: 6, padding: 10 }}>
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}
              >
                <label style={{ fontWeight: 600 }}>{key}</label>
                {typeof conf !== 'undefined' && (
                  <span style={{ fontSize: 12, color: getConfidenceColor(conf) }}>
                    {Math.round(conf * 100)}%
                  </span>
                )}
              </div>
              <input
                type='text'
                defaultValue={value}
                onChange={(e) => handleChange(key, e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  marginTop: 6,
                  border: '1px solid #d1d5db',
                  borderRadius: 4,
                }}
              />
              {typeof conf !== 'undefined' && (
                <div style={{ fontSize: 12, marginTop: 4, color: getConfidenceColor(conf) }}>
                  Índice de confianza
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type='button'
          onClick={handleSave}
          disabled={saving || loading}
          style={{ padding: '6px 10px' }}
        >
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>

      {error && <div style={{ color: '#ef4444', fontSize: 13 }}>{error}</div>}
      {success && <div style={{ color: '#10b981', fontSize: 13 }}>{success}</div>}
    </div>
  )
}

export default AnalyzeFieldsEditor
