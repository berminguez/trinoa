'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ClientsFilters } from '@/actions/clients/types'

interface ClientsState {
  // Estado actual de filtros
  filters: ClientsFilters

  // Estado de UI
  isLoading: boolean

  // Actions para actualizar filtros
  setSearchTerm: (searchTerm: string) => void
  setSortBy: (sortBy: ClientsFilters['sortBy']) => void
  setSortOrder: (sortOrder: ClientsFilters['sortOrder']) => void
  setRole: (role: ClientsFilters['role']) => void
  setDateRange: (dateFrom?: string, dateTo?: string) => void
  setPage: (page: number) => void

  // Actions para reset y estado
  resetFilters: () => void
  setLoading: (loading: boolean) => void

  // Helper para generar URL search params
  getSearchParams: () => URLSearchParams

  // Helper para aplicar filtros desde URL
  applyFromSearchParams: (searchParams: URLSearchParams) => void
}

const defaultFilters: ClientsFilters = {
  searchTerm: '',
  sortBy: 'createdAt',
  sortOrder: 'desc',
  page: 1,
  limit: 12,
  role: undefined,
  dateFrom: undefined,
  dateTo: undefined,
}

export const useClientsStore = create<ClientsState>()(
  persist(
    (set, get) => ({
      // Estado inicial
      filters: defaultFilters,
      isLoading: false,

      // Actions para filtros individuales
      setSearchTerm: (searchTerm) =>
        set((state) => ({
          filters: { ...state.filters, searchTerm, page: 1 }, // Reset page on search
        })),

      setSortBy: (sortBy) =>
        set((state) => ({
          filters: { ...state.filters, sortBy, page: 1 }, // Reset page on sort change
        })),

      setSortOrder: (sortOrder) =>
        set((state) => ({
          filters: { ...state.filters, sortOrder, page: 1 }, // Reset page on sort change
        })),

      setRole: (role) =>
        set((state) => ({
          filters: { ...state.filters, role, page: 1 }, // Reset page on filter change
        })),

      setDateRange: (dateFrom, dateTo) =>
        set((state) => ({
          filters: { ...state.filters, dateFrom, dateTo, page: 1 }, // Reset page on filter change
        })),

      setPage: (page) =>
        set((state) => ({
          filters: { ...state.filters, page },
        })),

      // Actions para reset y estado
      resetFilters: () =>
        set({
          filters: defaultFilters,
        }),

      setLoading: (isLoading) => set({ isLoading }),

      // Helper para generar search params
      getSearchParams: () => {
        const { filters } = get()
        const params = new URLSearchParams()

        if (filters.searchTerm) params.set('search', filters.searchTerm)
        if (filters.sortBy && filters.sortBy !== 'createdAt') params.set('sortBy', filters.sortBy)
        if (filters.sortOrder && filters.sortOrder !== 'desc')
          params.set('sortOrder', filters.sortOrder)
        if (filters.page && filters.page > 1) params.set('page', filters.page.toString())
        if (filters.role) params.set('role', filters.role)
        if (filters.dateFrom) params.set('dateFrom', filters.dateFrom)
        if (filters.dateTo) params.set('dateTo', filters.dateTo)

        return params
      },

      // Helper para aplicar desde URL
      applyFromSearchParams: (searchParams) => {
        const newFilters: ClientsFilters = {
          searchTerm: searchParams.get('search') || '',
          sortBy: (searchParams.get('sortBy') as any) || 'createdAt',
          sortOrder: (searchParams.get('sortOrder') as any) || 'desc',
          page: parseInt(searchParams.get('page') || '1'),
          limit: 12,
          role: searchParams.get('role') as any,
          dateFrom: searchParams.get('dateFrom') || undefined,
          dateTo: searchParams.get('dateTo') || undefined,
        }

        set({ filters: newFilters })
      },
    }),
    {
      name: 'clients-store',
      // Solo persistir filtros básicos, no estado temporal
      partialize: (state) => ({
        filters: {
          sortBy: state.filters.sortBy,
          sortOrder: state.filters.sortOrder,
          role: state.filters.role,
        },
      }),
    },
  ),
)
