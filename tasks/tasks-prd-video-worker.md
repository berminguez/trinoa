# Tasks: Worker de Video - Procesamiento Avanzado de Contenido Audiovisual

Basado en: `tasks/prd-video-worker.md`

## Relevant Files

- `src/collections/Resources.ts` - ✅ Actualizar colección Resources con nuevos campos (namespace, filters, transcription, screenshots, chunks, etc.)
- `src/collections/Resources.test.ts` - ✅ Tests para validación de nuevos campos en Resources
- `src/app/api/resources/upload/route.ts` - ✅ Actualizar endpoint para recibir namespace, filters, user_metadata
- `src/app/api/resources/upload/route.test.ts` - ✅ Tests para validación de nuevos campos en upload
- `src/workers/video-processor.ts` - Actualizar worker existente con nuevo pipeline de procesamiento
- `src/workers/video-processor.test.ts` - Tests unitarios para cada paso del worker
- `src/lib/video/downloader.ts` - ✅ Utilidad para descarga de S3 con reintentos
- `src/lib/video/downloader.test.ts` - ✅ Tests para sistema de descarga con reintentos
- `src/lib/video/transcriber.ts` - ✅ Servicio de transcripción con Whisper
- `src/lib/video/transcriber.test.ts` - ✅ Tests para transcripción y formato de salida
- `src/lib/video/scene-detector.ts` - Servicio de detección de escenas con PySceneDetect
- `src/lib/video/scene-detector.test.ts` - Tests para detección de escenas
- `src/lib/video/frame-extractor.ts` - Servicio de extracción de frames con FFmpeg
- `src/lib/video/frame-extractor.test.ts` - Tests para extracción de frames
- `src/lib/video/vision-describer.ts` - Servicio de descripción visual con GPT-4o Vision
- `src/lib/video/vision-describer.test.ts` - Tests para descripciones visuales
- `src/lib/video/chunk-processor.ts` - Servicio de generación de chunks y síntesis
- `src/lib/video/chunk-processor.test.ts` - Tests para chunks y síntesis global
- `src/lib/openai.ts` - ✅ Actualizar con nuevos servicios (Whisper, GPT-4o Vision, GPT-4)
- `src/lib/openai.test.ts` - Tests para integración con nuevos servicios OpenAI
- `src/types/index.ts` - Actualizar VideoProcessingJob con nuevos campos (namespace, filters, user_metadata)
- `scripts/test-video-worker.ts` - Script de testing específico para worker de video
- `.env.example` - Actualizar con nuevas variables de entorno

### Notes

- Tests unitarios deben colocarse junto a los archivos que testean
- Usar `pnpm test` para ejecutar todos los tests o `pnpm test [path]` para tests específicos
- Los servicios de video en `src/lib/video/` deben ser modulares e independientes
- Manejar errores de forma aislada en cada servicio para permitir recuperación parcial
- Usar mocks para servicios externos (OpenAI, S3) en tests unitarios

## Tasks

- [x] 1.0 Actualización de PayloadCMS y Endpoint de Upload
  - [x] 1.1 Actualizar `src/collections/Resources.ts` con nuevos campos requeridos (namespace, filters, user_metadata, transcription, description)
  - [x] 1.2 Añadir campos array para screenshots con estructura (id, image, shortDescription, description)
  - [x] 1.3 Añadir campos array para chunks con estructura (id, timeStart, timeEnd, transcription, description, screenshots)
  - [x] 1.4 Actualizar validaciones y hooks en Resources para nuevos campos
  - [x] 1.5 Actualizar `src/app/api/resources/upload/route.ts` para recibir namespace, filters, user_metadata
  - [x] 1.6 Añadir validación de namespace (formato alfanumérico, no vacío)
  - [x] 1.7 Crear tests para nuevos campos y validaciones

- [x] 2.0 Sistema de Descarga y Preparación de Video
  - [x] 2.1 Crear `src/lib/video/downloader.ts` con función de descarga desde S3
  - [x] 2.2 Implementar sistema de reintentos con backoff exponencial (3 intentos)
  - [x] 2.3 Añadir logging detallado para cada intento de descarga
  - [x] 2.4 Implementar validación de campos requeridos (namespace, filters, user_metadata)
  - [x] 2.5 Añadir manejo de archivos temporales en `/tmp/`
  - [x] 2.6 Crear tests para escenarios de éxito y fallo de descarga

- [x] 3.0 Implementación de Transcripción con Whisper
  - [x] 3.1 Crear `src/lib/video/transcriber.ts` con integración OpenAI Whisper
  - [x] 3.2 Implementar generación de "conversación json con tiempos" 
  - [x] 3.3 Configurar modelo Whisper via variable de entorno WHISPER_MODEL
  - [x] 3.4 Añadir logging estructurado para paso de transcripción
  - [x] 3.5 Implementar manejo de videos sin audio (devolver transcripción vacía)
  - [x] 3.6 Actualizar `src/lib/openai.ts` con servicio Whisper
  - [x] 3.7 Crear tests para transcripción completa y casos edge

- [ ] 4.0 Procesamiento Visual (Detección de Escenas + Frames + GPT-4o Vision)
  - [ ] 4.1 Crear `src/lib/video/scene-detector.ts` con integración PySceneDetect
  - [ ] 4.2 Implementar filtrado por umbral de histogram diff (configurable)
  - [ ] 4.3 Crear `src/lib/video/frame-extractor.ts` con integración FFmpeg
  - [ ] 4.4 Implementar extracción de key-frames en resolución configurable
  - [ ] 4.5 Crear `src/lib/video/vision-describer.ts` con GPT-4o Vision
  - [ ] 4.6 Implementar upload de frames a PayloadCMS como Media objects
  - [ ] 4.7 Generar descripciones cortas y extensas con prompts específicos
  - [ ] 4.8 Crear estructura de screenshots con referencias a Media objects
  - [ ] 4.9 Añadir rate limiting para llamadas múltiples a GPT-4o Vision
  - [ ] 4.10 Crear tests para detección de escenas, extracción de frames y descripciones

- [ ] 5.0 Generación de Chunks y Síntesis Global
  - [ ] 5.1 Crear `src/lib/video/chunk-processor.ts` para generación de chunks de 15s
  - [ ] 5.2 Implementar división temporal sin overlap basada en CHUNK_SIZE_MS
  - [ ] 5.3 Extraer transcripción parcial por rango temporal para cada chunk
  - [ ] 5.4 Filtrar screenshots que caen dentro del rango temporal de cada chunk
  - [ ] 5.5 Generar descripción de chunk usando GPT-4 con transcripción + screenshots
  - [ ] 5.6 Manejar caso especial de videos <15s (chunk único)
  - [ ] 5.7 Implementar síntesis global con GPT-4 usando transcripción completa + descripciones de chunks
  - [ ] 5.8 Configurar modelos GPT via variables de entorno (GPT_VISION_MODEL, GPT_TEXT_MODEL)
  - [ ] 5.9 Crear tests para generación de chunks y síntesis global

- [ ] 6.0 Integración Final y Testing del Worker
  - [ ] 6.1 Actualizar `src/workers/video-processor.ts` con nuevo pipeline completo
  - [ ] 6.2 Implementar orquestación de todos los servicios en secuencia correcta
  - [ ] 6.3 Añadir manejo de errores aislado por paso con recuperación parcial
  - [ ] 6.4 Implementar actualización final de Resource en PayloadCMS
  - [ ] 6.5 Añadir limpieza de archivos temporales en éxito y fallo
  - [ ] 6.6 Crear `scripts/test-video-worker.ts` para testing end-to-end
  - [ ] 6.7 Actualizar variables de entorno en `.env.example`
  - [ ] 6.8 Crear tests de integración para pipeline completo
  - [ ] 6.9 Documentar configuración y troubleshooting en README
  - [ ] 6.10 Probar con video real y validar estructura final de datos 