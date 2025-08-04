# PRD: MCP API Endpoints

## Introducción/Overview

Este feature desarrolla un sistema de endpoints de API seguros para que el MCP (Model Context Protocol) externo se conecte a Eidetik de forma controlada. Actualmente el MCP accede directamente a Pinecone, lo cual es un problema de seguridad y arquitectura. 

**Problema actual:** MCP → Pinecone (directo, inseguro)
**Solución:** MCP → API Eidetik → Pinecone (seguro, controlado)

El objetivo es crear endpoints en `/api/mcp/` que manejen la autenticación via MCP Keys y proporcionen acceso controlado a los datos vectoriales de videos almacenados en Pinecone.

## Goals

1. **Seguridad:** Implementar autenticación robusta para MCP usando claves API existentes
2. **Control de acceso:** Asegurar que cada MCP solo acceda a proyectos autorizados
3. **Arquitectura correcta:** Centralizar el acceso a Pinecone a través de la API de Eidetik
4. **Funcionalidad completa:** Proporcionar endpoints para listar proyectos y consultar videos
5. **Reutilización:** Crear servicios de autenticación reutilizables para múltiples endpoints

## User Stories

**Como desarrollador del MCP externo:**
- Quiero autenticarme con una MCP Key para acceder a los datos de videos
- Quiero obtener la lista de proyectos a los que tengo acceso
- Quiero consultar videos de un proyecto específico mediante embeddings
- Quiero consultar videos específicos por sus IDs

**Como administrador de Eidetik:**
- Quiero que el MCP no acceda directamente a Pinecone
- Quiero controlar qué proyectos puede ver cada MCP Key
- Quiero validar que las requests vienen del host autorizado

## Functional Requirements

### 1. Servicio de Autenticación MCP
1.1. El sistema debe validar que las requests provienen del host configurado en `process.env.EIDETIK_MCP_HOST`
- Local: `localhost:8081`
- Producción: `mcp.eidetik.com`

1.2. El sistema debe verificar MCP Keys con formato `pcsk_BNZgQtrBRDonm07tcwcVmU1BsUaQRn8x` pasadas en header `Authorization: Bearer <mcp_key>`

1.3. El sistema debe validar que la MCP Key existe en la colección McpKeys de PayloadCMS

1.4. El sistema debe extraer el usuario y proyectos asociados a la MCP Key para control de acceso

1.5. El servicio de autenticación debe ser reutilizable entre diferentes endpoints MCP

### 2. Endpoint: Listar Proyectos (`POST /api/mcp/projects`)
2.1. Debe autenticar la MCP Key usando el servicio del punto 1

2.2. Debe devolver únicamente los proyectos a los que tiene acceso la MCP Key (según relación en PayloadCMS)

2.3. Debe devolver todos los campos de la colección Projects

2.4. Respuesta exitosa: Status 200 con array de proyectos completos

### 3. Endpoint: Consultar Proyecto (`POST /api/mcp/query-project`)
3.1. Debe autenticar la MCP Key

3.2. Debe validar que la MCP Key tiene acceso al `project_id` especificado

3.3. Debe generar embedding de la pregunta usando OpenAI:
```javascript
const embeddingResponse = await openai.embeddings.create({
  model: "text-embedding-3-small", 
  input: pregunta,
  dimensions: 1024,
});
```

3.4. Debe consultar Pinecone usando namespace `project-{projectId}-videos`

3.5. Debe devolver los records completos de Pinecone con toda su metadata

### 4. Endpoint: Consultar Videos Específicos (`POST /api/mcp/query-videos`)
4.1. Debe autenticar la MCP Key

4.2. Debe validar que todos los `videos_id` pertenecen a proyectos accesibles por la MCP Key

4.3. Debe generar embedding de la pregunta (mismo proceso que 3.3)

4.4. Debe consultar Pinecone filtrando por los resourceIds especificados

4.5. Debe devolver los records completos de Pinecone

### 5. Manejo de Errores
5.1. Error 401: MCP Key inválida, expirada o host no autorizado

5.2. Error 403: MCP Key válida pero sin acceso al proyecto/video solicitado

5.3. Error 404: Proyecto o video no encontrado

5.4. Error 400: Request mal formada (pregunta muy larga, parámetros faltantes)

5.5. Error 500: Errores de Pinecone u OpenAI con logging detallado

5.6. Error 429: Rate limiting (preparado para implementación futura)

## Non-Goals (Out of Scope)

- Rate limiting por MCP Key (se implementará en PR futuro)
- Paginación de resultados
- Transformación o agrupación de respuestas de Pinecone
- Gestión de MCP Keys (ya existe en la interfaz actual)
- Optimización de queries a Pinecone
- Cache de embeddings
- Múltiples hosts MCP simultáneos

## Design Considerations

### Estructura de Endpoints
```
/src/app/api/mcp/
├── auth-service.ts          # Servicio reutilizable de autenticación
├── projects/
│   └── route.ts            # POST /api/mcp/projects
├── query-project/
│   └── route.ts            # POST /api/mcp/query-project
└── query-videos/
    └── route.ts            # POST /api/mcp/query-videos
```

### Formato de Request/Response

**Autenticación (todos los endpoints):**
```
Headers: Authorization: Bearer pcsk_BNZgQtrBRDonm07tcwcVmU1BsUaQRn8x
```

**POST /api/mcp/projects**
```javascript
// Request: Solo headers de auth
// Response 200:
[
  {
    "id": "prj_42",
    "name": "E-commerce B2B", 
    // ... todos los campos de Projects collection
  }
]
```

**POST /api/mcp/query-project**
```javascript
// Request:
{
  "project_id": "prj_42",
  "question": "¿En qué vídeos del curso habla de...?"
}

// Response 200:
{
  "records": [
    {
      "id": "6868550053d3e67c9b87a600--chunk-13",
      "score": 0.85,
      "metadata": {
        "chunkIndex": 13,
        "description": "...",
        "endTime": 210000,
        "fileName": "...",
        "resourceId": "...",
        // ... metadata completa
      }
    }
  ]
}
```

## Technical Considerations

### Dependencias
- Usar PayloadCMS para acceso a colecciones McpKeys y Projects
- Integrar con OpenAI para generación de embeddings
- Conectar con Pinecone existente usando namespaces por proyecto
- Reutilizar configuración de OpenAI y Pinecone existente

### Validaciones
- Host validation usando `request.headers.host` vs `process.env.EIDETIK_MCP_HOST`
- MCP Key format validation (regex `pcsk_[A-Za-z0-9]{30,}`)
- Project access validation cruzando MCP Key → User → Projects
- Query length validation (máximo 2000 caracteres)

### Logging y Monitoreo
- Log de intentos de autenticación fallidos
- Log de accesos exitosos con usuario y proyecto
- Error logging detallado para debugging
- Tracking de uso por MCP Key (preparar para rate limiting futuro)

## Success Metrics

1. **Funcionalidad:** MCP externo puede autenticarse y consultar datos sin acceso directo a Pinecone
2. **Seguridad:** 0 accesos no autorizados a proyectos
3. **Performance:** Response time < 2 segundos para queries típicas
4. **Reliability:** 99%+ uptime de endpoints MCP
5. **Adoption:** MCP migrado completamente a nuevos endpoints

## Open Questions

1. ¿Necesitamos logging específico para auditoría de accesos MCP?
2. ¿Queremos implementar cache de embeddings frecuentes?
3. ¿Deberíamos añadir timeout configurables para requests a OpenAI/Pinecone?
4. ¿Es necesario versionado de API (/v1/mcp/) desde el inicio? 