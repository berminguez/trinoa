import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  IconUpload,
  IconMessageCircle,
  IconKey,
  IconFolder,
  IconSettings,
  IconFileText,
} from '@tabler/icons-react'

interface QuickActionsProps {
  userId: string
}

/**
 * Componente que muestra acciones rápidas para usuarios
 */
export default function QuickActions({ userId }: QuickActionsProps) {
  const actions = [
    {
      title: 'Subir Documento',
      description: 'Añadir nuevos archivos',
      icon: IconUpload,
      href: '/projects', // TODO: Cambiar por modal de upload o proyecto default
      color: 'text-blue-600 bg-blue-50 hover:bg-blue-100',
    },
    {
      title: 'Ir a Playground',
      description: 'Chat con tus documentos',
      icon: IconMessageCircle,
      href: '/playground',
      color: 'text-green-600 bg-green-50 hover:bg-green-100',
    },
    {
      title: 'Gestionar APIs',
      description: 'Configurar API Keys',
      icon: IconKey,
      href: '/api-keys',
      color: 'text-purple-600 bg-purple-50 hover:bg-purple-100',
    },
    {
      title: 'Ver Proyectos',
      description: 'Todos mis proyectos',
      icon: IconFolder,
      href: '/projects',
      color: 'text-orange-600 bg-orange-50 hover:bg-orange-100',
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          <IconSettings className='h-5 w-5' />
          Acciones Rápidas
        </CardTitle>
        <CardDescription>Accesos directos a funcionalidades principales</CardDescription>
      </CardHeader>
      <CardContent>
        <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
          {actions.map((action, index) => {
            const IconComponent = action.icon
            return (
              <a
                key={index}
                href={action.href}
                className={`flex items-center gap-3 p-4 rounded-lg border transition-colors ${action.color}`}
              >
                <IconComponent className='h-6 w-6' />
                <div>
                  <p className='font-medium text-sm'>{action.title}</p>
                  <p className='text-xs opacity-75'>{action.description}</p>
                </div>
              </a>
            )
          })}
        </div>

        {/* Recordatorio útil */}
        <div className='mt-6 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-400'>
          <div className='flex items-start gap-2'>
            <IconFileText className='h-4 w-4 text-blue-600 mt-0.5' />
            <div>
              <p className='text-sm font-medium text-blue-800'>Tip: Usa el Playground</p>
              <p className='text-xs text-blue-600'>
                Haz preguntas sobre tus documentos usando nuestro chat inteligente
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
