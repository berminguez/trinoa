# Autenticación en Eidetik MVP

## Sistema de Autenticación

Eidetik utiliza el sistema nativo de autenticación de Payload CMS que soporta dos métodos:

1. **JWT Authentication** - Para usuarios web y aplicaciones que manejan sesiones
2. **API Key Authentication** - Para aplicaciones externas y servicios que necesitan acceso programático

## 1. JWT Authentication (Usuarios Web)

### Obtener Token JWT

```bash
POST /api/users/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "your-password"
}
```

**Respuesta:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "123",
    "email": "user@example.com",
    "name": "Usuario",
    "role": "user"
  }
}
```

### Usar Token JWT

```bash
GET /api/resources/123
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 2. API Key Authentication (Apps Externas)

### Configurar API Keys

1. **Acceder al Admin Panel**
   ```
   http://localhost:3000/admin
   ```

2. **Crear Usuario para API**
   - Ir a Users → Create New
   - Email: `api@tu-servicio.com`
   - Password: (generar password seguro)
   - Role: `api` (para permisos básicos) o `admin` (para acceso completo)

3. **Generar API Key**
   - Editar el usuario creado
   - En la sección "API Key", hacer clic en "Generate API Key"
   - Copiar y guardar la API Key generada

### Usar API Key

```bash
GET /api/resources/123
Authorization: users API-Key eid_1234567890abcdef...
```

## 3. Roles y Permisos

| Rol    | Permisos                    | Descripción |
|--------|-----------------------------|-------------|
| `admin`| `*` (todos)                | Acceso completo a toda la API |
| `api`  | `read`, `write`, `delete`  | Permisos básicos para apps externas |
| `user` | `read`                     | Solo lectura |

## 4. Endpoints Protegidos

Todos los endpoints REST de recursos utilizan el sistema nativo de Payload CMS:

**Endpoints Automáticos de Payload:**
- `GET /api/resources` - Listar recursos
- `GET /api/resources/{id}` - Obtener recurso específico
- `POST /api/resources` - Crear nuevo recurso
- `PATCH /api/resources/{id}` - Actualizar recurso
- `DELETE /api/resources/{id}` - Eliminar recurso (con limpieza automática de S3 y Pinecone)

**Endpoints Personalizados:**
- `GET /api/resources/{id}/logs` - Obtener logs detallados con filtros

## 5. Ejemplos de Uso

### JavaScript/Node.js con JWT

```javascript
// Login
const loginResponse = await fetch('/api/users/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password'
  })
})

const { token } = await loginResponse.json()

// Usar token
const response = await fetch('/api/resources/123', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
```

### cURL con API Key

```bash
# Obtener recurso
curl -H "Authorization: users API-Key eid_your_api_key_here" \
     http://localhost:3000/api/resources/123

# Eliminar recurso
curl -X DELETE \
     -H "Authorization: users API-Key eid_your_api_key_here" \
     http://localhost:3000/api/resources/123
```

### Python con API Key

```python
import requests

headers = {
    'Authorization': 'users API-Key eid_your_api_key_here',
    'Content-Type': 'application/json'
}

# Obtener recurso
response = requests.get(
    'http://localhost:3000/api/resources/123',
    headers=headers
)

print(response.json())
```

## 6. Seguridad

### Mejores Prácticas

1. **Rotación de API Keys**
   - Regenerar API Keys periódicamente
   - Eliminar API Keys no utilizadas

2. **Principio de Menor Privilegio**
   - Asignar rol `api` para servicios externos (no `admin`)
   - Crear usuarios específicos por servicio/integración

3. **Almacenamiento Seguro**
   - No hardcodear API Keys en código
   - Usar variables de entorno
   - No commitear credenciales al repositorio

4. **Monitoreo**
   - Revisar logs de acceso regularmente
   - Investigar patrones de uso inusuales

### Variables de Entorno

```bash
# Para aplicaciones que consumen la API
EIDETIK_API_KEY=eid_your_api_key_here
EIDETIK_API_URL=http://localhost:3000
```

## 7. Respuestas de Error

### Sin Autenticación (401)

```json
{
  "success": false,
  "error": "Authentication required",
  "message": "Authentication token is required...",
  "hint": "Use one of these authentication methods:",
  "authMethods": {
    "jwt": {
      "description": "Get JWT token from login",
      "endpoint": "/api/users/login",
      "header": "Authorization: Bearer <token>"
    },
    "apiKey": {
      "description": "Use API Key (generate from admin panel)",
      "header": "Authorization: users API-Key <your-api-key>"
    }
  }
}
```

### Sin Permisos (403)

```json
{
  "success": false,
  "error": "Permission 'delete' required. Current role: user"
}
```

## 8. Limitaciones del MVP

- No hay rate limiting implementado
- No hay registro de auditoría de API Keys
- API Keys no expiran automáticamente
- No hay scopes granulares de permisos

Estas funcionalidades se implementarán en versiones futuras según las necesidades del producto. 