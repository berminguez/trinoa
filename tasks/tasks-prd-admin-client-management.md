# Tasks: Sistema de Administración de Clientes

Basado en: `prd-admin-client-management.md`

## Relevant Files

### Archivos Modificados ✅
- `src/middleware.ts` - ✅ Extendido para validar rutas `/clients/*` y verificar rol admin
- `src/lib/auth.ts` - ✅ Añadidas funciones helper para redirecciones y mensajes admin
- `src/actions/auth/getUser.ts` - ✅ Añadidas funciones `isAdminUser()` y `requireAdminAccess()`
- `src/components/index.ts` - ✅ Añadido export de AdminAccessGuard
- `src/hooks/useUserRole.ts` - ✅ Hook para verificar rol de usuario en cliente
- `src/components/app-sidebar.tsx` - ✅ Navegación dinámica con enlace "Clients" solo para admins
- `src/components/nav-user.tsx` - ✅ Indicadores visuales de administrador en UserMenu
- `src/components/admin-breadcrumb.tsx` - ✅ Sistema de breadcrumbs para navegación administrativa
- `src/components/index.ts` - ✅ Exports de AdminBreadcrumb y AdminBreadcrumbs

### Archivos Creados ✅
- `src/components/admin-access-guard.tsx` - ✅ Componente wrapper para validación admin en server components
- `src/hooks/useAdminAccess.ts` - ✅ Hook para verificación admin en client components
- `src/app/(frontend)/(private)/clients/page.tsx` - ✅ Página principal con patrón de validación admin
- `src/app/(frontend)/(private)/clients/layout.tsx` - ✅ Layout opcional para rutas administrativas
- `src/app/(frontend)/(private)/clients/components/ClientsContent.tsx` - ✅ Componente principal con breadcrumbs integrados
- `src/app/(frontend)/(private)/clients/[idclient]/projects/components/ClientProjectsContent.tsx` - ✅ Breadcrumbs para proyectos de cliente
- `src/app/(frontend)/(private)/clients/components/ErrorBoundaryContent.tsx` - ✅ Componente de manejo de errores
- `src/app/(frontend)/(private)/clients/components/ClientsGrid.tsx` - ✅ Grid implementado con búsqueda, filtros y paginación
- `src/stores/clients-store.ts` - ✅ Store Zustand para gestión de estado de clientes
- `src/app/(frontend)/(private)/clients/components/ClientGridItem.tsx` - ✅ Tarjeta completa con datos, estadísticas y animaciones
- `src/app/(frontend)/(private)/clients/components/ClientsHeader.tsx` - ✅ Header de página de clientes
- `src/app/(frontend)/(private)/clients/components/ClientsSkeleton.tsx` - ✅ Skeleton para estado de carga
- `src/app/(frontend)/(private)/clients/[idclient]/page.tsx` - ✅ Redirección a proyectos del cliente
- `src/app/(frontend)/(private)/clients/[idclient]/projects/page.tsx` - ✅ Lista de proyectos del cliente (estructura base)
- `src/app/(frontend)/(private)/clients/[idclient]/projects/components/ClientProjectsContent.tsx` - ✅ Contenido de proyectos (estructura base)
- `src/app/(frontend)/(private)/clients/[idclient]/projects/components/ClientProjectsSkeleton.tsx` - ✅ Skeleton de proyectos de cliente
- `src/actions/clients/index.ts` - ✅ Exports de actions de clientes
- `src/actions/clients/types.ts` - ✅ Tipos TypeScript para gestión de clientes
- `src/actions/clients/getClients.ts` - ✅ Server action implementado con búsqueda, filtros y paginación
- `tests/int/actions/clients/getClients.int.spec.ts` - ✅ Tests de integración para getClients
- `src/actions/clients/getClientProjects.ts` - ✅ Server action implementado con filtros y paginación
- `tests/int/actions/clients/getClientProjects.int.spec.ts` - ✅ Tests de integración completos
- `src/app/(frontend)/(private)/clients/README.md` - ✅ Documentación de estructura creada
- `src/app/(frontend)/(private)/clients/components/BreadcrumbDemo.tsx` - ✅ Componente demo de breadcrumbs
- `src/app/(frontend)/(private)/clients/[idclient]/projects/[idproject]/page.tsx` - ✅ Página de detalle de proyecto
- `src/app/(frontend)/(private)/clients/[idclient]/projects/[idproject]/components/ClientProjectDetailContent.tsx` - ✅ Contenido detalle proyecto
- `src/app/(frontend)/(private)/clients/[idclient]/projects/[idproject]/components/ClientProjectDetailSkeleton.tsx` - ✅ Skeleton para proyecto
- `src/app/(frontend)/(private)/clients/[idclient]/projects/[idproject]/resource/[idresource]/page.tsx` - ✅ Página de recurso específico
- `src/app/(frontend)/(private)/clients/[idclient]/projects/[idproject]/resource/[idresource]/components/ClientResourceContent.tsx` - ✅ Contenido del recurso
- `src/app/(frontend)/(private)/clients/[idclient]/projects/[idproject]/resource/[idresource]/components/ClientResourceSkeleton.tsx` - ✅ Skeleton para recurso
- `src/app/(frontend)/(private)/clients/[idclient]/projects/components/ClientProjectsHeader.tsx` - ✅ Header para proyectos de cliente
- `src/app/(frontend)/(private)/clients/[idclient]/projects/components/ClientProjectsGrid.tsx` - ✅ Grid de proyectos con filtros administrativos
- `src/app/(frontend)/(private)/clients/[idclient]/projects/components/ClientProjectGridItem.tsx` - ✅ Tarjeta de proyecto en contexto admin
- `src/app/(frontend)/(private)/clients/[idclient]/projects/components/ClientProjectsErrorBoundary.tsx` - ✅ Manejo de errores específico
- `src/actions/projects/createProjectForClient.ts` - ✅ Server action para crear proyectos como admin
- `tests/int/actions/projects/createProjectForClient.int.spec.ts` - ✅ Tests de integración completos
- `src/app/(frontend)/(private)/clients/[idclient]/projects/components/CreateClientProjectModal.tsx` - ✅ Modal para crear proyectos como admin
- `src/app/(frontend)/(private)/clients/[idclient]/projects/components/ClientProjectsContentClient.tsx` - ✅ Componente cliente con refresh automático
- `src/app/(frontend)/(private)/clients/[idclient]/projects/[idproject]/components/ClientProjectDetailContent.tsx` - ✅ Detalle completo de proyecto para admin
- `src/app/(frontend)/(private)/clients/[idclient]/projects/[idproject]/components/ClientProjectDetailHeader.tsx` - ✅ Header con información de proyecto y cliente
- `src/app/(frontend)/(private)/clients/[idclient]/projects/[idproject]/components/ClientProjectResourcesTable.tsx` - ✅ Tabla de recursos para admin
- `src/app/(frontend)/(private)/clients/[idclient]/projects/[idproject]/components/ClientProjectDetailHeaderEditable.tsx` - ✅ Header editable con capacidades admin
- `src/app/(frontend)/(private)/clients/[idclient]/projects/[idproject]/components/ClientProjectResourcesTableContainer.tsx` - ✅ Container con optimistic updates
- `src/app/(frontend)/(private)/clients/[idclient]/projects/[idproject]/components/ClientProjectDetailContentEditable.tsx` - ✅ Versión completa editable
- `src/actions/projects/updateProjectAsAdmin.ts` - ✅ Server action para actualizar proyectos como admin
- `src/actions/projects/getProjectAsAdmin.ts` - ✅ Server action para obtener proyectos con datos completos
- `src/actions/projects/deleteProjectAsAdmin.ts` - ✅ Server action para eliminar proyectos como admin
- `src/actions/projects/getProjectPreResourcesAsAdmin.ts` - ✅ Server action para pre-resources como admin
- `src/actions/projects/admin.ts` - ✅ Archivo índice con tipos y utilidades administrativas
- `tests/int/actions/projects/updateProjectAsAdmin.int.spec.ts` - ✅ Tests de integración completos
- `docs/admin-validation-patterns.md` - ✅ Documentación de patrones de seguridad admin

### Archivos Pendientes (próximas tareas)
- Sección 5.0: Implementación de gestión de recursos y páginas de detalle

### Notes

- Reutilizar componentes existentes como `ProjectsGrid`, `ProjectGridItem`, `ProjectDetailContent` adaptándolos para contexto administrativo
- Los server actions deben validar permisos de admin antes de ejecutar operaciones
- Mantener consistencia visual con Shadcn + Tailwind + iconos Tabler
- Implementar paginación y filtros siguiendo los patrones existentes

## Tasks

- [x] 1.0 Configurar Sistema de Autorización y Middleware
  - [x] 1.1 Extender `src/middleware.ts` para validar rutas `/clients/*` y verificar rol admin
  - [x] 1.2 Crear función helper `isAdminUser()` en `src/actions/auth/getUser.ts` 
  - [x] 1.3 Crear función `requireAdminAccess()` para verificar permisos en server components
  - [x] 1.4 Implementar redirección automática para usuarios no-admin que accedan a rutas administrativas
  - [x] 1.5 Añadir validación de rol admin en todas las páginas `/clients/*`

- [x] 2.0 Implementar Página de Lista de Clientes (/clients)
  - [x] 2.1 Crear estructura de carpetas y archivos base para `/clients`
  - [x] 2.2 Implementar `src/actions/clients/getClients.ts` para obtener lista paginada de usuarios
  - [x] 2.3 Crear `ClientsContent.tsx` con lógica de servidor para cargar clientes
  - [x] 2.4 Implementar `ClientsGrid.tsx` con búsqueda, filtros y ordenamiento
  - [x] 2.5 Crear `ClientGridItem.tsx` mostrando nombre, email, fecha registro, número proyectos
  - [x] 2.6 Implementar `ClientsSkeleton.tsx` para estado de carga
  - [x] 2.7 Crear `ClientsHeader.tsx` con título y controles de página
  - [x] 2.8 Implementar paginación para manejar grandes cantidades de usuarios
  - [x] 2.9 Añadir navegación clickeable hacia `/clients/{idclient}/projects`

- [x] 3.0 Implementar Navegación y Componentes de UI Administrativa  
  - [x] 3.1 Modificar `src/components/nav-main.tsx` para mostrar enlace "Clients" solo a admins
  - [x] 3.2 Actualizar `src/components/nav-user.tsx` para mostrar icono de admin en UserMenu
  - [x] 3.3 Crear `src/components/admin-breadcrumb.tsx` para navegación en rutas administrativas
  - [x] 3.4 Crear `src/stores/clients-store.ts` con Zustand para estado de clientes (búsqueda, filtros)
  - [x] 3.5 Implementar persistencia local de filtros y preferencias de admin

- [x] 4.0 Implementar Gestión de Proyectos de Cliente (/clients/{idclient}/projects)
  - [x] 4.1 Crear estructura de rutas dinámicas para `[idclient]/projects`
  - [x] 4.2 Implementar redirección en `/clients/[idclient]/page.tsx` hacia proyectos
  - [x] 4.3 Crear `src/actions/clients/getClientProjects.ts` para obtener proyectos de cliente específico
  - [x] 4.4 Implementar `ClientProjectsContent.tsx` adaptando lógica de `ProjectsContent.tsx`
  - [x] 4.5 Adaptar `ProjectsGrid.tsx` para contexto administrativo (mostrar info del cliente)
  - [x] 4.6 Crear `src/actions/projects/createProjectForClient.ts` para crear proyectos como admin
  - [x] 4.7 Modificar `CreateProjectModal.tsx` para funcionar en contexto de cliente
  - [x] 4.8 Implementar breadcrumb: Clients > [Nombre Cliente] > Projects
  - [x] 4.9 Añadir validación de que el cliente existe antes de mostrar sus proyectos

- [ ] 5.0 Implementar Gestión de Recursos y Páginas Detalle
  - [x] 5.1 Crear ruta `/clients/[idclient]/projects/[idproject]/page.tsx` para detalle de proyecto
  - [x] 5.2 Adaptar `ProjectDetailContent.tsx` para contexto administrativo como `ClientProjectDetailContent.tsx`
  - [x] 5.3 Extender server actions de proyectos para soportar contexto administrativo
  - [ ] 5.4 Crear ruta `/clients/[idclient]/projects/[idproject]/resource/[idresource]/page.tsx`
  - [ ] 5.5 Adaptar componentes de recurso para contexto administrativo 
  - [ ] 5.6 Implementar upload de recursos en nombre del cliente
  - [ ] 5.7 Añadir edición de metadatos de proyecto (título, descripción) en contexto admin
  - [ ] 5.8 Implementar breadcrumbs completos: Clients > [Cliente] > Projects > [Proyecto] > [Recurso]
  - [ ] 5.9 Validar ownership/acceso en todas las operaciones administrativas
  - [ ] 5.10 Añadir manejo de errores cuando recursos/proyectos no existen o no pertenecen al cliente
