# Tasks: Sistema de Administración de Clientes

Basado en: `prd-admin-client-management.md`

## Relevant Files

### Archivos Modificados ✅
- `src/middleware.ts` - ✅ Extendido para validar rutas `/clients/*` y verificar rol admin
- `src/lib/auth.ts` - ✅ Añadidas funciones helper para redirecciones y mensajes admin
- `src/actions/auth/getUser.ts` - ✅ Añadidas funciones `isAdminUser()` y `requireAdminAccess()`
- `src/components/index.ts` - ✅ Añadido export de AdminAccessGuard

### Archivos Creados ✅
- `src/components/admin-access-guard.tsx` - ✅ Componente wrapper para validación admin en server components
- `src/hooks/useAdminAccess.ts` - ✅ Hook para verificación admin en client components
- `src/app/(frontend)/(private)/clients/page.tsx` - ✅ Página principal con patrón de validación admin
- `docs/admin-validation-patterns.md` - ✅ Documentación de patrones de seguridad admin

### Archivos Pendientes (próximas tareas)
- `src/app/(frontend)/(private)/clients/layout.tsx` - Layout para rutas administrativas
- `src/app/(frontend)/(private)/clients/components/ClientsContent.tsx` - Componente principal con lógica de clientes
- `src/app/(frontend)/(private)/clients/components/ClientsGrid.tsx` - Grid de clientes con búsqueda y filtros
- `src/app/(frontend)/(private)/clients/components/ClientGridItem.tsx` - Tarjeta individual de cliente
- `src/app/(frontend)/(private)/clients/components/ClientsSkeleton.tsx` - Skeleton para estado de carga
- `src/app/(frontend)/(private)/clients/components/ClientsHeader.tsx` - Header de página de clientes
- `src/app/(frontend)/(private)/clients/[idclient]/page.tsx` - Redirección a proyectos del cliente
- `src/app/(frontend)/(private)/clients/[idclient]/projects/page.tsx` - Lista de proyectos del cliente
- `src/app/(frontend)/(private)/clients/[idclient]/projects/components/ClientProjectsContent.tsx` - Contenido de proyectos del cliente
- `src/app/(frontend)/(private)/clients/[idclient]/projects/[idproject]/page.tsx` - Detalle de proyecto del cliente
- `src/app/(frontend)/(private)/clients/[idclient]/projects/[idproject]/components/ClientProjectDetailContent.tsx` - Contenido detalle proyecto
- `src/app/(frontend)/(private)/clients/[idclient]/projects/[idproject]/resource/[idresource]/page.tsx` - Recurso específico
- `src/app/(frontend)/(private)/clients/[idclient]/projects/[idproject]/resource/[idresource]/components/ClientResourceContent.tsx` - Contenido del recurso
- `src/actions/clients/getClients.ts` - Server action para obtener lista de clientes
- `src/actions/clients/getClientProjects.ts` - Server action para obtener proyectos de un cliente
- `src/actions/clients/index.ts` - Exports de actions de clientes
- `src/actions/projects/createProjectForClient.ts` - Server action para crear proyecto para cliente
- `src/components/nav-main.tsx` - Añadir enlace "Clients" visible solo para admins
- `src/components/nav-user.tsx` - Añadir icono de administrador en UserMenu
- `src/components/admin-breadcrumb.tsx` - Componente de breadcrumb para rutas administrativas
- `src/stores/clients-store.ts` - Store de Zustand para gestión de estado de clientes

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

- [ ] 2.0 Implementar Página de Lista de Clientes (/clients)
  - [ ] 2.1 Crear estructura de carpetas y archivos base para `/clients`
  - [ ] 2.2 Implementar `src/actions/clients/getClients.ts` para obtener lista paginada de usuarios
  - [ ] 2.3 Crear `ClientsContent.tsx` con lógica de servidor para cargar clientes
  - [ ] 2.4 Implementar `ClientsGrid.tsx` con búsqueda, filtros y ordenamiento
  - [ ] 2.5 Crear `ClientGridItem.tsx` mostrando nombre, email, fecha registro, número proyectos
  - [ ] 2.6 Implementar `ClientsSkeleton.tsx` para estado de carga
  - [ ] 2.7 Crear `ClientsHeader.tsx` con título y controles de página
  - [ ] 2.8 Implementar paginación para manejar grandes cantidades de usuarios
  - [ ] 2.9 Añadir navegación clickeable hacia `/clients/{idclient}/projects`

- [ ] 3.0 Implementar Navegación y Componentes de UI Administrativa  
  - [ ] 3.1 Modificar `src/components/nav-main.tsx` para mostrar enlace "Clients" solo a admins
  - [ ] 3.2 Actualizar `src/components/nav-user.tsx` para mostrar icono de admin en UserMenu
  - [ ] 3.3 Crear `src/components/admin-breadcrumb.tsx` para navegación en rutas administrativas
  - [ ] 3.4 Crear `src/stores/clients-store.ts` con Zustand para estado de clientes (búsqueda, filtros)
  - [ ] 3.5 Implementar persistencia local de filtros y preferencias de admin

- [ ] 4.0 Implementar Gestión de Proyectos de Cliente (/clients/{idclient}/projects)
  - [ ] 4.1 Crear estructura de rutas dinámicas para `[idclient]/projects`
  - [ ] 4.2 Implementar redirección en `/clients/[idclient]/page.tsx` hacia proyectos
  - [ ] 4.3 Crear `src/actions/clients/getClientProjects.ts` para obtener proyectos de cliente específico
  - [ ] 4.4 Implementar `ClientProjectsContent.tsx` adaptando lógica de `ProjectsContent.tsx`
  - [ ] 4.5 Adaptar `ProjectsGrid.tsx` para contexto administrativo (mostrar info del cliente)
  - [ ] 4.6 Crear `src/actions/projects/createProjectForClient.ts` para crear proyectos como admin
  - [ ] 4.7 Modificar `CreateProjectModal.tsx` para funcionar en contexto de cliente
  - [ ] 4.8 Implementar breadcrumb: Clients > [Nombre Cliente] > Projects
  - [ ] 4.9 Añadir validación de que el cliente existe antes de mostrar sus proyectos

- [ ] 5.0 Implementar Gestión de Recursos y Páginas Detalle
  - [ ] 5.1 Crear ruta `/clients/[idclient]/projects/[idproject]/page.tsx` para detalle de proyecto
  - [ ] 5.2 Adaptar `ProjectDetailContent.tsx` para contexto administrativo como `ClientProjectDetailContent.tsx`
  - [ ] 5.3 Extender server actions de proyectos para soportar contexto administrativo
  - [ ] 5.4 Crear ruta `/clients/[idclient]/projects/[idproject]/resource/[idresource]/page.tsx`
  - [ ] 5.5 Adaptar componentes de recurso para contexto administrativo 
  - [ ] 5.6 Implementar upload de recursos en nombre del cliente
  - [ ] 5.7 Añadir edición de metadatos de proyecto (título, descripción) en contexto admin
  - [ ] 5.8 Implementar breadcrumbs completos: Clients > [Cliente] > Projects > [Proyecto] > [Recurso]
  - [ ] 5.9 Validar ownership/acceso en todas las operaciones administrativas
  - [ ] 5.10 Añadir manejo de errores cuando recursos/proyectos no existen o no pertenecen al cliente
