# Tasks: Worker de Embeddings

## Relevant Files

- `src/lib/embeddings/generator.ts` - Servicio principal para generar embeddings usando OpenAI API ✅
- `src/lib/embeddings/generator.test.ts` - Tests unitarios para el generador de embeddings
- `src/lib/embeddings/vector-manager.ts` - Gestión de vectores en Pinecone (upsert, validation, cleanup) ✅
- `src/lib/embeddings/vector-manager.test.ts` - Tests unitarios para el gestor de vectores
- `src/lib/embeddings/chunk-processor.ts` - Procesador de chunks para formatear datos antes de embedding
- `src/lib/embeddings/chunk-processor.test.ts` - Tests unitarios para el procesador de chunks
- `src/workers/embedding-processor.ts` - Worker principal que orquesta todo el pipeline de embeddings
- `src/workers/embedding-processor.test.ts` - Tests unitarios para el worker de embeddings
- `src/lib/queue.ts` - Actualización para integrar jobs de embeddings (ya existe)
- `src/workers/video-processor.ts` - Actualización para trigger automático de embeddings (ya existe)
- `src/types/index.ts` - Actualización de interfaces para jobs de embeddings (ya existe) ✅
- `scripts/start-embedding-worker.ts` - Script de inicio para el worker de embeddings
- `package.json` - Actualización de scripts para el nuevo worker

### Notes

- Los tests se ejecutan con `pnpm test:embeddings` y tests específicos con `pnpm test:embedding-generator`, etc.
- El worker debe integrarse con el sistema de cola existente (Agenda) sin modificar la infraestructura base
- Se requiere configuración de variables de entorno para OpenAI y Pinecone
- Seguir el patrón de logging establecido con prefijo `[EMBEDDING-WORKER]`

## Tasks

- [x] 1.0 Servicio de Generación de Embeddings
  - [x] 1.1 Crear `src/lib/embeddings/generator.ts` con clase EmbeddingGenerator
  - [x] 1.2 Implementar método `generateEmbedding(text: string)` usando OpenAI text-embedding-ada-002
  - [x] 1.3 Implementar método `generateEmbeddingsBatch(texts: string[])` con soporte para hasta 10 textos por batch
  - [x] 1.4 Agregar rate limiting de 1 segundo entre batches para evitar límites de API
  - [x] 1.5 Implementar reintentos automáticos hasta 3 veces con backoff exponencial para fallos de OpenAI
  - [x] 1.6 Agregar validación de que embeddings tienen exactamente 1536 dimensiones
  - [x] 1.7 Implementar logging detallado con prefijo `[EMBEDDING-GENERATOR]`
  - [x] 1.8 Crear tests unitarios completos en `src/lib/embeddings/generator.test.ts`

- [x] 2.0 Gestión de Vectores en Pinecone
  - [x] 2.1 Crear `src/lib/embeddings/vector-manager.ts` con clase VectorManager
  - [x] 2.2 Implementar método `upsertVectors()` para insertar vectores en Pinecone usando upsert
  - [x] 2.3 Implementar generación de IDs siguiendo patrón `{resourceId}--chunk-{chunkIndex}`
  - [x] 2.4 Crear estructura de metadata con campos: start_ms, end_ms, namespace, resourceId, chunkIndex, type, transcript, description, fileName
  - [x] 2.5 Implementar validación de inserción exitosa en Pinecone
  - [x] 2.6 Agregar reintentos hasta 3 veces con backoff exponencial para fallos de Pinecone
  - [x] 2.7 Implementar método `cleanupPartialVectors()` para limpieza en caso de fallo crítico
  - [x] 2.8 Usar variable de entorno `PINECONE_INDEX_NAME` para configurar índice de destino
  - [x] 2.9 Crear tests unitarios completos en `src/lib/embeddings/vector-manager.test.ts`

- [x] 3.0 Procesador de Chunks para Embeddings
  - [x] 3.1 Crear `src/lib/embeddings/chunk-processor.ts` con clase ChunkProcessor
  - [x] 3.2 Implementar método `formatChunkForEmbedding()` que combine transcripción + descripción visual
  - [x] 3.3 Crear formato optimizado: "Namespace: X\nDuration: Xs-Ys\nTranscript: ...\nVisual: ..."
  - [x] 3.4 Implementar manejo de casos edge (chunks sin transcripción o sin elementos visuales)
  - [x] 3.5 Implementar método `validateChunk()` para validar estructura antes de procesar
  - [x] 3.6 Implementar método `extractTranscriptionText()` para obtener texto plano de transcripciones JSON
  - [x] 3.7 Crear tests unitarios completos en `src/lib/embeddings/chunk-processor.test.ts`

- [x] 4.0 Worker Principal de Embeddings
  - [x] 4.1 Crear `src/workers/embedding-worker.ts` con procesador de jobs `generate-embeddings`
  - [x] 4.2 Implementar orquestador que use EmbeddingGenerator, VectorManager, y ChunkProcessor
  - [x] 4.3 Crear manejo de estados con logs detallados en PayloadCMS
  - [x] 4.4 Implementar retry logic para fallos de OpenAI y Pinecone
  - [x] 4.5 Crear health check que verifique todos los servicios (OpenAI, Pinecone, MongoDB)
  - [x] 4.6 Implementar timeout de 5 minutos por job con cleanup automático
  - [x] 4.7 Crear método `getStats()` para monitoreo de performance
  - [x] 4.8 Configurar logging con prefijo `[EMBEDDING-WORKER]`
  - [x] 4.9 Crear integración con QueueManager para jobs automáticos
  - [x] 4.10 Crear tests unitarios completos en `src/workers/embedding-worker.test.ts`

- [x] 5.0 Integración con Pipeline Existente
  - [x] 5.1 Actualizar interface `EmbeddingGenerationJob` en `src/types/index.ts` según diseño del PRD
  - [x] 5.2 Actualizar `src/lib/queue.ts` para usar el worker real en lugar de simulación para `generate-embeddings`
  - [x] 5.3 Modificar `src/workers/video-processor.ts` para encolar job de embeddings al completar chunk processing
  - [x] 5.4 Crear `scripts/start-embedding-worker.ts` siguiendo patrón del video worker
  - [x] 5.5 Actualizar `package.json` con scripts: `pnpm worker:embeddings`, `pnpm test:embeddings`
  - [x] 5.6 Agregar comando `pnpm test:embedding-generator`, `pnpm test:vector-manager`, `pnpm test:chunk-processor`
  - [x] 5.7 Actualizar `src/workers/index.ts` para exportar EmbeddingWorker
  - [x] 5.8 Crear tests de integración completa video → embedding → pinecone 