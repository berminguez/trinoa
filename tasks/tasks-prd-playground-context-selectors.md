# Tasks: Selectores de Contexto para Playground Chat

## Relevant Files

- `src/stores/playground-context-store.ts` - ✅ Store de Zustand para manejar estado global de selectores de contexto con persistencia (completo + validaciones)
- `src/stores/playground-context-store.test.ts` - ✅ Tests unitarios para el store de contexto (completo)
- `src/hooks/usePlaygroundContext.ts` - ✅ Hook personalizado para integrar el contexto con componentes (completo)
- `src/hooks/usePlaygroundContext.test.ts` - ✅ Tests para el hook de contexto (completo)
- `src/app/(frontend)/(private)/playground/components/ContextSelectors.tsx` - ✅ Componente principal que contiene ambos selectores (completo)
- `src/app/(frontend)/(private)/playground/components/ContextSelectors.test.tsx` - Tests para el componente de selectores
- `src/app/(frontend)/(private)/playground/components/ProjectSelector.tsx` - ✅ Componente selector de proyectos (completo)
- `src/app/(frontend)/(private)/playground/components/ProjectSelector.test.tsx` - ✅ Tests para selector de proyectos (completo)
- `src/app/(frontend)/(private)/playground/components/VideoSelector.tsx` - ✅ Componente selector de videos con checkboxes múltiples (completo)
- `src/app/(frontend)/(private)/playground/components/VideoSelector.test.tsx` - Tests para selector de videos
- `src/app/(frontend)/(private)/playground/components/ContextIndicator.tsx` - ✅ Indicador visual del contexto activo en el input (completo)
- `src/app/(frontend)/(private)/playground/components/ContextIndicator.test.tsx` - Tests para indicador de contexto
- `src/app/(frontend)/(private)/playground/components/EmptyContextState.tsx` - ✅ Estado cuando no hay proyectos/videos (completo)
- `src/app/(frontend)/(private)/playground/components/EmptyContextState.test.tsx` - Tests para estado vacío
- `src/app/(frontend)/(private)/playground/components/UnavailableContentIndicator.tsx` - ✅ Indicadores para contenido no disponible (completo)
- `src/app/(frontend)/(private)/playground/components/ErrorRecoveryState.tsx` - ✅ Estados de error y recuperación (completo)
- `src/app/(frontend)/(private)/playground/components/ErrorStates.test.ts` - ✅ Tests para casos edge y estados de error (completo)
- `src/lib/analytics/playground-analytics.ts` - ✅ Servicio de analytics y logging (completo)
- `src/app/(frontend)/(private)/playground/components/PlaygroundContent.tsx` - ✅ Modificar para integrar selectores de contexto (completo)
- `src/app/(frontend)/(private)/playground/components/ChatInterface.tsx` - ✅ Modificar para mostrar indicador de contexto (completo)
- `src/app/api/chat/route.ts` - ✅ Modificar endpoint para recibir y procesar contexto adicional (completo)
- `src/app/api/chat/route.test.ts` - ✅ Tests para el endpoint de chat con contexto (completo)
- `src/types/playground.ts` - ✅ Tipos TypeScript para contexto de playground (completo + validaciones)
- `src/actions/playground/getPlaygroundData.ts` - ✅ Server action para obtener proyectos y videos del usuario (completo)
- `src/actions/playground/getPlaygroundData.test.ts` - ✅ Tests para el server action (completo)

### Notes

- Los tests unitarios deben ubicarse junto a sus archivos correspondientes
- Usar `pnpm test` para ejecutar todos los tests o `pnpm test [path]` para tests específicos
- Seguir las reglas del workspace para usar Shadcn components, Tailwind 4, y server actions
- Integrar con el sistema de autenticación existente para validar permisos del usuario

## Tasks

- [x] 1.0 Crear Store de Estado Global para Contexto de Playground
  - [x] 1.1 Crear tipos TypeScript para contexto de playground en `src/types/playground.ts`
  - [x] 1.2 Implementar store de Zustand con persistencia en `src/stores/playground-context-store.ts`
  - [x] 1.3 Configurar acciones del store (setSelectedProject, setSelectedVideos, resetContext)
  - [x] 1.4 Implementar validación de datos existentes al restaurar desde localStorage
  - [x] 1.5 Escribir tests unitarios completos para el store

- [x] 2.0 Desarrollar Componentes UI de Selectores de Proyectos y Videos
  - [x] 2.1 Crear componente `ProjectSelector` con Shadcn Select component
  - [x] 2.2 Crear componente `VideoSelector` con dropdown de checkboxes múltiples
  - [x] 2.3 Implementar botones "Marcar todos" / "Desmarcar todos" en VideoSelector
  - [x] 2.4 Crear componente padre `ContextSelectors` que combine ambos selectores
  - [x] 2.5 Implementar lógica de filtrado dinámico de videos por proyecto
  - [x] 2.6 Añadir loading states y transiciones suaves con Tailwind
  - [x] 2.7 Escribir tests unitarios para todos los componentes

- [x] 3.0 Implementar Lógica de Persistencia y Sincronización de Estado
  - [x] 3.1 Crear hook personalizado `usePlaygroundContext` para integración con componentes
  - [x] 3.2 Implementar server action `getPlaygroundData` para obtener proyectos y videos
  - [x] 3.3 Configurar validación de permisos de usuario en el server action
  - [x] 3.4 Implementar lógica de reset automático cuando cambia selección de proyecto
  - [x] 3.5 Añadir cache y optimizaciones de performance para listas grandes
  - [x] 3.6 Escribir tests para hook y server action

- [x] 4.0 Integrar Contexto con el Sistema de Chat y API
  - [x] 4.1 Modificar `PlaygroundContent.tsx` para incluir componente `ContextSelectors`
  - [x] 4.2 Crear componente `ContextIndicator` para mostrar contexto activo en input
  - [x] 4.3 Integrar `ContextIndicator` en `ChatInterface.tsx` 
  - [x] 4.4 Modificar endpoint `/api/chat/route.ts` para recibir contexto adicional
  - [x] 4.5 Actualizar prompt del sistema para incluir información de contexto
  - [x] 4.6 Implementar validación de IDs de proyecto/video en el backend
  - [x] 4.7 Escribir tests de integración para flujo completo de chat con contexto

- [x] 5.0 Implementar Estados Especiales y Manejo de Errores
  - [x] 5.1 Crear componente `EmptyContextState` para usuarios sin proyectos
  - [x] 5.2 Implementar CTA que redirija a "/projects" desde estado vacío
  - [x] 5.3 Añadir manejo de proyectos/videos eliminados ("No disponible")
  - [x] 5.4 Implementar indicadores visuales para contenido no disponible
  - [x] 5.5 Añadir estados de error y recuperación para fallos de carga
  - [x] 5.6 Implementar logging y analytics para uso de selectores
  - [x] 5.7 Escribir tests para todos los casos edge y estados de error 