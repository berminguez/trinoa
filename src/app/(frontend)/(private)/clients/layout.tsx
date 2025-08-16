import { ReactNode } from 'react'

interface ClientsLayoutProps {
  children: ReactNode
}

/**
 * Layout para rutas administrativas de clientes
 *
 * Este layout es opcional y puede expandirse en el futuro para incluir:
 * - Navegación administrativa específica
 * - Sidebar con acciones rápidas
 * - Breadcrumbs globales
 * - Indicadores de modo administrativo
 */
export default function ClientsLayout({ children }: ClientsLayoutProps) {
  return (
    <div className='min-h-screen bg-background'>
      {/* TODO: Añadir elementos de UI administrativos si es necesario */}
      {/* Por ahora, solo actúa como contenedor */}
      {children}
    </div>
  )
}
