import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface VisualizadorState {
  hasUnsavedChanges: boolean
  splitSize: number // porcentaje del panel izquierdo
  isProcessing: boolean
  setUnsavedChanges: (value: boolean) => void
  setSplitSize: (value: number) => void
  setIsProcessing: (value: boolean) => void
}

export const useVisualizadorStore = create<VisualizadorState>()(
  persist(
    (set) => ({
      hasUnsavedChanges: false,
      splitSize: 50,
      isProcessing: false,
      setUnsavedChanges: (value) => set({ hasUnsavedChanges: value }),
      setSplitSize: (value) => set({ splitSize: value }),
      setIsProcessing: (value) => set({ isProcessing: value }),
    }),
    { name: 'visualizador-store' },
  ),
)

export default useVisualizadorStore
