import { create } from 'zustand'
import { canBeVerified } from '@/lib/utils/calculateResourceConfidence'

interface ResourceVerificationState {
  // Estado de verificación por recurso
  verificationStatus: Record<string, boolean>

  // Estado de carga
  isChecking: Record<string, boolean>

  // Acciones
  checkCanVerify: (resourceId: string) => Promise<void>
  setCanVerify: (resourceId: string, canVerify: boolean) => void
  clearResource: (resourceId: string) => void
}

const useResourceVerificationStore = create<ResourceVerificationState>((set, get) => ({
  verificationStatus: {},
  isChecking: {},

  checkCanVerify: async (resourceId: string) => {
    const { verificationStatus, isChecking } = get()

    // Evitar múltiples verificaciones simultáneas del mismo recurso
    if (isChecking[resourceId]) {
      return
    }

    try {
      // Marcar como verificando
      set({
        isChecking: { ...isChecking, [resourceId]: true },
      })

      // Obtener datos actuales del recurso
      const response = await fetch(`/api/resources/${resourceId}?depth=0`)
      const resource = await response.json()

      // Obtener threshold de configuración
      const configResponse = await fetch('/api/globals/configuracion')
      const config = await configResponse.json()
      const threshold = config?.confidenceSettings?.confidenceThreshold ?? 70

      // Obtener campos obligatorios
      const translationsResponse = await fetch('/api/field-translations?limit=1000&sort=order')
      const translationsData = await translationsResponse.json()
      const requiredFieldNames =
        translationsData?.docs?.filter((d: any) => d?.isRequired)?.map((d: any) => d.key) || []

      // Verificar si puede ser verificado
      const canVerifyResource = canBeVerified(resource, threshold, { requiredFieldNames })

      // Actualizar estado
      set({
        verificationStatus: { ...verificationStatus, [resourceId]: canVerifyResource },
        isChecking: { ...get().isChecking, [resourceId]: false },
      })
    } catch (error) {
      console.error('Error checking if resource can be verified:', error)
      set({
        verificationStatus: { ...verificationStatus, [resourceId]: false },
        isChecking: { ...get().isChecking, [resourceId]: false },
      })
    }
  },

  setCanVerify: (resourceId: string, canVerify: boolean) => {
    const { verificationStatus } = get()
    set({
      verificationStatus: { ...verificationStatus, [resourceId]: canVerify },
    })
  },

  clearResource: (resourceId: string) => {
    const { verificationStatus, isChecking } = get()
    const newVerificationStatus = { ...verificationStatus }
    const newIsChecking = { ...isChecking }

    delete newVerificationStatus[resourceId]
    delete newIsChecking[resourceId]

    set({
      verificationStatus: newVerificationStatus,
      isChecking: newIsChecking,
    })
  },
}))

export default useResourceVerificationStore
