# 🔗 MCP API Reference - Eidetik

Documentación completa de los endpoints MCP para desarrolladores que implementen clientes MCP.

## 📋 Índice de Endpoints

1. [POST /api/mcp/auth](#1-post-apimcpauth) - Configuración inicial
2. [POST /api/mcp/projects](#2-post-apimcpprojects) - Listar proyectos
3. [POST /api/mcp/query-project](#3-post-apimcpquery-project) - Búsqueda por proyecto
4. [POST /api/mcp/query-videos](#4-post-apimcpquery-videos) - Búsqueda en videos específicos

---

## 🔐 Autenticación Global

**Todos los endpoints requieren:**
```http
Authorization: Bearer <mcp_key>
Content-Type: application/json
```

**Formato MCP Key:** `pcsk_[A-Za-z0-9]{30,}`  
**Ejemplo:** `pcsk_BNZgQtrBRDonm07tcwcVmU1BsUaQRn8x`

---

## 1. POST /api/mcp/auth

**Propósito:** Configuración inicial y verificación de autenticación MCP.

### Request Structure
```http
POST /api/mcp/auth
Authorization: Bearer pcsk_BNZgQtrBRDonm07tcwcVmU1BsUaQRn8x
Content-Type: application/json

// No body required
```

### Response Success (200)
```json
{
  "authenticated": true,
  "mcpKey": {
    "id": "675a1234567890abcdef1234",
    "name": "Production MCP Key",
    "lastFour": "Rn8x",
    "hasAllProjects": true,
    "createdAt": "2024-01-15T10:30:00.000Z"
  },
  "user": {
    "id": "675a0987654321fedcba0987",
    "email": "admin@company.com",
    "name": "Admin User"
  },
  "systemConfig": {
    "authorizedHost": "mcp.eidetik.com",
    "apiVersion": "1.0.0",
    "availableEndpoints": [
      "/api/mcp/auth",
      "/api/mcp/projects",
      "/api/mcp/query-project",
      "/api/mcp/query-videos"
    ],
    "limits": {
      "maxQuestionLength": 2000,
      "maxVideosPerQuery": 50
    },
    "rateLimits": {
      "enabled": false,
      "endpoints": {
        "/api/mcp/auth": {
          "requestsPerMinute": 60,
          "requestsPerHour": 300,
          "requestsPerDay": 2000
        },
        "/api/mcp/projects": {
          "requestsPerMinute": 30,
          "requestsPerHour": 500,
          "requestsPerDay": 5000
        },
        "/api/mcp/query-project": {
          "requestsPerMinute": 10,
          "requestsPerHour": 100,
          "requestsPerDay": 1000
        },
        "/api/mcp/query-videos": {
          "requestsPerMinute": 10,
          "requestsPerHour": 100,
          "requestsPerDay": 1000
        }
      }
    }
  },
  "accessibleProjects": {
    "total": 3,
    "projects": [
      {
        "id": "675a1111222233334444aaaa",
        "title": "E-commerce Training Videos",
        "slug": "ecommerce-training",
        "description": "Complete course on e-commerce strategies",
        "createdAt": "2024-01-10T09:00:00.000Z",
        "updatedAt": "2024-01-15T14:30:00.000Z",
        "stats": {
          "resourceCount": null
        }
      },
      {
        "id": "675a2222333344445555bbbb",
        "title": "Marketing Fundamentals",
        "slug": "marketing-fundamentals",
        "description": null,
        "createdAt": "2024-01-12T11:15:00.000Z",
        "updatedAt": "2024-01-14T16:45:00.000Z",
        "stats": {
          "resourceCount": null
        }
      }
    ]
  },
  "systemInfo": {
    "timestamp": "2024-01-20T10:15:30.123Z",
    "eidetikVersion": "1.0.0",
    "services": {
      "embeddings": "available",
      "vectorDatabase": "available",
      "authentication": "available"
    }
  },
  "timestamp": "2024-01-20T10:15:30.123Z",
  "status": 200
}
```

### Response Error (401)
```json
{
  "error": "MCP API key not found or invalid",
  "code": "KEY_NOT_FOUND",
  "timestamp": "2024-01-20T10:15:30.123Z",
  "status": 401
}
```

---

## 2. POST /api/mcp/projects

**Propósito:** Obtener lista de proyectos accesibles por la MCP Key.

### Request Structure
```http
POST /api/mcp/projects
Authorization: Bearer pcsk_BNZgQtrBRDonm07tcwcVmU1BsUaQRn8x
Content-Type: application/json

// No body required
```

### Response Success (200)
```json
{
  "total": 3,
  "projects": [
    {
      "id": "675a1111222233334444aaaa",
      "title": "E-commerce Training Videos",
      "slug": "ecommerce-training", 
      "description": "Complete course on e-commerce strategies and implementation",
      "createdAt": "2024-01-10T09:00:00.000Z",
      "updatedAt": "2024-01-15T14:30:00.000Z",
      "createdBy": "675a0987654321fedcba0987"
    },
    {
      "id": "675a2222333344445555bbbb",
      "title": "Marketing Fundamentals",
      "slug": "marketing-fundamentals",
      "description": null,
      "createdAt": "2024-01-12T11:15:00.000Z", 
      "updatedAt": "2024-01-14T16:45:00.000Z",
      "createdBy": "675a0987654321fedcba0987"
    },
    {
      "id": "675a3333444455556666cccc",
      "title": "Advanced Sales Techniques",
      "slug": "advanced-sales",
      "description": "Professional sales training for experienced teams",
      "createdAt": "2024-01-08T14:20:00.000Z",
      "updatedAt": "2024-01-16T09:10:00.000Z", 
      "createdBy": "675a0987654321fedcba0987"
    }
  ],
  "timestamp": "2024-01-20T10:15:30.123Z",
  "status": 200
}
```

### Response Error (403)
```json
{
  "error": "MCP key does not have access to projects",
  "code": "NO_PROJECT_ACCESS",
  "timestamp": "2024-01-20T10:15:30.123Z",
  "status": 403
}
```

---

## 3. POST /api/mcp/query-project

**Propósito:** Realizar búsqueda semántica en todos los videos de un proyecto específico.

### Request Structure
```http
POST /api/mcp/query-project
Authorization: Bearer pcsk_BNZgQtrBRDonm07tcwcVmU1BsUaQRn8x
Content-Type: application/json

{
  "project_id": "675a1111222233334444aaaa",
  "question": "¿Qué estrategias de marketing digital se mencionan para aumentar las ventas?"
}
```

### Request Body Schema
```typescript
{
  project_id: string,    // Required - ID del proyecto
  question: string       // Required - Pregunta (máx 2000 caracteres)
}
```

### Response Success (200)
```json
{
  "records": [
    {
      "id": "675a1111222233334444aaaa--chunk-5",
      "score": 0.892,
      "metadata": {
        "chunkIndex": 5,
        "description": "En este segmento, el instructor explica las estrategias de marketing digital más efectivas para e-commerce, incluyendo SEO, redes sociales y email marketing. Se muestran ejemplos prácticos de campañas exitosas.",
        "startTime": 45000,
        "endTime": 67000,
        "start_ms": 45000,
        "end_ms": 67000,
        "fileName": "Marketing Digital para E-commerce",
        "namespace": "project-675a1111222233334444aaaa-videos",
        "resourceId": "675a4444555566667777dddd",
        "segmentId": "675a1111222233334444aaaa--chunk-5",
        "transcript": "[{\"text\":\"Las estrategias de marketing digital más efectivas incluyen optimización SEO\",\"start_ms\":0,\"end_ms\":4200,\"confidence\":0.89},{\"text\":\"el uso estratégico de redes sociales como Instagram y Facebook\",\"start_ms\":4200,\"end_ms\":8100,\"confidence\":0.92}]",
        "type": "video"
      }
    },
    {
      "id": "675a1111222233334444aaaa--chunk-12", 
      "score": 0.845,
      "metadata": {
        "chunkIndex": 12,
        "description": "Continuación del módulo de marketing digital, se profundiza en técnicas de retargeting y automatización de email marketing para maximizar conversiones.",
        "startTime": 134000,
        "endTime": 156000,
        "start_ms": 134000,
        "end_ms": 156000,
        "fileName": "Marketing Digital para E-commerce",
        "namespace": "project-675a1111222233334444aaaa-videos",
        "resourceId": "675a4444555566667777dddd",
        "segmentId": "675a1111222233334444aaaa--chunk-12",
        "transcript": "[{\"text\":\"El retargeting es fundamental para recuperar visitantes\",\"start_ms\":0,\"end_ms\":3800,\"confidence\":0.87}]",
        "type": "video"
      }
    }
  ],
  "timestamp": "2024-01-20T10:15:30.123Z",
  "status": 200
}
```

### Response Error (400)
```json
{
  "error": "Question exceeds maximum length of 2000 characters",
  "code": "QUESTION_TOO_LONG",
  "timestamp": "2024-01-20T10:15:30.123Z",
  "status": 400
}
```

### Response Error (403)
```json
{
  "error": "MCP key does not have access to the specified project",
  "code": "NO_PROJECT_ACCESS", 
  "timestamp": "2024-01-20T10:15:30.123Z",
  "status": 403
}
```

---

## 4. POST /api/mcp/query-videos

**Propósito:** Realizar búsqueda semántica en videos específicos.

### Request Structure
```http
POST /api/mcp/query-videos
Authorization: Bearer pcsk_BNZgQtrBRDonm07tcwcVmU1BsUaQRn8x
Content-Type: application/json

{
  "videos_id": [
    "675a4444555566667777dddd",
    "675a5555666677778888eeee"
  ],
  "question": "¿Cómo se configura el sistema de pagos en la plataforma?"
}
```

### Request Body Schema
```typescript
{
  videos_id: string[],   // Required - Array de IDs de videos (no vacío)
  question: string       // Required - Pregunta (máx 2000 caracteres)
}
```

### Response Success (200)
```json
{
  "records": [
    {
      "id": "675a4444555566667777dddd--chunk-8",
      "score": 0.924,
      "metadata": {
        "chunkIndex": 8,
        "description": "Explicación detallada de la configuración del sistema de pagos, incluyendo integración con PayPal, Stripe y configuración de webhooks para confirmación de transacciones.",
        "startTime": 78000,
        "endTime": 95000,
        "start_ms": 78000,
        "end_ms": 95000,
        "fileName": "Configuración de Pagos E-commerce",
        "namespace": "project-675a1111222233334444aaaa-videos",
        "resourceId": "675a4444555566667777dddd",
        "segmentId": "675a4444555566667777dddd--chunk-8",
        "transcript": "[{\"text\":\"Para configurar el sistema de pagos, primero accede al panel de administración\",\"start_ms\":0,\"end_ms\":4500,\"confidence\":0.93}]",
        "type": "video"
      }
    },
    {
      "id": "675a5555666677778888eeee--chunk-3",
      "score": 0.887,
      "metadata": {
        "chunkIndex": 3,
        "description": "Demonstración práctica de configuración de métodos de pago alternativos y configuración de monedas múltiples en la plataforma e-commerce.",
        "startTime": 34000,
        "endTime": 52000,
        "start_ms": 34000,
        "end_ms": 52000,
        "fileName": "Métodos de Pago Avanzados",
        "namespace": "project-675a1111222233334444aaaa-videos", 
        "resourceId": "675a5555666677778888eeee",
        "segmentId": "675a5555666677778888eeee--chunk-3",
        "transcript": "[{\"text\":\"Los métodos de pago alternativos incluyen transferencias bancarias\",\"start_ms\":0,\"end_ms\":3200,\"confidence\":0.91}]",
        "type": "video"
      }
    }
  ],
  "timestamp": "2024-01-20T10:15:30.123Z",
  "status": 200
}
```

### Response Error (400)
```json
{
  "error": "Array field cannot be empty",
  "code": "EMPTY_ARRAY",
  "timestamp": "2024-01-20T10:15:30.123Z",
  "status": 400
}
```

### Response Error (404)
```json
{
  "error": "One or more specified videos were not found",
  "code": "VIDEO_NOT_FOUND",
  "timestamp": "2024-01-20T10:15:30.123Z", 
  "status": 404
}
```

### Response Error (403)
```json
{
  "error": "MCP key does not have access to one or more specified videos",
  "code": "NO_VIDEO_ACCESS",
  "timestamp": "2024-01-20T10:15:30.123Z",
  "status": 403
}
```

---

## 🚨 Errores Comunes

### Errores de Autenticación (401)
```json
{
  "error": "Request host is not authorized for MCP API access",
  "code": "INVALID_HOST",
  "timestamp": "2024-01-20T10:15:30.123Z",
  "status": 401
}
```

```json
{
  "error": "MCP API key format is invalid", 
  "code": "INVALID_KEY_FORMAT",
  "timestamp": "2024-01-20T10:15:30.123Z",
  "status": 401
}
```

### Errores de Validación (400)
```json
{
  "error": "Request body contains invalid JSON format",
  "code": "INVALID_REQUEST_FORMAT", 
  "timestamp": "2024-01-20T10:15:30.123Z",
  "status": 400
}
```

```json
{
  "error": "One or more required fields are missing",
  "code": "MISSING_REQUIRED_FIELDS",
  "timestamp": "2024-01-20T10:15:30.123Z",
  "status": 400
}
```

### Errores del Servidor (500)
```json
{
  "error": "Failed to generate embeddings using OpenAI service",
  "code": "OPENAI_ERROR",
  "timestamp": "2024-01-20T10:15:30.123Z",
  "status": 500
}
```

```json
{
  "error": "Failed to query vector database",
  "code": "PINECONE_ERROR",
  "timestamp": "2024-01-20T10:15:30.123Z",
  "status": 500
}
```

### Método No Permitido (405)
```json
{
  "error": "Method not allowed. Use POST instead.",
  "code": "METHOD_NOT_ALLOWED",
  "timestamp": "2024-01-20T10:15:30.123Z",
  "status": 405
}
```

---

## 💡 Ejemplos de Implementación

### JavaScript/TypeScript Client
```typescript
class EidetikMCPClient {
  private baseUrl: string;
  private mcpKey: string;

  constructor(baseUrl: string, mcpKey: string) {
    this.baseUrl = baseUrl;
    this.mcpKey = mcpKey;
  }

  private async request(endpoint: string, body?: any) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.mcpKey}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`API Error ${response.status}: ${error.error} (${error.code})`);
    }

    return response.json();
  }

  async authenticate() {
    return this.request('/api/mcp/auth');
  }

  async getProjects() {
    return this.request('/api/mcp/projects');
  }

  async queryProject(projectId: string, question: string) {
    return this.request('/api/mcp/query-project', {
      project_id: projectId,
      question: question
    });
  }

  async queryVideos(videoIds: string[], question: string) {
    return this.request('/api/mcp/query-videos', {
      videos_id: videoIds,
      question: question
    });
  }
}

// Uso:
const client = new EidetikMCPClient(
  'https://api.eidetik.com', 
  'pcsk_BNZgQtrBRDonm07tcwcVmU1BsUaQRn8x'
);

const config = await client.authenticate();
const projects = await client.getProjects();
const results = await client.queryProject('675a1111222233334444aaaa', '¿Cómo configurar pagos?');
```

### Python Client
```python
import requests
import json

class EidetikMCPClient:
    def __init__(self, base_url: str, mcp_key: str):
        self.base_url = base_url
        self.headers = {
            'Authorization': f'Bearer {mcp_key}',
            'Content-Type': 'application/json'
        }
    
    def _request(self, endpoint: str, body: dict = None):
        url = f"{self.base_url}{endpoint}"
        response = requests.post(url, headers=self.headers, json=body)
        
        if not response.ok:
            error_data = response.json()
            raise Exception(f"API Error {response.status_code}: {error_data['error']} ({error_data['code']})")
        
        return response.json()
    
    def authenticate(self):
        return self._request('/api/mcp/auth')
    
    def get_projects(self):
        return self._request('/api/mcp/projects')
    
    def query_project(self, project_id: str, question: str):
        return self._request('/api/mcp/query-project', {
            'project_id': project_id,
            'question': question
        })
    
    def query_videos(self, video_ids: list, question: str):
        return self._request('/api/mcp/query-videos', {
            'videos_id': video_ids,
            'question': question
        })

# Uso:
client = EidetikMCPClient(
    'https://api.eidetik.com',
    'pcsk_BNZgQtrBRDonm07tcwcVmU1BsUaQRn8x'
)

config = client.authenticate()
projects = client.get_projects()
results = client.query_project('675a1111222233334444aaaa', '¿Cómo configurar pagos?')
```

---

## ⚙️ Configuración de Entorno

### Variables de Entorno Necesarias
```bash
EIDETIK_MCP_HOST=localhost:5058  # En desarrollo
EIDETIK_MCP_HOST=mcp.eidetik.com # En producción
```

### Rate Limiting (Futuro)
Actualmente deshabilitado, pero preparado para activación:
- **Auth:** 60/min, 300/hora, 2000/día
- **Projects:** 30/min, 500/hora, 5000/día  
- **Query endpoints:** 10/min, 100/hora, 1000/día

---

## 🔒 Seguridad

1. **Host Validation:** Solo hosts autorizados pueden conectarse
2. **MCP Key Format:** Validación estricta del formato `pcsk_*`
3. **Project Access:** Verificación de permisos por proyecto
4. **Rate Limiting:** Sistema preparado para prevenir abuso
5. **Logging:** Registro completo de accesos y errores
6. **Error Handling:** No exposición de información interna

---

## 📞 Soporte

- **Documentación:** Este documento
- **Logs:** Todos los requests se registran con IDs únicos
- **Errores:** Códigos específicos para debugging
- **Tests:** 96.4% success rate en test suite 