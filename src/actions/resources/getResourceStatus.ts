'use server'

import { getCurrentUser } from '@/actions/auth/getUser'
import { getPayload } from 'payload'
import config from '@/payload.config'
import type { Resource } from '@/payload-types'

export interface GetResourceStatusResult {
  success: boolean
  status?: Resource['status']
  resource?: Pick<Resource, 'id' | 'status' | 'caso' | 'tipo' | 'nombre_cliente'> &
    Record<string, any>
  error?: string
}

export async function getResourceStatusAction(
  resourceId: string,
): Promise<GetResourceStatusResult> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'UNAUTHENTICATED' }

    const payload = await getPayload({ config })
    const resource = (await payload.findByID({
      collection: 'resources',
      id: resourceId,
      depth: 0,
      user,
    })) as Resource | null

    if (!resource) return { success: false, error: 'NOT_FOUND' }

    // Devolver además de status, un subconjunto útil para rehidratar el formulario
    const subset: any = {
      id: resource.id,
      status: resource.status,
      caso: (resource as any).caso ?? null,
      tipo: (resource as any).tipo ?? null,
      nombre_cliente: (resource as any).nombre_cliente ?? '',
    }
    const active = subset.caso as string | null
    if (active && typeof (resource as any)[active] === 'object') {
      subset[active] = (resource as any)[active]
    }

    return { success: true, status: resource.status, resource: subset }
  } catch (error) {
    console.error('[GET_RESOURCE_STATUS] Error:', error)
    return { success: false, error: 'INTERNAL_ERROR' }
  }
}

export default getResourceStatusAction
