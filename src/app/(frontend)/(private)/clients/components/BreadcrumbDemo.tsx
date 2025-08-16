'use client'

import { AdminBreadcrumb } from '@/components/admin-breadcrumb'

/**
 * Componente de demostración para mostrar el uso del AdminBreadcrumb
 */
export function BreadcrumbDemo() {
  return (
    <div className='space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200'>
      <h3 className='text-sm font-semibold text-blue-900'>
        ✅ Tarea 3.3 Completada: AdminBreadcrumb
      </h3>

      <div className='space-y-3'>
        <p className='text-sm text-blue-800'>
          <strong>Breadcrumb automático basado en la URL actual:</strong>
        </p>

        <div className='bg-white p-3 rounded border'>
          <AdminBreadcrumb />
        </div>

        <div className='text-xs text-blue-700 space-y-1'>
          <p>
            <strong>Funcionalidades implementadas:</strong>
          </p>
          <ul className='list-disc list-inside space-y-1 ml-2'>
            <li>Generación automática desde URL</li>
            <li>Breadcrumbs predefinidos para rutas comunes</li>
            <li>Colapso inteligente para rutas largas</li>
            <li>Iconos contextuales (Home, Users, Folder, File)</li>
            <li>Enlaces de navegación funcionales</li>
            <li>Soporte para nombres personalizados</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
