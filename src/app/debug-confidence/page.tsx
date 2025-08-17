'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { updateResourceConfidence } from '@/actions/resources/updateResourceConfidence'

// Server action para obtener detalles del recurso
async function getResourceDetails(resourceId: string) {
  'use server'
  
  const { getPayload } = await import('payload')
  const config = (await import('@/payload.config')).default
  const { calculateResourceConfidence, getConfidenceThreshold } = await import('@/lib/utils/calculateResourceConfidence')
  
  try {
    const payload = await getPayload({ config })
    
    const resource = await payload.findByID({
      collection: 'resources',
      id: resourceId,
      depth: 0,
      overrideAccess: true,
    })

    if (!resource) {
      return { error: 'Recurso no encontrado' }
    }

    const threshold = await getConfidenceThreshold(payload)
    const calculatedConfidence = calculateResourceConfidence(resource, threshold)
    
    // Analizar campos
    const analyzeResult = (resource as any).analyzeResult
    const fields = analyzeResult?.fields || {}
    const fieldNames = Object.keys(fields)
    
    const fieldAnalysis = fieldNames.map(fieldName => {
      const field = fields[fieldName]
      return {
        name: fieldName,
        confidence: field.confidence,
        manual: field.manual === true,
        value: field.valueString || field.content || '',
        isBelowThreshold: field.confidence < (threshold / 100)
      }
    })

    return {
      success: true,
      data: {
        resourceId,
        title: resource.title,
        currentConfidence: resource.confidence,
        calculatedConfidence,
        threshold,
        fieldsCount: fieldNames.length,
        fieldAnalysis
      }
    }
  } catch (error) {
    return { error: String(error) }
  }
}

export default function DebugConfidencePage() {
  const [result, setResult] = useState<any>(null)
  const [details, setDetails] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const resourceId = '68a19927e6dbeb2d1a08e4a5'

  const handleTest = async () => {
    setLoading(true)
    setResult(null)
    
    try {
      const updateResult = await updateResourceConfidence(resourceId)
      setResult(updateResult)
    } catch (error) {
      setResult({ error: String(error) })
    } finally {
      setLoading(false)
    }
  }

  const handleGetDetails = async () => {
    setLoading(true)
    setDetails(null)
    
    try {
      const detailsResult = await getResourceDetails(resourceId)
      setDetails(detailsResult)
    } catch (error) {
      setDetails({ error: String(error) })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Debug Confidence Update</h1>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Test Resource: {resourceId}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleGetDetails} disabled={loading}>
            {loading ? 'Analizando...' : 'Analizar estado actual'}
          </Button>
          
          <Button onClick={handleTest} disabled={loading} variant="outline">
            {loading ? 'Probando...' : 'Forzar actualización de confidence'}
          </Button>
        </CardContent>
      </Card>

      {details && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Análisis Detallado</CardTitle>
          </CardHeader>
          <CardContent>
            {details.error ? (
              <p className="text-red-600">Error: {details.error}</p>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><strong>Título:</strong> {details.data.title}</div>
                  <div><strong>Threshold:</strong> {details.data.threshold}%</div>
                  <div><strong>Confidence actual:</strong> <span className="font-mono">{details.data.currentConfidence}</span></div>
                  <div><strong>Confidence calculado:</strong> <span className="font-mono">{details.data.calculatedConfidence}</span></div>
                  <div><strong>Campos totales:</strong> {details.data.fieldsCount}</div>
                  <div><strong>¿Inconsistente?:</strong> {details.data.currentConfidence !== details.data.calculatedConfidence ? '⚠️ SÍ' : '✅ NO'}</div>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">Análisis de Campos:</h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {details.data.fieldAnalysis.map((field: any, idx: number) => (
                      <div key={idx} className="text-xs p-2 border rounded bg-gray-50">
                        <div className="font-medium">{field.name}</div>
                        <div className="grid grid-cols-4 gap-2 mt-1">
                          <div>Confianza: <span className={field.isBelowThreshold ? 'text-red-600' : 'text-green-600'}>{(field.confidence * 100).toFixed(1)}%</span></div>
                          <div>Manual: {field.manual ? '✅' : '❌'}</div>
                          <div>Bajo threshold: {field.isBelowThreshold ? '🔴' : '🟢'}</div>
                          <div className="truncate">Valor: "{field.value.substring(0, 20)}..."</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Resultado de Actualización</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
