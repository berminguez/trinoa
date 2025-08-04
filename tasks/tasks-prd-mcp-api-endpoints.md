# Tasks: MCP API Endpoints

## Relevant Files

- `src/app/api/mcp/types.ts` - Tipos TypeScript para autenticación MCP y endpoints (McpAuthResult, McpKeyData, funciones de validación)
- `src/lib/config.ts` - Configuración de variables de entorno MCP (MCP_HOST)
- `src/app/api/mcp/auth-service.ts` - Servicio de autenticación MCP con funciones de conveniencia para endpoints
- `src/app/api/mcp/auth-service.test.ts` - Unit tests para el servicio de autenticación
- `src/app/api/mcp/projects/route.ts` - Endpoint POST /api/mcp/projects para listar proyectos accesibles
- `src/app/api/mcp/projects/route.test.ts` - Unit tests para endpoint de proyectos
- `src/app/api/mcp/query-project/route.ts` - Endpoint POST /api/mcp/query-project para consultar videos de un proyecto
- `src/app/api/mcp/query-project/route.test.ts` - Unit tests para endpoint de consulta de proyecto
- `src/app/api/mcp/query-videos/route.ts` - Endpoint POST /api/mcp/query-videos para consultar videos específicos
- `src/app/api/mcp/query-videos/route.test.ts` - Unit tests para endpoint de consulta de videos

### Notes

- Unit tests should typically be placed alongside the code files they are testing (e.g., `route.tsx` and `route.test.tsx` in the same directory).
- Use `npx jest [optional/path/to/test/file]` to run tests. Running without a path executes all tests found by the Jest configuration.

## Tasks

- [x] 1.0 Crear servicio de autenticación MCP reutilizable
  - [x] 1.1 Crear tipos TypeScript para MCP authentication (McpAuthResult, McpKeyData)
  - [x] 1.2 Implementar validación de host usando process.env.EIDETIK_MCP_HOST (localhost:5058 / mcp.eidetik.com)
  - [x] 1.3 Implementar validación de formato MCP Key (regex pcsk_[A-Za-z0-9]{30,})
  - [x] 1.4 Implementar búsqueda de MCP Key en colección McpKeys de PayloadCMS
  - [x] 1.5 Extraer usuario y proyectos asociados a la MCP Key para control de acceso
  - [x] 1.6 Crear función reutilizable authenticateMcp() que retorne usuario y proyectos accesibles
  - [x] 1.7 Escribir unit tests completos para el servicio de autenticación

- [x] 2.0 Implementar endpoint de listado de proyectos (/api/mcp/projects)
  - [x] 2.1 Crear estructura de carpeta /api/mcp/projects/ con route.ts
  - [x] 2.2 Implementar POST handler usando servicio de autenticación
  - [x] 2.3 Obtener proyectos accesibles según relación MCP Key → Projects en PayloadCMS
  - [x] 2.4 Devolver todos los campos de la colección Projects (usando tipos de payload-types.ts)
  - [x] 2.5 Implementar manejo de errores 401/403/500 específicos del endpoint
  - [x] 2.6 Escribir unit tests para casos exitosos y de error del endpoint

- [x] 3.0 Implementar endpoint de consulta de proyecto (/api/mcp/query-project)
  - [x] 3.1 Crear estructura de carpeta /api/mcp/query-project/ con route.ts
  - [x] 3.2 Implementar POST handler con autenticación MCP
  - [x] 3.3 Validar que la MCP Key tiene acceso al project_id especificado
  - [x] 3.4 Implementar generación de embedding usando OpenAI (text-embedding-3-small, 1024 dim)
  - [x] 3.5 Implementar consulta a Pinecone usando namespace "project-{projectId}-videos"
  - [x] 3.6 Devolver records completos de Pinecone con scores y metadata
  - [x] 3.7 Implementar validación de longitud de pregunta (máximo 2000 caracteres)
  - [x] 3.8 Escribir unit tests para autenticación, validaciones y consulta exitosa

- [x] 4.0 Implementar endpoint de consulta de videos específicos (/api/mcp/query-videos)
  - [x] 4.1 Crear estructura de carpeta /api/mcp/query-videos/ con route.ts
  - [x] 4.2 Implementar POST handler con autenticación MCP
  - [x] 4.3 Validar que todos los videos_id pertenecen a proyectos accesibles por la MCP Key
  - [x] 4.4 Implementar generación de embedding (mismo proceso que query-project)
  - [x] 4.5 Implementar consulta a Pinecone filtrando por resourceIds especificados
  - [x] 4.6 Devolver records completos de Pinecone con metadata
  - [x] 4.7 Escribir unit tests para validación de acceso a videos y consulta

- [x] 5.0 Implementar manejo de errores y validaciones completas
  - [x] 5.1 Estandarizar respuestas de error con códigos HTTP apropiados (401, 403, 404, 400, 500)
  - [x] 5.2 Implementar logging de seguridad para intentos de autenticación fallidos
  - [x] 5.3 Implementar logging de accesos exitosos con usuario y proyecto
  - [x] 5.4 Crear mensajes de error consistentes y descriptivos para cada endpoint
  - [x] 5.5 Implementar validación de input completa (JSON malformado, campos requeridos)
  - [x] 5.6 Preparar estructura para rate limiting futuro (logging de uso por MCP Key) 