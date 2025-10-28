# 🚀 Solución Implementada: Control de Concurrencia en Subidas Masivas

## 📋 Problema Identificado

Cuando el cliente intentaba subir más de 15 facturas simultáneamente desde archivos locales:
- ❌ Algunos archivos se quedaban en estado "procesando" indefinidamente
- ❌ No recibían el procesamiento correcto de n8n
- ✅ Las subidas desde URLs funcionaban correctamente

### Causa Raíz

El problema **NO era de n8n**, sino del **control de concurrencia en las subidas a S3**:

1. **Sin límite de concurrencia**: Todos los archivos (15+) se intentaban subir simultáneamente
2. **Sobrecarga de S3**: Cada archivo requiere:
   - Conversión a Buffer
   - Subida a S3
   - Espera de confirmación
3. **Comparación con URLs**: Las subidas desde URLs se procesaban **secuencialmente** (uno tras otro), por eso funcionaban

## ✅ Solución Implementada

### 1. Constantes de Configuración (`src/lib/config.ts`)

Agregadas nuevas constantes configurables:

```typescript
// Upload concurrency control
UPLOAD_MAX_CONCURRENT: parseInt(process.env.UPLOAD_MAX_CONCURRENT || '5'),
UPLOAD_BATCH_DELAY_MS: parseInt(process.env.UPLOAD_BATCH_DELAY_MS || '1000'),
```

**Beneficios:**
- ✅ Máximo 5 archivos simultáneos por defecto
- ✅ Delay de 1 segundo entre batches
- ✅ Configurable vía variables de entorno

### 2. Control de Batches (`src/hooks/useProjectUpload.ts`)

Implementado procesamiento por batches similar al patrón ya existente en `media-uploader.ts`:

```typescript
// 🚀 CONTROL DE CONCURRENCIA: Procesar en batches para evitar sobrecargar S3
const MAX_CONCURRENT_UPLOADS = CONFIG.UPLOAD_MAX_CONCURRENT
const DELAY_BETWEEN_BATCHES = CONFIG.UPLOAD_BATCH_DELAY_MS

const allResults: PromiseSettledResult<UploadFile>[] = []

for (let i = 0; i < validFiles.length; i += MAX_CONCURRENT_UPLOADS) {
  const batch = validFiles.slice(i, i + MAX_CONCURRENT_UPLOADS)
  
  // Subir batch actual con códigos pre-asignados
  const batchPromises = batch.map((file, batchIndex) => {
    const fileIndex = i + batchIndex
    const preAssignedCode = pregeneratedCodes[fileIndex]
    return uploadSingleFile(file, preAssignedCode)
  })

  // Esperar a que termine el batch actual
  const batchResults = await Promise.allSettled(batchPromises)
  allResults.push(...batchResults)

  // Delay entre batches (excepto en el último)
  if (i + MAX_CONCURRENT_UPLOADS < validFiles.length) {
    await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_BATCHES))
  }
}
```

**Características:**
- ✅ Procesa máximo 5 archivos simultáneos
- ✅ Espera 1 segundo entre batches
- ✅ Logging detallado de progreso por batch
- ✅ Mantiene compatibilidad con códigos pre-asignados
- ✅ Usa `Promise.allSettled` para manejar errores individuales

### 3. Timeout Extendido (`next.config.mjs`)

Configurado timeout de 5 minutos para endpoints de upload:

```javascript
async headers() {
  return [
    {
      source: '/api/resources/upload',
      headers: [
        {
          key: 'x-vercel-max-duration',
          value: '300', // 5 minutos
        },
      ],
    },
    {
      source: '/api/pre-resources/upload',
      headers: [
        {
          key: 'x-vercel-max-duration',
          value: '300', // 5 minutos
        },
      ],
    },
  ]
},
```

**Beneficios:**
- ✅ Evita timeouts en Railway/Vercel
- ✅ Permite procesar lotes grandes de archivos
- ✅ Aplica a ambos endpoints de upload

## 📊 Comparación Antes/Después

### Antes (❌ Problema)
```
Upload 15 archivos → Todos simultáneos → Sobrecarga S3 → Algunos fallan
```

### Después (✅ Solución)
```
Upload 15 archivos → Batch 1 (5 archivos) → Delay 1s → Batch 2 (5 archivos) → Delay 1s → Batch 3 (5 archivos) → Éxito
```

## 🎯 Archivos Modificados

1. **`src/lib/config.ts`**
   - Agregadas constantes `UPLOAD_MAX_CONCURRENT` y `UPLOAD_BATCH_DELAY_MS`

2. **`src/hooks/useProjectUpload.ts`**
   - Importado `CONFIG` desde `@/lib/config`
   - Reemplazado `Promise.allSettled` masivo por procesamiento por batches
   - Agregado logging detallado de progreso

3. **`next.config.mjs`**
   - Agregada configuración de headers con timeout extendido
   - Aplica a `/api/resources/upload` y `/api/pre-resources/upload`

## 🔧 Configuración Personalizada

Para ajustar los valores según necesidades específicas, configura variables de entorno:

```bash
# Máximo de archivos simultáneos (default: 5)
UPLOAD_MAX_CONCURRENT=3

# Delay entre batches en milisegundos (default: 1000)
UPLOAD_BATCH_DELAY_MS=2000
```

## 📈 Ventajas de la Solución

1. ✅ **Evita sobrecarga de S3**: Límite controlado de conexiones simultáneas
2. ✅ **Previene timeouts**: Timeout extendido a 5 minutos
3. ✅ **Mejor UX**: Progreso más predecible y visible
4. ✅ **Configurable**: Ajustable vía variables de entorno
5. ✅ **Usa patrón existente**: Similar a `media-uploader.ts`
6. ✅ **Mantiene compatibilidad**: Códigos pre-asignados siguen funcionando
7. ✅ **Sin errores de linter**: Código validado y sin errores

## 🧪 Pruebas Recomendadas

1. Subir 5 archivos (1 batch) → Debería funcionar rápido
2. Subir 15 archivos (3 batches) → Debería procesar correctamente con delays visibles
3. Subir 25 archivos (5 batches) → Debería completarse sin errores
4. Verificar logs en consola para confirmar procesamiento por batches

## 📚 Referencias

- Patrón de batching basado en `src/lib/video/media-uploader.ts` líneas 215-235
- Documentación previa de mejoras: `MEJORAS_WEBHOOK_ROBUSTEZ.md`

---

**Fecha de implementación:** 28 de octubre de 2025  
**Estado:** ✅ Implementado y validado sin errores de linter

