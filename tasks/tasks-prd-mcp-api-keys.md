# Tasks: Sistema de MCP API Keys

## Relevant Files

- `src/collections/McpKeys.ts` - PayloadCMS collection definition for MCP API Keys ✅ CREATED (includes hashing and keyValueLastFour field)
- `src/payload.config.ts` - Payload configuration file ✅ MODIFIED (added McpKeys collection)
- `src/collections/McpKeys.test.ts` - Unit tests for McpKeys collection ✅ CREATED
- `src/app/(frontend)/(private)/mcp-keys/page.tsx` - Main page wrapper with Suspense ✅ CREATED
- `src/app/(frontend)/(private)/mcp-keys/components/McpKeysContent.tsx` - Main page content component ✅ CREATED
- `src/app/(frontend)/(private)/mcp-keys/components/McpKeysSkeleton.tsx` - Loading skeleton component ✅ CREATED
- `src/app/(frontend)/(private)/mcp-keys/components/McpKeysHeader.tsx` - Header with title and create button ✅ CREATED
- `src/app/(frontend)/(private)/mcp-keys/components/McpKeysEmptyState.tsx` - Empty state when no keys ✅ CREATED
- `src/app/(frontend)/(private)/mcp-keys/components/CreateMcpKeyModal.tsx` - Modal for creating API keys ✅ CREATED
- `src/app/(frontend)/(private)/mcp-keys/components/McpKeysTable.tsx` - Table component for displaying keys ✅ CREATED
- `src/app/(frontend)/(private)/mcp-keys/components/DeleteMcpKeyDialog.tsx` - Confirmation dialog for deletion ✅ CREATED
- `src/actions/projects/getUserProjects.ts` - Server action for fetching user projects ✅ CREATED
- `src/components/app-sidebar.tsx` - Updated with API Keys navigation ✅ UPDATED
- `src/actions/mcp-keys/index.ts` - Server actions for MCP Keys CRUD operations ✅ CREATED
- `src/actions/mcp-keys/types.ts` - Shared types for MCP Keys server actions ✅ CREATED
- `src/actions/mcp-keys/createMcpKey.ts` - Server action for creating API keys ✅ CREATED
- `src/actions/mcp-keys/deleteMcpKey.ts` - Server action for deleting API keys ✅ CREATED
- `src/actions/mcp-keys/getMcpKeys.ts` - Server action for fetching user's API keys ✅ CREATED
- `src/actions/mcp-keys/createMcpKey.test.ts` - Unit tests for create action ✅ CREATED
- `src/actions/mcp-keys/deleteMcpKey.test.ts` - Unit tests for delete action ✅ CREATED
- `src/actions/mcp-keys/getMcpKeys.test.ts` - Unit tests for get action ✅ CREATED
- `src/lib/utils/apiKeyGenerator.ts` - Utility for generating secure API keys ✅ CREATED
- `src/lib/utils/apiKeyGenerator.test.ts` - Unit tests for API key generator ✅ CREATED
- `src/lib/utils/inputSanitizer.ts` - Input sanitization and validation utilities ✅ CREATED
- `src/lib/utils/securityLogger.ts` - Security logging and audit trail system ✅ CREATED
- `src/lib/utils/responseValidator.ts` - Response validation to prevent data exposure ✅ CREATED
- `src/lib/utils/securityTests.test.ts` - Comprehensive security tests (7 test categories) ✅ CREATED

### Notes

- Unit tests should typically be placed alongside the code files they are testing
- Use `pnpm test` to run all tests or `pnpm test [path]` for specific test files
- PayloadCMS will automatically regenerate types in `src/payload-types.ts` after collection changes

## Tasks

- [x] 1.0 Implementar colección PayloadCMS McpKeys
  - [x] 1.1 Crear archivo `src/collections/McpKeys.ts` con definición básica de colección
  - [x] 1.2 Definir campos: id, name, keyValue, user, projects, hasAllProjects, createdAt, updatedAt
  - [x] 1.3 Configurar relaciones: user (required) y projects (array, optional)
  - [x] 1.4 Implementar validaciones: límite 10 keys por usuario, name único por usuario, keyValue único global
  - [x] 1.5 Implementar hook `beforeChange` para generar keyValue automáticamente
  - [x] 1.6 Implementar hook `beforeChange` para hashear API key antes de guardar
  - [x] 1.7 Implementar hook `afterRead` para mostrar solo últimos 4 caracteres de key
  - [x] 1.8 Agregar colección McpKeys al array de collections en `payload.config.ts`
  - [x] 1.9 Ejecutar `pnpm payload generate:types` para regenerar tipos
  - [x] 1.10 Crear tests básicos para la colección en `src/collections/McpKeys.test.ts`

- [x] 2.0 Crear utilidades de generación y manejo de API Keys
  - [x] 2.1 Crear `src/lib/utils/apiKeyGenerator.ts` con función para generar keys formato `pcsk_` + 32 caracteres
  - [x] 2.2 Implementar función de hashing seguro usando bcrypt
  - [x] 2.3 Implementar función para verificar API keys hasheadas
  - [x] 2.4 Implementar función para formatear display de keys (mostrar solo últimos 4 caracteres)
  - [x] 2.5 Crear función para validar formato de API key
  - [x] 2.6 Crear tests completos en `src/lib/utils/apiKeyGenerator.test.ts`

- [x] 3.0 Desarrollar server actions para operaciones CRUD
  - [x] 3.1 Crear `src/actions/mcp-keys/index.ts` como barrel export
  - [x] 3.2 Implementar `src/actions/mcp-keys/getMcpKeys.ts` para obtener keys del usuario autenticado
  - [x] 3.3 Implementar `src/actions/mcp-keys/createMcpKey.ts` con validaciones y límites
  - [x] 3.4 Implementar `src/actions/mcp-keys/deleteMcpKey.ts` con verificación de permisos
  - [x] 3.5 Agregar validación de que projects pertenecen al usuario en createMcpKey
  - [x] 3.6 Implementar revalidatePath en todas las acciones que modifican datos
  - [x] 3.7 Agregar manejo de errores y responses consistentes en todas las acciones
  - [x] 3.8 Crear tests para `createMcpKey.test.ts`, `deleteMcpKey.test.ts`, `getMcpKeys.test.ts`

- [x] 4.0 Implementar interfaz frontend completa
  - [x] 4.1 Crear estructura de página en `src/app/(frontend)/(private)/mcp-keys/page.tsx` con Suspense
  - [x] 4.2 Crear `McpKeysSkeleton.tsx` con skeleton que replica estructura de tabla
  - [x] 4.3 Crear `McpKeysContent.tsx` como componente principal con lógica de datos
  - [x] 4.4 Implementar `McpKeysTable.tsx` con columnas: Name, Created on, Created by, Value, Projects, Actions
  - [x] 4.5 Crear `CreateMcpKeyModal.tsx` con formulario: name, checkbox "All projects", lista de proyectos
  - [x] 4.6 Implementar lógica de habilitación/deshabilitación de checkboxes de proyectos
  - [x] 4.7 Crear `DeleteMcpKeyDialog.tsx` con confirmación de eliminación
  - [x] 4.8 Integrar iconos de Tabler: Key, Trash, Plus en componentes
  - [x] 4.9 Implementar paginación en tabla si hay más de 10 keys
  - [x] 4.10 Agregar navegación a mcp-keys en sidebar/menu principal
  - [x] 4.11 Implementar responsive design para móviles en todos los componentes

- [x] 5.0 Implementar medidas de seguridad y validaciones
  - [x] 5.1 Validar en frontend que usuario autenticado puede acceder a página mcp-keys
  - [x] 5.2 Implementar verificación de permisos en todos los server actions
  - [x] 5.3 Sanitizar inputs en formularios (nombre de key, selección de proyectos)
  - [x] 5.4 Implementar validación de que solo se muestran proyectos del usuario autenticado
  - [x] 5.5 Agregar rate limiting básico en creación de keys (máximo 10 por usuario)
  - [x] 5.6 Implementar logs de seguridad para creación/eliminación de keys
  - [x] 5.7 Validar que keyValue nunca se expone en responses de API (solo hash)
  - [x] 5.8 Crear tests de seguridad para verificar aislamiento de datos entre usuarios 