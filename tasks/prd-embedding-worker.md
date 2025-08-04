# Product Requirements Document: Worker de Embeddings

## 1. Introduction/Overview

El Worker de Embeddings es un componente crítico del pipeline de procesamiento de video de Eidetik que convierte los chunks de video procesados en vectores semánticos almacenados en Pinecone. Su objetivo es completar la transformación de contenido multimedia en datos consultables para aplicaciones RAG (Retrieval-Augmented Generation).

Este worker se ejecuta automáticamente después de que el Video Worker complete el procesamiento de chunks, convirtiendo cada fragmento de 15 segundos en embeddings semánticos que permiten búsquedas inteligentes y recuperación de información contextual.

## 2. Goals

1. **Automatización Completa**: Generar embeddings automáticamente para todos los chunks procesados sin intervención manual
2. **Indexación Semántica**: Convertir contenido de video en vectores consultables en Pinecone con metadata completo
3. **Performance Óptimo**: Procesar embeddings con latencia < 2 segundos por chunk y 100% de tasa de éxito
4. **Escalabilidad**: Soportar procesamiento concurrente y batch para múltiples recursos simultáneamente
5. **Observabilidad**: Proporcionar logging detallado y métricas de rendimiento para monitoreo

## 3. User Stories

**Como desarrollador del sistema:**
- Quiero que los chunks de video se conviertan automáticamente en vectores semánticos para poder implementar búsquedas RAG
- Quiero metadata completo en cada vector para poder filtrar búsquedas por namespace, tiempo, tipo de contenido, etc.

**Como usuario final (futuro):**
- Quiero que mis videos subidos estén disponibles para búsqueda semántica inmediatamente después del procesamiento
- Quiero encontrar fragmentos específicos de video usando consultas en lenguaje natural

**Como administrador del sistema:**
- Quiero visibilidad completa del proceso de embedding generation para detectar problemas y optimizar performance
- Quiero configuración flexible de parámetros como concurrencia, modelos y timeouts

## 4. Functional Requirements

### 4.1 Trigger y Activación
1. El Worker de Embeddings DEBE activarse automáticamente cuando el Video Worker complete el procesamiento de chunks
2. El sistema DEBE encolar un job de embedding generation con toda la información del recurso procesado
3. El worker DEBE validar que todos los chunks tengan la estructura requerida antes de procesar

### 4.2 Generación de Embeddings
4. El sistema DEBE generar un embedding usando OpenAI text-embedding-ada-002 para cada chunk de video
5. El texto para embedding DEBE combinar transcripción + descripción visual del chunk en formato optimizado
6. El sistema DEBE manejar chunks sin transcripción (solo visual) y chunks sin elementos visuales (solo audio)
7. Los embeddings DEBEN tener exactamente 1536 dimensiones y formato float

### 4.3 Estructura de Datos para Embeddings
8. Cada vector DEBE incluir los campos: `start_ms`, `end_ms`, `namespace`, `resourceId`, `chunkIndex`
9. El metadata DEBE incluir: `type: 'video'`, `transcript`, `description`, `fileName`
10. El ID del vector DEBE seguir el patrón: `{resourceId}--chunk-{chunkIndex}`
11. Los vectors DEBEN almacenarse en el índice configurado via `PINECONE_INDEX_NAME`

### 4.4 Manejo de Batch y Performance
12. El sistema DEBE procesar hasta 10 chunks por batch en una sola llamada a OpenAI embeddings API
13. El worker DEBE implementar rate limiting de 1 segundo entre batches para evitar límites de API
14. El procesamiento DEBE ser concurrente hasta 3 recursos simultáneamente
15. El sistema DEBE reportar tiempo de procesamiento por chunk y por recurso completo

### 4.5 Gestión de Vectores en Pinecone
16. El sistema DEBE inicializar conexión a Pinecone antes de procesar cualquier embedding
17. Los vectores DEBEN insertarse usando upsert para permitir reprocesamiento sin duplicados
18. El sistema DEBE validar que cada vector se insertó correctamente en Pinecone
19. En caso de fallo de inserción, el sistema DEBE reintentar hasta 3 veces con backoff exponencial

### 4.6 Actualización de Estado en PayloadCMS
20. El worker DEBE actualizar el campo `processingMetadata.vectorsGenerated` con el número de vectores creados
21. El sistema DEBE agregar un log entry con step: `embedding-generation` y status: `success`
22. Si el proceso falla, el worker DEBE actualizar logs con información detallada del error
23. El estado del recurso DEBE permanecer como `completed` una vez que embeddings estén listos

### 4.7 Manejo de Errores y Recuperación
24. El worker DEBE reintentar automáticamente hasta 3 veces en caso de fallo de OpenAI API
25. Si OpenAI falla después de reintentos, el sistema DEBE continuar con otros chunks
26. Los fallos de Pinecone DEBEN marcar el job como fallido y requerir intervención manual
27. El worker DEBE limpiar vectores parciales en caso de fallo crítico

### 4.8 Logging y Observabilidad
28. Cada operación DEBE tener logging con prefijo `[EMBEDDING-WORKER]` para identificación
29. El sistema DEBE reportar estadísticas: chunks procesados, tiempo total, vectores insertados
30. Los errores DEBEN incluir contexto completo: resourceId, chunkIndex, mensaje de error
31. El worker DEBE exponer métricas de health check y estadísticas de cola

### 4.9 Configuración y Variables de Entorno
32. El worker DEBE usar `EMBEDDING_MODEL` para configurar el modelo de OpenAI (default: text-embedding-ada-002)
33. El sistema DEBE respetar `PINECONE_INDEX_NAME` para el índice de destino
34. La concurrencia DEBE ser configurable via `EMBEDDING_CONCURRENCY` (default: 3)
35. El batch size DEBE ser configurable via `EMBEDDING_BATCH_SIZE` (default: 10)

## 5. Non-Goals (Out of Scope)

- **Generación de embeddings para otros tipos de archivo**: Solo video en este MVP
- **Consultas y búsquedas de vectores**: El worker solo inserta, no consulta
- **Optimización o modificación de vectores existentes**: Solo inserción de nuevos vectores
- **Re-indexación automática**: Los cambios en chunks requieren reprocesamiento manual
- **Embedding de metadata adicional**: Solo transcripción + descripción visual
- **Compresión o reducción de dimensionalidad**: Usar embeddings OpenAI tal como vienen
- **Fallback a modelos alternativos**: Solo text-embedding-ada-002 para consistencia

## 6. Design Considerations

### 6.1 Arquitectura del Worker
- **Patrón**: Worker independiente similar al Video Worker pero especializado en embeddings
- **Queue Integration**: Usar el mismo sistema Agenda con job type `generate-embeddings`
- **Trigger**: Auto-encolado por el Video Worker al completar chunk processing

### 6.2 Formato de Texto para Embeddings
```typescript
// Formato optimizado para embeddings semánticos
const embeddingText = `
Namespace: ${namespace}
Duration: ${start_ms/1000}s-${end_ms/1000}s
Transcript: ${transcriptionText}
Visual: ${visualDescription}
`.trim()
```

### 6.3 Estructura del Job de Embedding
```typescript
interface EmbeddingGenerationJob {
  resourceId: string
  namespace: string
  chunks: Array<{
    chunkIndex: number
    start_ms: number
    end_ms: number
    transcription: string
    description: string
    screenshots: string[]
  }>
  metadata: {
    fileName: string
    totalChunks: number
    processingStartedAt: string
  }
}
```

## 7. Technical Considerations

### 7.1 Dependencies
- **OpenAI SDK**: Ya implementado en `src/lib/openai.ts`
- **Pinecone SDK**: Ya configurado en `src/lib/pinecone.ts`
- **Queue System**: Usar QueueManager existente
- **PayloadCMS**: Para actualización de estado

### 7.2 Performance Targets
- **Latencia por chunk**: < 2 segundos promedio
- **Throughput**: 50+ chunks por minuto
- **Tasa de éxito**: 99.5% de chunks procesados exitosamente
- **Memory usage**: < 512MB por worker instance

### 7.3 Error Resilience
- **OpenAI timeouts**: 30 segundos con reintentos
- **Pinecone connection**: Connection pooling y health checks
- **Partial failures**: Continuar procesamiento de otros chunks

## 8. Success Metrics

1. **Completitud**: 100% de recursos con video procesado tienen embeddings generados
2. **Performance**: Tiempo promedio de embedding generation < 2s por chunk
3. **Reliability**: Tasa de fallo < 0.5% en condiciones normales
4. **Observability**: 100% de operaciones con logging estructurado
5. **Integration**: 0 fallos en trigger automático desde Video Worker

## 9. Open Questions

1. **Priorización de jobs**: ¿Debería haber prioridad diferente para recursos grandes vs pequeños?
2. **Cleanup de vectores**: ¿Implementar garbage collection para vectores huérfanos?
3. **Monitoring**: ¿Integración con sistemas de monitoring externos (DataDog, etc.)?
4. **Scaling**: ¿Auto-scaling de workers basado en tamaño de cola?
5. **Testing**: ¿Estrategia para testing con embeddings reales vs mocks?

---

**Este PRD define un Worker de Embeddings robusto y escalable que completa el pipeline de procesamiento de video de Eidetik, convirtiendo contenido multimedia en vectores semánticos consultables para aplicaciones RAG.** 