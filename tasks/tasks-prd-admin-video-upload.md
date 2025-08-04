# Tasks: Funcionalidad de Subida de Vídeos en Panel de Administración

## Relevant Files

- `src/collections/Projects.ts` - Nueva collection de PayloadCMS para proyectos
- `src/collections/Projects.test.ts` - Tests unitarios para la collection Projects
- `src/collections/Resources.ts` - Modificación de collection existente para añadir relación con projects
- `src/app/api/resources/upload/route.ts` - Modificación del endpoint existente para soportar projectId
- `src/app/api/resources/upload/route.test.ts` - Tests para el endpoint de upload modificado
- `src/app/(payload)/projects/page.tsx` - Página principal de listado de proyectos
- `src/app/(payload)/projects/components/ProjectsContent.tsx` - Componente principal con lógica de proyectos
- `src/app/(payload)/projects/components/ProjectsSkeleton.tsx` - Skeleton loader para página de proyectos
- `src/app/(payload)/projects/[id]/page.tsx` - Página de detalle de proyecto individual
- `src/app/(payload)/projects/[id]/components/ProjectDetailContent.tsx` - Componente principal del detalle de proyecto
- `src/app/(payload)/projects/[id]/components/ProjectDetailSkeleton.tsx` - Skeleton loader para detalle de proyecto
- `src/app/(frontend)/(private)/projects/[id]/components/VideoUploadModal.tsx` - Modal refactorizado usando hook personalizado
- `src/app/(frontend)/(private)/projects/[id]/components/VideoUploadModal.test.ts` - Tests unitarios para modal de upload
- `src/app/(frontend)/(private)/projects/[id]/components/VideoUpload.integration.test.ts` - Tests de integración para flujo completo
- `src/hooks/useProjectUpload.ts` - Hook personalizado completo: validaciones, subida simultánea, optimistic updates, rollback automático en errores
- `src/hooks/useProjectUpload.test.ts` - Tests unitarios completos para el hook de upload
- `src/app/(frontend)/(private)/projects/[id]/components/VideoTableContainer.tsx` - Contenedor que maneja estado local para optimistic updates y rollback
- `src/app/(frontend)/(private)/projects/[id]/components/ProjectDetailContent.tsx` - Modificado para usar VideoTableContainer y pasar callbacks
- `src/app/(frontend)/(private)/projects/[id]/components/ProjectDetailHeader.tsx` - Integra VideoUploadModal con callback de optimistic updates
- `src/app/(payload)/projects/[id]/components/VideoTable.tsx` - Tabla de vídeos con TanStack React Table
- `src/app/(payload)/projects/[id]/components/VideoTable.test.tsx` - Tests para la tabla de vídeos
- `src/components/ProjectCard.tsx` - Componente reutilizable para tarjetas de proyecto
- `src/components/ProjectCard.test.tsx` - Tests para ProjectCard
- `src/stores/projects-store.ts` - Store de Zustand para gestión de estado de proyectos
- `src/stores/projects-store.test.ts` - Tests para el store de proyectos
- `src/hooks/useProjectUpload.ts` - Hook personalizado para funcionalidad de subida
- `src/hooks/useProjectUpload.test.ts` - Tests para el hook de subida
- `src/lib/validations/project.ts` - Schemas de validación para proyectos
- `src/lib/validations/project.test.ts` - Tests para validaciones de proyecto

### Notes

- Unit tests should typically be placed alongside the code files they are testing (e.g., `MyComponent.tsx` and `MyComponent.test.tsx` in the same directory).
- Use `pnpm test` to run tests. Running without a path executes all tests found by the configuration.
- PayloadCMS collections se ubican en `src/collections/`
- Admin pages siguen la estructura de Next.js App Router en `src/app/(payload)/admin/`

## Tasks

- [ ] 1.0 Configurar Modelo de Datos y Backend
  - [x] 1.1 Crear nueva collection `Projects` en PayloadCMS con campos: title, slug, description, createdBy, createdAt
  - [x] 1.2 Configurar auto-generación de slug basado en title con validación de unicidad
  - [x] 1.3 Implementar reglas de acceso para Projects (usuarios ven solo sus proyectos, admin ve todos)
  - [x] 1.4 Modificar collection `Resources` existente para añadir campo `project` (relationship → projects, requerido)
  - [x] 1.5 Modificar endpoint `POST /api/resources/upload` para aceptar parámetro opcional `projectId`
  - [x] 1.6 Añadir validación server-side para verificar ownership del proyecto antes de asignar vídeo
  - [x] 1.7 Implementar hook de PayloadCMS para crear proyecto "Default" automáticamente al registrar nuevo usuario
  - [x] 1.8 Actualizar respuesta del endpoint upload para devolver documento de vídeo con relaciones populadas
  - [x] 1.9 Escribir tests unitarios para la nueva collection Projects
  - [x] 1.10 Escribir tests para modificaciones en endpoint upload

- [x] 2.0 Implementar Navegación y Estructura del Admin
  - [x] 2.1 Añadir nueva sección "Projects" al sidebar del panel de administración
  - [x] 2.2 Configurar rutas de Next.js para `/projects` y `/projects/[id]`
  - [x] 2.3 Crear layout base para páginas de proyectos con breadcrumbs dinámicos
  - [x] 2.4 Implementar componente de breadcrumbs: Admin > Projects > [Project Name]
  - [x] 2.5 Configurar navegación entre vistas manteniendo contexto
  - [x] 2.6 Instalar dependencias necesarias: `@tanstack/react-table`, `react-dropzone`, `axios`

- [x] 3.0 Desarrollar Página de Listado de Proyectos
  - [x] 3.1 Crear página base `/projects/page.tsx` con wrapper de Suspense
  - [x] 3.2 Implementar componente `ProjectsContent.tsx` para lógica principal de listado
  - [x] 3.3 Crear componente `ProjectsSkeleton.tsx` con animate-pulse que replique estructura final
  - [x] 3.4 Desarrollar componente `ProjectCard.tsx` reutilizable con thumbnail, título, conteo videos, fecha
  - [x] 3.5 Implementar tarjeta especial "Create Project" con borde dashed y ícono plus de tabler
  - [x] 3.6 Crear grid responsive: 1 columna móvil, 2-3 tablet/desktop usando Tailwind
  - [x] 3.7 Añadir dropdown "Sort by" con opciones: Recent upload, Name, Creation date
  - [x] 3.8 Implementar campo de búsqueda/filtro por nombre de proyecto
  - [x] 3.9 Crear store de Zustand para gestión de estado de proyectos
  - [x] 3.10 Implementar modal para crear nuevo proyecto con validación de título único
  - [x] 3.11 Escribir tests unitarios para todos los componentes

- [x] 4.0 Crear Página de Detalle de Proyecto
  - [x] 4.1 Crear página base `/projects/[id]/page.tsx` con wrapper de Suspense
  - [x] 4.2 Implementar componente `ProjectDetailContent.tsx` con lógica principal
  - [x] 4.3 Crear componente `ProjectDetailSkeleton.tsx` replicando estructura completa
  - [x] 4.4 Desarrollar header de proyecto con título editable inline y IndexID copiable

  - [x] 4.6 Crear toolbar con botón "Upload Videos", dropdown "Select Action", toggle grid/list
  - [x] 4.7 Implementar componente `VideoTable.tsx` usando TanStack React Table
  - [x] 4.8 Configurar columnas de tabla: checkbox, thumbnail, filename, duration, uploadedAt
  - [x] 4.9 Añadir paginación con 12 elementos por página
  - [x] 4.10 Implementar filtro "Filter by video title" y dropdown "Sort by"
  - [x] 4.11 Hacer tabla responsive colapsando columnas menos importantes en móvil
  - [x] 4.12 Añadir funcionalidad de edición inline del título del proyecto
  - [x] 4.13 Implementar copiado al clipboard del IndexID con toast de confirmación
  - [x] 4.14 Escribir tests unitarios para todos los componentes

- [ ] 5.0 Implementar Modal de Subida y Funcionalidad Drag-and-Drop
  - [x] 5.1 Crear componente `VideoUploadModal.tsx` usando Shadcn Dialog
  - [x] 5.2 Implementar área drag-and-drop con react-dropzone y borde dashed
  - [x] 5.3 Añadir texto "Drop videos or browse files" y botón "Browse" para selección manual
- [x] 5.4 Mostrar información de límites: "4sec-1hr | Resolution 360p-4k | File size ≤2GB per video"
  - [x] 5.5 Implementar validaciones cliente: formato video/*, duración máxima 2h, tamaño máximo 2GB
  - [x] 5.6 Crear lista de archivos seleccionados con opción de remove individual
  - [x] 5.7 Implementar lógica de subida simultánea usando axios con FormData
    - [x] 5.8 Añadir barra de progreso individual por archivo con cancelación
    - [x] 5.9 Incluir projectId en cada request de subida
  - [x] 5.10 Implementar manejo de errores con toast específico por tipo de error
  - [x] 5.11 Crear hook personalizado `useProjectUpload` para encapsular lógica de subida
  - [x] 5.12 Implementar optimistic updates: añadir vídeo a tabla inmediatamente tras subida exitosa
  - [x] 5.13 Añadir funcionalidad "Retry" para archivos fallidos
  - [x] 5.14 Implementar toast de success al completar cada subida
  - [x] 5.15 Configurar rollback en caso de error con notificación apropiada
  - [x] 5.16 Escribir tests unitarios para modal, hook de subida y validaciones
  - [x] 5.17 Escribir tests de integración para flujo completo de subida 