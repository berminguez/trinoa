# 🧠 Eidetik MVP - Plataforma de Ingesta de Vídeo a Vector Store

> **Convierte contenido audiovisual en "memoria eidética" accesible por IA**

Eidetik es una plataforma API que transforma automáticamente vídeos MP4 en vectores semánticos indexables, listos para alimentar sistemas RAG (Retrieval-Augmented Generation). El MVP se enfoca en procesar vídeos y hacer que el conocimiento audiovisual sea consultable por asistentes de IA.

[![Built with Payload CMS](https://img.shields.io/badge/Built%20with-Payload%20CMS-blue)](https://payloadcms.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15.3-black)](https://nextjs.org/)

## 🚀 Características Principales

- **🎥 Ingesta de Vídeos**: Upload de MP4 vía API REST con interfaz web
- **🤖 Procesamiento Automático**: Transcripción (Whisper) + Detección de escenas (PySceneDetect) + Descripción visual (GPT-4o Vision)
- **🔍 Vector Store**: Embeddings multimodales indexados en Pinecone
- **⚡ RAG Ready**: Endpoints listos para integración con sistemas de IA
- **📊 Monitoreo**: Webhooks, logs detallados y APIs de estado
- **🔒 Seguro**: Autenticación con API keys y validación de archivos

## 🛠️ Stack Tecnológico

| Componente | Tecnología |
|------------|------------|
| **Backend/CMS** | Payload CMS + Next.js + TypeScript |
| **Base de Datos** | MongoDB Atlas |
| **Almacenamiento** | AWS S3 |
| **Cola de Jobs** | Agenda (MongoDB) |
| **Vector Store** | Pinecone |
| **IA Services** | OpenAI (Whisper, GPT-4o Vision, text-embedding-ada-002) |
| **Procesamiento** | FFmpeg, PySceneDetect |
| **UI** | Shadcn/ui + Tailwind CSS + Lucide Icons |
| **Deploy** | Render (Web Service + Background Workers) |

## 📋 Requisitos Previos

- **Node.js**: ^18.20.2 || >=20.9.0
- **pnpm**: ^9 || ^10
- **Cuentas de servicio**:
  - MongoDB Atlas
  - AWS S3
  - OpenAI API
  - Pinecone

## 🚀 Instalación y Configuración

### 1. Clonar el Repositorio

```bash
git clone <repository-url>
cd eidetik
```

### 2. Instalar Dependencias

```bash
pnpm install
```

### 3. Configurar Variables de Entorno

```bash
cp .env.example .env
```

Edita `.env` con tus credenciales:

```bash
# MongoDB Atlas
DATABASE_URI=mongodb+srv://username:password@cluster.mongodb.net/eidetik-prod

# AWS S3
AWS_ACCESS_KEY_ID=tu-access-key
AWS_SECRET_ACCESS_KEY=tu-secret-key
AWS_S3_BUCKET=tu-bucket-name

# OpenAI
OPENAI_API_KEY=sk-tu-api-key

# Pinecone
PINECONE_API_KEY=tu-pinecone-key
PINECONE_ENVIRONMENT=us-east-1-aws

# API Keys (para autenticación)
API_KEYS=tu-api-key-1,tu-api-key-2
```

### 4. Iniciar Desarrollo

```bash
pnpm dev
```

La aplicación estará disponible en `http://localhost:3000`

## 📜 Scripts Disponibles

```bash
# Desarrollo
pnpm dev              # Servidor de desarrollo
pnpm devsafe          # Desarrollo con limpieza de .next

# Build y Deploy
pnpm build            # Build de producción
pnpm start            # Servidor de producción

# Payload CMS
pnpm payload          # CLI de Payload
pnpm generate:types   # Regenerar tipos TypeScript

# Calidad de Código
pnpm lint             # Verificar ESLint
pnpm lint:fix         # Corregir problemas de ESLint
pnpm format           # Formatear con Prettier
pnpm format:check     # Verificar formato
pnpm type-check       # Verificar tipos TypeScript
pnpm code-quality     # Verificación completa (tipos + lint + formato)

# Testing
pnpm test             # Ejecutar todos los tests
pnpm test:int         # Tests de integración
pnpm test:e2e         # Tests end-to-end
pnpm test:queue       # Test sistema de cola y workers
pnpm test:api         # Test endpoints de la API
pnpm test:upload      # Test endpoint de upload atómico
pnpm test:all         # Test completo del sistema

# Workers y Monitoring
pnpm worker:video     # Iniciar worker de procesamiento de vídeo
pnpm worker:embedding # Iniciar worker de generación de embeddings
pnpm queue:monitor    # Monitor básico de la cola
pnpm queue:monitor:detailed # Monitor avanzado con limpieza automática
```

## 🔧 Workers de Procesamiento

Eidetik incluye workers especializados que pueden ejecutarse de forma independiente para escalar horizontalmente el procesamiento.

### Opción 1: Workers Integrados (Desarrollo)
Los workers se ejecutan automáticamente cuando inicia la aplicación Next.js.

### Opción 2: Workers Separados (Producción)

**Worker de Procesamiento de Vídeo:**
```bash
# Script con monitoreo incluido
pnpm tsx scripts/start-video-worker.ts

# Con configuración personalizada
WORKER_NAME=video-worker-prod-1 INSTANCE_ID=1 pnpm tsx scripts/start-video-worker.ts
```

**Worker de Generación de Embeddings:**
```bash
# Script con monitoreo incluido
pnpm tsx scripts/start-embedding-worker.ts

# Con configuración personalizada
WORKER_NAME=embedding-worker-prod-1 INSTANCE_ID=1 pnpm tsx scripts/start-embedding-worker.ts
```

**Monitor de Cola:**
```bash
# Monitoreo básico cada 30 segundos
pnpm tsx scripts/queue-monitor.ts

# Monitoreo detallado con limpieza automática
pnpm tsx scripts/queue-monitor.ts --detailed --cleanup --interval 15

# Ver opciones disponibles
pnpm tsx scripts/queue-monitor.ts --help
```

### Health Check del Sistema

```bash
# API health check
curl http://localhost:3000/api/health

# Respuesta ejemplo:
{
  "status": "healthy",
  "services": {
    "api": { "status": "healthy", "uptime": 3600 },
    "queue": { "status": "healthy", "agenda": true, "mongodb": true },
    "database": { "status": "healthy" }
  },
  "queue": {
    "stats": { "pending": 2, "running": 1, "completed": 15, "failed": 0 }
  }
}
```

### Variables de Entorno para Workers

```bash
# Configuración de Workers
WORKER_NAME=video-worker-1        # Nombre único del worker
INSTANCE_ID=1                     # ID de instancia para escalabilidad
NODE_ENV=production               # Entorno de ejecución
```

## 🧪 Testing del Sistema

Eidetik incluye un sistema completo de testing para verificar que todo funciona correctamente antes de pasar a la implementación del procesamiento de vídeo.

### Tests Disponibles

```bash
# Test completo del sistema (recomendado)
pnpm test:all

# Tests individuales
pnpm test:queue       # Sistema de cola y workers
pnpm test:api         # Endpoints de la API
pnpm test:upload      # Endpoint de upload atómico
pnpm build           # Verificación de build
pnpm type-check      # Verificación de tipos TypeScript
```

### Pre-requisitos para Testing

1. **Servidor de desarrollo corriendo** (para tests de API):
   ```bash
   pnpm dev
   # Esperar que aparezca "Ready in X ms"
   ```

2. **Variables de entorno configuradas** (especialmente `DATABASE_URI`):
   ```bash
   # Verificar que .env contiene al menos:
   DATABASE_URI=mongodb+srv://...
   ```

### Tests Paso a Paso

**1. Test Rápido (sin API):**
```bash
# Solo verifica build y sistema de cola
pnpm test:queue
```

**2. Test Completo (con API):**
```bash
# Terminal 1: Iniciar servidor
pnpm dev

# Terminal 2: Ejecutar tests
pnpm test:all
```

**3. Monitoreo en Tiempo Real:**
```bash
# Monitor básico
pnpm queue:monitor

# Monitor avanzado con limpieza automática
pnpm queue:monitor:detailed
```

### Interpretación de Resultados

**🎉 Success Rate 100%**: ✅ Sistema listo para Task 4.0 (Procesamiento de Vídeo)  
**⚠️ Success Rate 75-99%**: Funcionalidad básica OK, revisar errores menores  
**🚨 Success Rate <75%**: Problemas críticos, debe solucionarse antes de continuar

### Troubleshooting Testing

**❌ "Queue initialization failed":**
- Verificar `DATABASE_URI` en `.env`
- Confirmar conectividad a MongoDB Atlas

**❌ "Server is not available":**
- Verificar que `pnpm dev` esté corriendo
- Confirmar que el puerto 3000 esté libre

**❌ "Job enqueue failed":**
- Verificar logs de Agenda en MongoDB
- Comprobar que no hay colisiones de nombres de jobs

### Output de Ejemplo

```bash
🧪 Starting Comprehensive Eidetik Test Suite
================================================================================
🎯 Testing: Queue System + API Endpoints + Upload Endpoint + Build Verification
================================================================================

✅ 1. Build Verification - PASSED
✅ 2. Type Checking - PASSED  
✅ 3. Queue System Testing - PASSED
✅ 4. API Endpoints Testing - PASSED
✅ 5. Upload Endpoint Testing - PASSED

🏁 COMPREHENSIVE TEST RESULTS
================================================================================
✅ Passed Test Suites: 5
❌ Failed Test Suites: 0
📈 Success Rate: 100.0%

🎉 ALL SYSTEMS GO! Eidetik is ready for video processing implementation.
✨ You can proceed with Task 4.0: Video Processing Pipeline
```

## 📁 Estructura del Proyecto

```
src/
├── actions/          # Server Actions organizados por funcionalidad
│   ├── jobs/         # Gestión de jobs de procesamiento
│   └── resources/    # Gestión de recursos de vídeo
├── app/              # Next.js App Router
│   ├── (frontend)/   # Interfaz web pública
│   └── (payload)/    # Admin panel de Payload CMS
├── collections/      # Colecciones de Payload CMS
├── components/       # Componentes React
├── lib/              # Librerías y utilidades
│   ├── config.ts     # Configuración centralizada
│   ├── queue.ts      # Sistema de cola (Agenda)
│   ├── storage.ts    # AWS S3 utilities
│   ├── pinecone.ts   # Vector store management
│   ├── openai.ts     # AI services
│   └── webhooks.ts   # Sistema de notificaciones
├── types/            # Tipos TypeScript centralizados
└── workers/          # Workers de procesamiento
    ├── video-processor.ts      # Procesamiento de vídeo
    └── embedding-generator.ts  # Generación de embeddings
```

## 🔌 API Endpoints

### Recursos de Vídeo

```http
# Crear recurso con upload atómico (recomendado)
POST /api/resources/upload
Content-Type: multipart/form-data
Body:
  - title: string (requerido)
  - description: string (opcional)
  - type: 'video' | 'audio' | 'pdf' | 'ppt'
  - file: File (requerido)

# Crear recurso sin archivo (legacy)
POST /api/resources
Content-Type: application/json
Authorization: Bearer YOUR_API_KEY

# Consultar estado
GET /api/resources/{id}

# Ver logs de procesamiento
GET /api/resources/{id}/logs

# Eliminar recurso
DELETE /api/resources/{id}

# Obtener información de vectores
GET /api/resources/{id}/vectors
```

### Webhooks

```http
# Registrar webhook
POST /api/webhooks
{
  "url": "https://tu-servidor.com/webhook",
  "events": ["resource.completed", "resource.failed"],
  "secret": "tu-secret"
}
```

## 🔄 Workflow de Procesamiento

```mermaid
graph TD
    A[Upload MP4] --> B[Crear Resource]
    B --> C[Encolar Job de Video]
    C --> D[Transcripción con Whisper]
    D --> E[Detección de Escenas]
    E --> F[Extracción de Fotogramas]
    F --> G[Segmentación en Chunks]
    G --> H[Jobs de Embedding]
    H --> I[Descripción Visual GPT-4o]
    I --> J[Generación de Embeddings]
    J --> K[Indexar en Pinecone]
    K --> L[Notificar Completado]
```

## 🎯 Métricas de Éxito del MVP

- **Adopción**: 5 empresas usando activamente en 3 meses
- **Performance**: Máximo 2x la duración del vídeo para procesamiento
- **Calidad**: >95% precisión en transcripción de audio claro
- **Disponibilidad**: >99% uptime del servicio

## 🗺️ Roadmap

### ✅ MVP Actual (Q1 2025)
- ✅ Ingesta y procesamiento de vídeos MP4
- ✅ Pipeline de transcripción y vectorización
- ✅ API REST completa
- ✅ Interfaz web básica

### 🔄 Próximas Fases
- **Q2 2025**: Soporte para PDF y documentos
- **Q3 2025**: Procesamiento de audio (podcasts)
- **Q4 2025**: Presentaciones PPT y slides
- **2026**: Portal completo con analytics

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama: `git checkout -b feature/nueva-funcionalidad`
3. Commit: `git commit -m 'feat: añadir nueva funcionalidad'`
4. Push: `git push origin feature/nueva-funcionalidad`
5. Abre un Pull Request

## 📞 Soporte

- **Documentación**: Revisa los [PRDs y tasks](./tasks/) del proyecto
- **Issues**: Reporta problemas en GitHub Issues
- **Desarrollo**: Sigue las [reglas de desarrollo](./.cursorrules)

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

---

**Eidetik** - _Convirtiendo conocimiento audiovisual en memoria eidética para IA_ 🧠✨
