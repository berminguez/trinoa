import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface VisualizadorState {
  hasUnsavedChanges: boolean
  splitSize: number // porcentaje del panel izquierdo
  setUnsavedChanges: (value: boolean) => void
  setSplitSize: (value: number) => void
}

export const useVisualizadorStore = create<VisualizadorState>()(
  persist(
    (set) => ({
      hasUnsavedChanges: false,
      splitSize: 50,
      setUnsavedChanges: (value) => set({ hasUnsavedChanges: value }),
      setSplitSize: (value) => set({ splitSize: value }),
    }),
    { name: 'visualizador-store' },
  ),
)

export default useVisualizadorStore
