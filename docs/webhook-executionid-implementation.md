# Implementación de Webhook por ExecutionId

## Problema Resuelto

Con la migración del envío de webhooks a `beforeChange`, el problema era que no teníamos el `resourceId` disponible cuando se enviaba el webhook inicial, por lo que la ruta `/:id/webhook` no funcionaba.

## Solución Implementada

### Nueva Ruta: `/webhook`

Se ha creado una nueva ruta en la colección Resources que busca el resource por `executionId` en lugar de por ID directo:

**Endpoint:** `POST /collections/api/resources/webhook`

### Flujo Actualizado

1. **Creación de Resource (beforeChange)**:
   - Se envía webhook a n8n con los datos del resource
   - N8n responde con `executionId` 
   - Se guarda el resource con el `executionId` incluido

2. **Procesamiento en N8n**:
   - N8n procesa el resource normalmente
   - Al completar (éxito o error), envía webhook a la nueva ruta

3. **Webhook de Resultado**:
   - **URL**: `/collections/api/resources/webhook` (nueva ruta)
   - **Body**: Incluye `executionId` y resto de parámetros
   - **Búsqueda**: Encuentra el resource por `executionId`
   - **Procesamiento**: Aplica la misma lógica que antes

### Estructura del Body

```json
{
  "executionId": "12345",
  "status": "completed", // o "failed" o "error"
  "analyzeResult": { 
    "fields": {
      "campo1": { "value": "valor1", "confidence": 0.95 },
      "campo2": { "value": "valor2", "confidence": 0.87 }
    }
  },
  "modelId": "model-123",
  "modelo": "azure-document-intelligence", 
  "caso": "factura_suministros",
  "tipo": "electricidad",
  "errorMessage": "..." // Solo para errores
}
```

### Funcionalidades Preservadas

La nueva ruta mantiene **toda** la funcionalidad de la ruta anterior:

✅ **Manejo de errores**: Status `failed`/`error` con logs detallados
✅ **Procesamiento exitoso**: Status `completed` con `analyzeResult`
✅ **Merge de datos**: Preserva ediciones manuales existentes
✅ **Campos automáticos**: Actualiza `caso` y `tipo` si vienen en el body
✅ **Auto-registro**: Registra nuevas keys en `field-translations`
✅ **Confidence**: Calcula automáticamente el campo confidence
✅ **Logs detallados**: Mismo formato de logs que antes

### Validaciones

- ✅ **ExecutionId requerido**: Valida que `executionId` esté en el body
- ✅ **Resource existe**: Busca y valida que existe un resource con ese `executionId`
- ✅ **AnalyzeResult**: Valida que `analyzeResult` esté presente para casos exitosos
- ✅ **Manejo de errores**: Respuestas HTTP apropiadas para cada caso

### Respuestas

**Éxito:**
```json
{
  "success": true,
  "data": {
    "id": "resource_id",
    "executionId": "12345"
  }
}
```

**Error - ExecutionId no encontrado:**
```json
{
  "success": false,
  "error": "No se encontró resource con executionId: 12345",
  "executionId": "12345"
}
```

### Migración

- ✅ **Ruta anterior**: `/:id/webhook` se mantiene para compatibilidad
- ✅ **Nueva ruta**: `/webhook` para casos con `executionId`
- ✅ **Sin breaking changes**: El sistema existente sigue funcionando

### Testing

El endpoint incluye documentación accesible via GET:

```bash
curl -X GET http://localhost:3000/api/resources/webhook
```

### Configuración en N8n

Actualizar los webhooks de N8n para usar la nueva URL:

**Antes:** `https://tu-dominio.com/collections/api/resources/{resourceId}/webhook`
**Ahora:** `https://tu-dominio.com/collections/api/resources/webhook`

Y asegurar que el `executionId` se incluya en el body del webhook.
