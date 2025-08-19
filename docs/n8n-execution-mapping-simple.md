# Sistema Simple de Mapeo de Ejecuciones N8n

Sistema simplificado para mapear `executionId` de n8n con resources de Trinoa y gestionar errores.

## Cómo Funciona

### 1. Campo ExecutionId en Resources
- Se ha añadido el campo `executionId` (string) a la colección Resources
- Campo de solo lectura, gestionado automáticamente por el sistema
- Visible en el sidebar del admin panel

### 2. Flujo Normal (Éxito)

1. **Inicio de Creación**: Se inicia la creación de un nuevo resource en Trinoa
2. **Webhook a N8n**: El hook `beforeChange` envía webhook a n8n con datos del resource
3. **Respuesta de N8n**: N8n responde con `executionId` en el JSON de respuesta:
   ```json
   {
     "success": true,
     "executionId": "{{$execution.id}}",
     "message": "Workflow started successfully"
   }
   ```
4. **Guardado Automático**: El `executionId` se incluye en los datos del resource antes de guardarlo
5. **Resource Creado**: Se guarda el resource con el `executionId` en una sola operación
6. **Procesamiento**: N8n procesa el resource normalmente
7. **Webhook de Resultado**: N8n envía resultado final al webhook existente `/api/resources/:id/webhook`

### 3. Flujo de Error

1. **Error en N8n**: El workflow de n8n falla durante el procesamiento
2. **Error Workflow**: El Error Workflow de n8n se activa automáticamente
3. **Webhook de Error**: El Error Workflow llama a `/api/resources/errors` con:
   ```json
   {
     "status": "failed",
     "errorMessage": "Error de procesamiento",
     "executionId": 231,
     "lastNodeExecuted": "Node With Error",
     "errorStack": "Stack trace opcional",
     "workflowName": "Workflow Name opcional"
   }
   ```
4. **Búsqueda de Resource**: El webhook busca el resource que tenga `executionId = execution.id`
5. **Actualización de Resource**: Marca el resource como `failed` y agrega log de error

## Configuración Requerida en N8n

### Workflow Principal
Tu workflow principal debe devolver el `executionId` en la respuesta:

```json
{
  "success": true,
  "executionId": "{{$execution.id}}",
  "executionUrl": "{{$execution.url}}",
  "message": "Workflow started successfully"
}
```

### Error Workflow
Configura un Error Workflow en n8n que llame a `/api/resources/errors`:

**URL**: `https://tu-dominio.com/api/resources/errors`
**Method**: `POST`
**Body**:
```json
{
  "status": "failed",
  "errorMessage": "{{$json.error.message}}",
  "executionId": "{{$json.execution.id}}",
  "lastNodeExecuted": "{{$json.lastNodeExecuted}}",
  "errorStack": "{{$json.error.stack}}",
  "workflowName": "{{$json.workflow.name}}"
}
```

## Endpoint de Gestión de Errores

### POST /api/resources/errors
Webhook que recibe errores de n8n y actualiza resources:

**Características**:
- ✅ Acepta objeto simple con datos de error
- ✅ Busca resources por `executionId`
- ✅ Marca resources como `failed`
- ✅ Agrega logs detallados del error
- ✅ Respuesta directa del resultado

**Respuesta**:
```json
{
  "success": true,
  "data": {
    "resourceId": "67890",
    "executionId": "231",
    "status": "failed"
  },
  "message": "Error de n8n procesado exitosamente"
}
```

### GET /api/resources/errors
Endpoint de prueba que muestra el formato esperado.

## Campo ExecutionId en Resources

```typescript
{
  name: 'executionId',
  label: 'N8n Execution ID',
  type: 'text',
  required: false,
  admin: {
    position: 'sidebar',
    description: 'ID de ejecución de n8n asociado a este resource',
    readOnly: true,
  },
}
```

## Logs Generados

### Webhook Exitoso
```json
{
  "step": "automation-webhook",
  "status": "success",
  "at": "2024-01-15T10:30:00.000Z",
  "details": "Webhook enviado correctamente (status 200) - ExecutionId: 231",
  "data": {
    "url": "https://n8n.domain.com/webhook/...",
    "method": "POST",
    "executionId": "231",
    "executionUrl": "https://n8n.domain.com/execution/workflow/1/231"
  }
}
```

### Error de N8n
```json
{
  "step": "n8n-execution-error",
  "status": "error",
  "at": "2024-01-15T10:35:00.000Z",
  "details": "Error en ejecución de n8n: Example Error Message",
  "data": {
    "executionId": "231",
    "executionUrl": "https://webhook-processor-production-a864.up.railway.app/execution/workflow/1/231",
    "workflowName": "Process Resource",
    "errorMessage": "Example Error Message",
    "errorStack": "Stacktrace...",
    "lastNodeExecuted": "Node With Error",
    "retryOf": "34",
    "mode": "manual"
  }
}
```

## Testing

### Test del Endpoint de Error
```bash
curl -X GET https://tu-dominio.com/api/resources/errors
```

### Test de Error Manual
```bash
curl -X POST https://tu-dominio.com/api/resources/errors \
  -H "Content-Type: application/json" \
  -d '{
    "status": "failed",
    "errorMessage": "Test Error",
    "executionId": "231",
    "lastNodeExecuted": "Test Node",
    "errorStack": "Test Stack",
    "workflowName": "Test Workflow"
  }'
```

## Beneficios de la Solución Simple

1. **Sin tablas adicionales**: Todo se almacena en el resource directamente
2. **Búsqueda directa**: No necesita joins o mapeos complejos  
3. **Menos puntos de falla**: Arquitectura más simple y robusta
4. **Fácil debugging**: ExecutionId visible directamente en el admin
5. **Performance**: Búsquedas directas sin complejidad adicional

## Mejora con BeforeChange Hook

### 🚀 **Beneficios de usar `beforeChange` vs `afterChange`:**

- ✅ **Sin timing issues**: No hay problemas de sincronización de transacciones
- ✅ **Una sola operación**: Todo se guarda en una sola transacción de DB
- ✅ **Más eficiente**: No necesita updates posteriores
- ✅ **Código más limpio**: Sin setTimeout ni retries complejos
- ✅ **Más confiable**: Menos puntos de falla

### 🔄 **Flujo Optimizado:**

```
beforeChange → Webhook → Response → Include executionId → Save Resource
```

vs. Flujo anterior (problemático):
```
afterChange → Webhook → Response → Separate Update → Timing Issues
```

## Regenerar Tipos

Después de añadir el campo `executionId`, regenera los tipos:

```bash
pnpm payload generate:types
```
