export const metadata = {
  title: 'Dashboard - Eidetik',
  description: 'Panel de control principal de Eidetik',
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  // El layout compartido (private) ya maneja:
  // - Autenticación completa con ProtectedContent
  // - SidebarProvider y AppSidebar
  // - Toaster para notificaciones
  // - Estados de carga y error

  return <>{children}</>
}
