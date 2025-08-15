'use server'

import { getPayload } from 'payload'
import config from '@payload-config'
import { getCurrentUser } from '@/actions/auth/getUser'
import { createPreResourceFromUpload } from './createPreResourceFromUpload'
import { processPreResource } from './processPreResource'
import { createDerivedResources } from './createDerivedResources'

interface RunPipelineResult {
  success: boolean
  data?: { preResourceId: string; resourceIds?: string[] }
  error?: string
}

export async function runSplitterPipeline(formData: FormData): Promise<RunPipelineResult> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Usuario no autenticado' }

    const projectId = String(formData.get('projectId') || '')
    const file = formData.get('file') as File | null
    if (!projectId || !file) return { success: false, error: 'Parámetros insuficientes' }

    const payload = await getPayload({ config })

    // Paso 1: Subir + crear pre-resource
    const preRes = await createPreResourceFromUpload(formData)
    if (!preRes.success || !preRes.data)
      return { success: false, error: preRes.error || 'Error en pre-resource' }

    const preId = String(preRes.data.preResource.id)

    // Paso 2: Llamar Splitter y guardar pages
    const proc = await processPreResource({ preResourceId: preId })
    if (!proc.success) return { success: false, error: proc.error || 'Error procesando Splitter' }

    // Paso 3: Dividir PDF y crear resources
    const derived = await createDerivedResources({ preResourceId: preId })
    if (!derived.success)
      return { success: false, error: derived.error || 'Error creando resources' }

    return { success: true, data: { preResourceId: preId, resourceIds: derived.data?.resourceIds } }
  } catch (error) {
    console.error('[SPLITTER] runSplitterPipeline error:', error)
    return { success: false, error: 'Error en pipeline Splitter' }
  }
}
