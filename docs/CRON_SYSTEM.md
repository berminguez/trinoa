# Sistema de CRON Jobs - Verificación de Estados N8n

## Descripción

Este sistema implementa un CRON job que se ejecuta cada minuto para verificar y sincronizar el estado de los resources con sus ejecuciones correspondientes en N8n. Está diseñado específicamente para detectar ejecuciones que han terminado mal o se han quedado colgadas.

## Funcionalidades

### 🔄 Verificación Automática
- **Intervalo**: Cada minuto (`* * * * *`)
- **Scope**: Resources con `status: "processing"` y `executionId` presente
- **Timeout**: Resources en progreso por más de 1 minuto se marcan como `failed`

### 🔍 Estados Detectados
- ✅ **success** → Cambia resource a `completed`
- ❌ **error** → Cambia resource a `failed` 
- 🚫 **canceled** → Cambia resource a `failed`
- ⏱️ **timeout** → Más de 1 minuto sin respuesta → `failed`

### 📊 Logging Detallado
- Logs automáticos en cada resource actualizado
- Métricas de rendimiento del CRON job
- Información de debugging para troubleshooting

## Arquitectura

```
┌─────────────────┐    ┌──────────────┐    ┌─────────────────┐
│   CRON Manager  │    │  Server Action│    │   N8n API      │
│   (cada minuto) │───▶│  checkN8n...  │───▶│   /executions  │
└─────────────────┘    └──────────────┘    └─────────────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌──────────────┐
│   Resources DB  │    │   Logs DB    │
│   (status update)│    │   (audit)    │
└─────────────────┘    └──────────────┘
```

## Archivos del Sistema

### 1. Server Action: `src/actions/resources/checkN8nExecutions.ts`
```typescript
// Función principal que verifica los estados
export async function checkN8nExecutions(): Promise<{
  success: boolean
  totalChecked: number
  updated: number
  errors: number
  results: CheckExecutionResult[]
}>
```

### 2. CRON Manager: `src/lib/cron.ts`
```typescript
// Gestión del sistema de CRON jobs
export const cronManager = CronManager.getInstance()
export const initializeCron = () => cronManager.initialize()
```

### 3. Servidor: `scripts/server.js`
```javascript
// Inicialización automática del CRON en Railway
await initializeCron()
```

### 4. API Endpoint: `src/app/api/cron/route.ts`
```typescript
// GET /api/cron - Estado del sistema
// POST /api/cron?action=run - Ejecución manual
```

## Configuración

### Variables de Entorno
```bash
# Requeridas para el sistema
N8N_URL=https://your-n8n-instance.com
N8N_API_KEY=your-api-key

# Opcionales
ENABLE_CRON=true         # Forzar activación en desarrollo
NODE_ENV=production      # Auto-activa el CRON
```

### Configuración del CRON
```typescript
// En src/lib/cron.ts
const config: CronConfig = {
  enabled: process.env.NODE_ENV === 'production' || process.env.ENABLE_CRON === 'true',
  n8nCheckerInterval: '* * * * *', // Cada minuto
  timezone: 'Europe/Madrid',
}
```

## Uso y Monitoreo

### 📊 Verificar Estado
```bash
# Obtener estado del sistema CRON
curl https://your-app.railway.app/api/cron

# Respuesta esperada:
{
  "success": true,
  "data": {
    "initialized": true,
    "enabled": true,
    "tasksCount": 1,
    "tasks": [
      {
        "name": "n8n-execution-checker",
        "running": true
      }
    ]
  }
}
```

### 🔧 Ejecución Manual
```bash
# Ejecutar verificación inmediata
curl -X POST https://your-app.railway.app/api/cron?action=run

# Respuesta esperada:
{
  "success": true,
  "data": {
    "totalChecked": 5,
    "updated": 2,
    "errors": 0,
    "results": [...]
  }
}
```

### 🛠️ Desarrollo Local
```bash
# En desarrollo, el CRON no se inicia automáticamente con `pnpm dev`
# Para inicializar manualmente:
curl -X POST http://localhost:3000/api/dev-cron

# Verificar estado en desarrollo:
curl http://localhost:3000/api/dev-cron

# Ejecutar checker manualmente:
curl -X POST "http://localhost:3000/api/cron?action=run"
```

### 📝 Logs del Sistema
```bash
# Los logs aparecen en la consola de Railway
[CRON:n8n-execution-checker] ✅ Completed in 450ms - Checked: 3, Updated: 1, Errors: 0
[N8N_CHECK] ✅ Resource abc123: updated_to_completed
```

## Casos de Uso

### 1. Resource Completado en N8n
```
Resource Status: processing → completed
N8n Response: { status: "success", finished: true }
Action: ✅ Actualizar a completed + timestamp
```

### 2. Resource Fallido en N8n  
```
Resource Status: processing → failed
N8n Response: { status: "error", finished: true }
Action: ❌ Actualizar a failed + error log
```

### 3. Resource con Timeout
```
Resource: En processing por > 1 minuto
N8n Response: { status: "running" }
Action: ⏱️ Marcar como failed (timeout)
```

### 4. Ejecución Cancelada
```
Resource Status: processing → failed  
N8n Response: { status: "canceled" }
Action: 🚫 Actualizar a failed + cancelation log
```

## Troubleshooting

### ❌ CRON No Se Ejecuta
1. Verificar `NODE_ENV=production` o `ENABLE_CRON=true`
2. Revisar logs de inicio: `[CRON] Initializing CRON jobs...`
3. Verificar endpoint: `GET /api/cron`

### ❌ Error de Conectividad con N8n
1. Verificar `N8N_URL` y `N8N_API_KEY`
2. Revisar logs: `[N8N_CHECK] Error checking execution`
3. Verificar permisos de API key en N8n

### ❌ Resources No Se Actualizan
1. Verificar que resources tengan `executionId`
2. Verificar que status sea exactamente `"processing"`
3. Revisar logs de PayloadCMS

### 🔍 Debug Mode
```bash
# Activar logs detallados
export DEBUG=cron*
export NODE_ENV=development
export ENABLE_CRON=true
```

## Consideraciones de Rendimiento

- **Límite**: 100 resources por ejecución para evitar sobrecarga
- **Timeout**: 10 segundos por consulta a N8n API
- **Frecuencia**: 1 minuto es balanceado entre rapidez y carga
- **Memoria**: Mínimo impacto, solo consultas HTTP simples

## Futuras Mejoras

- [ ] Configuración de intervalos por environment
- [ ] Métricas de Prometheus/DataDog
- [ ] Retry logic para fallos temporales de red
- [ ] Dashboard de monitoreo en tiempo real
- [ ] Alertas por Slack/email en caso de fallos críticos
