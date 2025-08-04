# Tasks: Eidetik MVP - Plataforma de Ingesta de Vídeo a Vector Store

## Relevant Files

- `src/payload.config.ts` - Configuración principal de Payload CMS
- `src/collections/Resources.ts` - Colección para gestionar recursos de vídeo
- `src/collections/Media.ts` - Colección para archivos multimedia
- `src/collections/Users.ts` - Colección de usuarios con API Keys habilitadas (ACTUALIZADO ✅)
- `src/lib/auth.ts` - Sistema de autenticación con JWT + API Keys de Payload (CREADO ✅)
- `docs/authentication.md` - Documentación completa del sistema de autenticación (CREADO ✅)
- `src/collections/Resources.ts` - Endpoints nativos de Payload + custom endpoint /logs (REFACTORIZADO ✅)
- `src/workers/video-processor.ts` - Worker para procesamiento de vídeo
- `src/workers/embedding-generator.ts` - Worker para generación de embeddings
- `src/lib/queue.ts` - Sistema de cola con Agenda
- `src/lib/storage.ts` - Utilidades para AWS S3 con funciones de eliminación (ACTUALIZADO ✅)
- `src/lib/pinecone.ts` - Cliente y utilidades de Pinecone con eliminación de vectores (ACTUALIZADO ✅)
- `src/lib/openai.ts` - Cliente y utilidades de OpenAI
- `src/app/page.tsx` - Interfaz web principal con drag & drop
- `src/components/VideoUploader.tsx` - Componente de upload de vídeos
- `src/components/ResourceList.tsx` - Lista de recursos subidos
- `src/lib/webhooks.ts` - Sistema de notificaciones webhook
- `src/types/index.ts` - Tipos TypeScript del proyecto (CREADO ✅)
- `src/lib/` - Directorio de librerías (queue, storage, pinecone, openai,
  webhooks) (CREADO ✅)
- `src/workers/` - Directorio de workers de procesamiento (CREADO ✅)
- `src/components/` - Directorio de componentes React (CREADO ✅)
- `src/actions/` - Directorio de server actions organizados por funcionalidad
  (CREADO ✅)
- `.env.example` - Variables de entorno de ejemplo (CREADO ✅)
- `eslint.config.mjs` - Configuración de ESLint con reglas del proyecto (CREADO
  ✅)
- `.prettierrc.json` - Configuración de Prettier (ACTUALIZADO ✅)
- `.prettierignore` - Archivos excluidos de formateo (CREADO ✅)
- `docker-compose.yml` - Configuración para desarrollo local (NO NECESARIO)
- `README.md` - Documentación del proyecto (COMPLETADO ✅)

### Notes

- El proyecto utilizará Payload CMS como base, por lo que seguirá las
  convenciones de estructura de Payload
- Los workers se desplegarán como servicios separados en Render
- Se utilizará MongoDB tanto para Payload como para la cola Agenda
- Los tests se implementarán usando Jest y se ubicarán junto a los archivos
  correspondientes

## Tasks

- [x] 1.0 Configuración del Proyecto Base y Infraestructura
  - [x] 1.1 Inicializar proyecto Payload CMS con Next.js y configuración
        TypeScript
  - [x] 1.2 Configurar variables de entorno (.env.example) para MongoDB, AWS S3,
        OpenAI, Pinecone
  - [x] 1.3 Instalar dependencias principales: Payload, Agenda, AWS SDK,
        Pinecone SDK, OpenAI SDK
  - [x] 1.4 Configurar eslint y prettier con reglas del proyecto
  - [x] 1.5 Configurar estructura de carpetas siguiendo convenciones de Payload
        CMS
  - [x] 1.6 Configurar docker-compose.yml para desarrollo local con MongoDB (NO
        NECESARIO - usando MongoDB Atlas)
  - [x] 1.7 Crear archivo README.md con instrucciones de setup y documentación
        básica

- [x] 2.0 Implementación de la API de Ingesta de Vídeos
  - [x] 2.1 Crear colección `Media` en Payload para gestión de archivos
  - [x] 2.2 Crear colección `Resources` con campos: title, description, type,
        file, status, progress, logs
  - [x] 2.3 Configurar upload a AWS S3 en colección Media (COMPLETADO en 2.1)
  - [x] 2.4 Implementar validación de archivos MP4 y límite de tamaño (2 horas)
  - [x] 2.5 Crear hook afterChange en Resources para encolar job de
        procesamiento
  - [x] 2.6 Implementar endpoints REST GET /api/resources/{id} y GET
        /api/resources/{id}/logs
  - [x] 2.7 Implementar endpoint DELETE /api/resources/{id} con limpieza de S3 y
        Pinecone
  - [x] 2.8 Configurar autenticación básica con API keys
  - [x] 2.9 Implementar rate limiting básico en endpoints (SKIPPED - Payload CMS maneja esto nativamente)

- [x] 3.0 Desarrollo del Sistema de Workers y Cola de Jobs
  - [x] 3.1 Configurar Agenda con conexión a MongoDB
  - [x] 3.2 Crear tipos TypeScript para jobs: VideoProcessingJob, EmbeddingJob
  - [x] 3.3 Implementar servicio base de cola en src/lib/queue.ts
  - [x] 3.4 Crear funciones para encolar jobs con metadata y prioridades
  - [x] 3.5 Implementar sistema de reintentos con backoff exponencial (máximo 3
        intentos)
  - [x] 3.6 Configurar workers separados para video-processor y
        embedding-generator
  - [x] 3.7 Implementar logging de jobs y actualización de estado en Resources
  - [x] 3.8 Crear health checks para monitorear estado de workers
  - [x] 3.9 Documentar comandos para ejecutar workers en producción (scripts)

- [ ] 4.0 Implementación del Pipeline de Procesamiento de Vídeo
  - [ ] 4.1 Configurar cliente OpenAI para Whisper en src/lib/openai.ts
  - [ ] 4.2 Implementar descarga de vídeo desde S3 a almacenamiento temporal
  - [ ] 4.3 Integrar Whisper para transcripción con timestamps precisos
  - [ ] 4.4 Instalar y configurar PySceneDetect para detección de escenas
  - [ ] 4.5 Implementar extracción de fotogramas con FFmpeg en momentos clave y guardarlos con su código de tiempo del vídeo
  - [ ] 4.6 Crear función para segmentar contenido en chunks de 30-60 segundos
  - [ ] 4.7 Subir fotogramas extraídos a S3 con naming y carpeta consistente
  - [ ] 4.9 Generar jobs de embedding por cada segmento procesado (aunque de momento no debe hacer nada)

- [ ] 5.0 Integración con Vector Store (Pinecone) y Generación de Embeddings
  - [ ] 5.1 Configurar cliente Pinecone y crear índice 'resources-chunks'
  - [ ] 5.2 Implementar descripción visual con GPT-4o Vision de fotogramas
  - [ ] 5.3 Crear función para combinar transcripción y descripción visual
  - [ ] 5.4 Generar embeddings multimodales con text-embedding-ada-002
  - [ ] 5.5 Implementar upsert en Pinecone con metadatos completos (resourceId,
        start, end, type)
  - [ ] 5.6 Crear funciones de consulta y eliminación de vectores en Pinecone
  - [ ] 5.7 Implementar paralelización para acelerar generación de embeddings
  - [ ] 5.8 Configurar namespace strategy para multi-tenant (futuro)

- [ ] 6.0 Desarrollo de Interfaz Web Básica
  - [ ] 6.1 Instalar Shadcn/ui components y configurar Tailwind CSS
  - [ ] 6.2 Crear página principal (src/app/page.tsx) con layout responsive
  - [ ] 6.3 Implementar componente VideoUploader con drag & drop usando Shadcn
  - [ ] 6.4 Crear componente ResourceList para mostrar vídeos subidos y estado
  - [ ] 6.5 Implementar formulario de upload con validación (título, descripción
        opcional)
  - [ ] 6.6 Configurar polling automático para actualizar estado de recursos
  - [ ] 6.7 Mostrar progreso visual con progress bar de Shadcn
  - [ ] 6.8 Implementar manejo de errores y toast notifications
  - [ ] 6.9 Añadir iconos de Lucide para estados y acciones

- [ ] 7.0 Sistema de Notificaciones y Monitoreo
  - [ ] 7.1 Implementar sistema de webhooks en src/lib/webhooks.ts
  - [ ] 7.2 Crear endpoints para registrar/gestionar webhook URLs
  - [ ] 7.3 Enviar notificaciones cuando cambie estado (processing →
        completed/failed)
  - [ ] 7.4 Implementar logs detallados en colección Resources
  - [ ] 7.5 Crear endpoint GET /api/resources/{id}/vectors para info de Pinecone
  - [ ] 7.6 Configurar monitoreo básico de salud del sistema
  - [ ] 7.7 Implementar documentación OpenAPI/Swagger automática
  - [ ] 7.8 Crear guía de integración RAG para desarrolladores
