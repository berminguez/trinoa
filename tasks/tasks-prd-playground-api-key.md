## Relevant Files

- `src/collections/ApiKeys.ts` - Añadir campo playgroundKey, hooks de validación y control de acceso para administradores
- `src/collections/ApiKeys.test.ts` - Tests unitarios para las nuevas validaciones y hooks de ApiKeys
- `src/actions/api-keys/getApiKeys.ts` - Filtrar playground keys de la lista de usuario
- `src/actions/api-keys/getApiKeys.test.ts` - Tests para el filtrado de playground keys
- `src/hooks/usePlaygroundContext.ts` - Modificar para usar playground key del usuario en lugar de TEST_MCP_KEY  
- `src/hooks/usePlaygroundContext.test.ts` - Tests para la nueva lógica de autenticación con playground key
- `src/app/(frontend)/(private)/playground/components/PlaygroundContent.tsx` - Mostrar mensaje de error cuando no hay playground key
- `src/app/(frontend)/(private)/playground/components/PlaygroundContent.test.tsx` - Tests para el manejo de errores de playground key
- `src/payload-types.ts` - Se regenerará automáticamente con el nuevo campo playgroundKey

### Notes

- Los tipos de PayloadCMS se regeneran automáticamente con `pnpm payload generate:types` cuando se modifica una colección
- Las playground keys deben ser invisibles para usuarios normales pero visibles para administradores en el admin de PayloadCMS
- Usar `npx vitest` para ejecutar los tests unitarios

## Tasks

- [x] 1.0 Modificar colección ApiKeys para soportar playground keys
  - [x] 1.1 Añadir campo booleano `playgroundKey` con valor por defecto `false`
  - [x] 1.2 Configurar campo `playgroundKey` visible solo para administradores (admin.condition)
  - [x] 1.3 Implementar hook `beforeValidate` para validar que solo keys con `hasAllProjects = true` puedan ser playground keys
  - [x] 1.4 Implementar hook `beforeChange` para desmarcar otras playground keys del mismo usuario al marcar una nueva
  - [x] 1.5 Añadir validación en hook para garantizar máximo una playground key por usuario
  - [x] 1.6 Crear tests unitarios para todas las validaciones y hooks de playground key
- [x] 2.0 Actualizar server actions para filtrar playground keys del frontend de usuario
  - [x] 2.1 Modificar `getApiKeys.ts` para excluir keys con `playgroundKey = true` de los resultados para usuarios normales
  - [x] 2.2 Asegurar que administradores sí puedan ver todas las keys incluyendo playground keys
  - [x] 2.3 Actualizar conteo de API keys para excluir playground keys de usuarios normales
  - [x] 2.4 Crear tests para verificar filtrado correcto por rol de usuario
- [x] 3.0 Modificar hook usePlaygroundContext para usar playground key del usuario
  - [x] 3.1 Añadir función para buscar playground key del usuario autenticado
  - [x] 3.2 Reemplazar lógica de `TEST_MCP_KEY` con búsqueda de playground key
  - [x] 3.3 Implementar fallback para manejar caso de múltiples playground keys (usar primera encontrada)
  - [x] 3.4 Añadir estado de error cuando no se encuentra playground key
  - [x] 3.5 Crear tests para nueva lógica de autenticación con playground key
- [x] 4.0 Implementar manejo de errores en componentes de playground
  - [x] 4.1 Modificar `PlaygroundContent.tsx` para mostrar mensaje de error cuando no hay playground key
  - [x] 4.2 Usar componente Alert de Shadcn para mostrar: "El chatbot no tiene ninguna API key asignada"
  - [x] 4.3 Asegurar que mensaje de error sea responsive y sin call-to-action
  - [x] 4.4 Integrar estado de error desde `usePlaygroundContext` en la UI
  - [x] 4.5 Crear tests para verificar renderizado correcto de estados de error
- [x] 5.0 Limpiar referencias a TEST_MCP_KEY y validar funcionamiento completo
  - [x] 5.1 Buscar y eliminar todas las referencias a `process.env.TEST_MCP_KEY` en código de playground
  - [x] 5.2 Actualizar configuración de variables de entorno si es necesario
  - [x] 5.3 Regenerar tipos de PayloadCMS con `pnpm payload generate:types`
  - [x] 5.4 Ejecutar tests completos para validar funcionamiento de toda la funcionalidad
  - [x] 5.5 Realizar pruebas manuales: crear playground key, probar chatbot, verificar filtrado en tabla de usuario 