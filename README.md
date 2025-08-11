# 🌱 Trinoa - Plataforma de Cálculo de Huella de Carbono

> **Digitaliza tu gestión de emisiones con IA**

Trinoa es una plataforma empresarial que automatiza el cálculo de huella de carbono mediante el procesamiento inteligente de facturas y recibos. Utilizando tecnologías de OCR e IA, convierte automáticamente documentos físicos y digitales en datos estructurados para el análisis preciso de emisiones de CO₂.

[![Built with Payload CMS](https://img.shields.io/badge/Built%20with-Payload%20CMS-blue)](https://payloadcms.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15.3-black)](https://nextjs.org/)

## 🚀 Características Principales

- **📄 Gestión de Documentos**: Upload de facturas, recibos y documentos vía API REST con interfaz web
- **🤖 Procesamiento Automático**: OCR avanzado + Extracción de datos con IA + Clasificación automática
- **🔍 Análisis Inteligente**: Identificación de emisiones por categorías (combustible, electricidad, transporte, etc.)
- **📊 Cálculos Precisos**: Algoritmos de conversión a CO₂ equivalente por sector
- **🌱 Compensación**: Integración con programas de plantación de árboles
- **🔒 Seguridad Empresarial**: Autenticación robusta y datos protegidos por empresa

## 🌍 ¿Cómo Funciona Trinoa?

Trinoa facilita a las empresas el proceso completo de medición y compensación de su huella de carbono:

1. **📤 Subida de Documentos**: Los clientes cargan facturas de energía, combustible, transporte, etc.
2. **🔍 Procesamiento IA**: OCR extrae datos clave (consumos, fechas, proveedores, montos)
3. **📈 Análisis de Emisiones**: Algoritmos calculan CO₂ equivalente por actividad
4. **🌳 Compensación**: Sugerencias personalizadas de plantación de árboles
5. **📋 Reportes**: Informes detallados para certificaciones y auditorías

## 🛠️ Stack Tecnológico

| Componente | Tecnología |
|------------|------------|
| **Backend/CMS** | Payload CMS + Next.js + TypeScript |
| **Base de Datos** | MongoDB Atlas |
| **Almacenamiento** | AWS S3 |
| **IA Services** | OpenAI (GPT-4o Vision, text-embedding-3-small) |
| **OCR** | Azure Document Intelligence / Tesseract |
| **UI** | Shadcn/ui + Tailwind CSS + Tabler Icons |
| **Deploy** | Railway (Web Service + Background Workers) |

## 📋 Requisitos Previos

- **Node.js**: ^18.20.2 || >=20.9.0
- **pnpm**: ^9 || ^10
- **Cuentas de servicio**:
  - MongoDB Atlas
  - AWS S3
  - OpenAI API
  - Pinecone
  - Azure Document Intelligence (opcional)

## 🚀 Instalación y Configuración

### 1. Clonar el Repositorio

```bash
git clone <repository-url>
cd trinoa
```

### 2. Instalar Dependencias

```bash
pnpm install
```

### 3. Configurar Variables de Entorno

Edita `.env` con tus credenciales:

```bash
# MongoDB Atlas
DATABASE_URI=mongodb+srv://username:password@cluster.mongodb.net/trinoa-prod

# AWS S3
AWS_ACCESS_KEY_ID=tu-access-key
AWS_SECRET_ACCESS_KEY=tu-secret-key
AWS_S3_BUCKET=tu-bucket-name

# OpenAI
OPENAI_API_KEY=sk-tu-api-key

# Pinecone
PINECONE_API_KEY=tu-pinecone-key
PINECONE_ENVIRONMENT=us-east-1-aws

# Azure Document Intelligence (opcional)
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=https://tu-resource.cognitiveservices.azure.com/
AZURE_DOCUMENT_INTELLIGENCE_KEY=tu-azure-key

# Payload CMS
PAYLOAD_SECRET=tu-payload-secret

# Autenticación
JWT_SECRET=tu-jwt-secret
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
pnpm test:upload      # Test endpoint de upload de documentos
pnpm test:all         # Test completo del sistema

# Workers y Monitoring
pnpm worker:document  # Iniciar worker de procesamiento de documentos
pnpm worker:embedding # Iniciar worker de generación de embeddings
pnpm queue:monitor    # Monitor básico de la cola
pnpm queue:monitor:detailed # Monitor avanzado con limpieza automática
```

## 🔧 Workers de Procesamiento

Trinoa incluye workers especializados para el procesamiento de documentos empresariales.

### Opción 1: Workers Integrados (Desarrollo)
Los workers se ejecutan automáticamente cuando inicia la aplicación Next.js.

### Opción 2: Workers Separados (Producción)

**Worker de Procesamiento de Documentos:**
```bash
# Script con monitoreo incluido
pnpm tsx scripts/start-document-worker.ts

# Con configuración personalizada
WORKER_NAME=document-worker-prod-1 INSTANCE_ID=1 pnpm tsx scripts/start-document-worker.ts
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
    "database": { "status": "healthy" },
    "ocr": { "status": "healthy", "provider": "azure" }
  },
  "queue": {
    "stats": { "pending": 5, "running": 2, "completed": 47, "failed": 1 }
  }
}
```

## 📁 Estructura del Proyecto

```
src/
├── actions/          # Server Actions organizados por funcionalidad
│   ├── companies/    # Gestión de empresas cliente
│   ├── documents/    # Gestión de documentos y facturas
│   ├── emissions/    # Cálculos de huella de carbono
│   └── projects/     # Proyectos de compensación
├── app/              # Next.js App Router
│   ├── (frontend)/   # Interfaz web para empresas
│   └── (payload)/    # Admin panel de Payload CMS
├── collections/      # Colecciones de Payload CMS
│   ├── Companies.ts  # Empresas cliente
│   ├── Documents.ts  # Documentos procesados
│   ├── Emissions.ts  # Registros de emisiones
│   └── Users.ts      # Usuarios del sistema
├── components/       # Componentes React
├── lib/              # Librerías y utilidades
│   ├── config.ts     # Configuración centralizada
│   ├── queue.ts      # Sistema de cola (Agenda)
│   ├── storage.ts    # AWS S3 utilities
│   ├── ocr.ts        # Servicios de OCR
│   ├── emissions.ts  # Cálculos de CO₂
│   └── carbon-offset.ts # Compensación de carbono
├── types/            # Tipos TypeScript centralizados
└── workers/          # Workers de procesamiento
    ├── document-processor.ts  # Procesamiento de documentos
    └── embedding-generator.ts # Generación de embeddings
```

## 🔌 API Endpoints

### Gestión de Documentos

```http
# Subir documento con procesamiento automático
POST /api/documents/upload
Content-Type: multipart/form-data
Authorization: Bearer YOUR_JWT_TOKEN
Body:
  - title: string (requerido)
  - description: string (opcional)
  - type: 'invoice' | 'receipt' | 'bill' | 'expense'
  - category: 'energy' | 'transport' | 'materials' | 'waste'
  - file: File (requerido)

# Consultar estado de procesamiento
GET /api/documents/{id}

# Ver datos extraídos
GET /api/documents/{id}/data

# Obtener cálculos de emisiones
GET /api/documents/{id}/emissions

# Corregir datos extraídos
PUT /api/documents/{id}/data
```

### Cálculos de Huella de Carbono

```http
# Obtener emisiones totales de la empresa
GET /api/companies/{id}/emissions

# Calcular emisiones por período
GET /api/companies/{id}/emissions?start=2024-01-01&end=2024-12-31

# Obtener sugerencias de compensación
GET /api/companies/{id}/offset-suggestions

# Generar reporte de sostenibilidad
GET /api/companies/{id}/sustainability-report
```

## 🔄 Workflow de Procesamiento

```mermaid
graph TD
    A[Subir Factura/Recibo] --> B[Crear Document]
    B --> C[Encolar Job de OCR]
    C --> D[Extracción de Texto]
    D --> E[Análisis con IA]
    E --> F[Clasificación de Emisiones]
    F --> G[Cálculo de CO₂]
    G --> H[Indexación para Búsqueda]
    H --> I[Actualizar Dashboard]
    I --> J[Notificar Cliente]
    J --> K[Sugerir Compensación]
```

## 🎯 Categorías de Emisiones Soportadas

- **⚡ Energía**: Electricidad, gas natural, combustibles fósiles
- **🚗 Transporte**: Combustible de vehículos, vuelos, transporte público
- **🏭 Producción**: Materias primas, procesos industriales
- **🗂️ Oficina**: Suministros, equipamiento, servicios
- **♻️ Residuos**: Gestión de residuos, reciclaje
- **💧 Agua**: Consumo de agua y tratamiento
- **🌐 Digital**: Servicios en la nube, centros de datos

## 🌱 Factores de Conversión

Trinoa utiliza factores de emisión actualizados basados en:
- **DEFRA** (Department for Environment, Food and Rural Affairs)
- **EPA** (Environmental Protection Agency)
- **IPCC** (Intergovernmental Panel on Climate Change)
- **Estándares locales** por país y región

## 🎯 Métricas de Éxito

- **Precisión OCR**: >95% en facturas estándar
- **Clasificación IA**: >90% precisión en categorización automática
- **Tiempo de Procesamiento**: <2 minutos por documento promedio
- **Satisfacción Cliente**: >4.5/5 en facilidad de uso
- **Reducción de Emisiones**: Seguimiento de compensaciones realizadas

## 🗺️ Roadmap

### ✅ Fase Actual (Q1 2025)
- ✅ Procesamiento automático de facturas PDF y JPG
- ✅ Cálculos básicos de huella de carbono
- ✅ Dashboard empresarial
- ✅ Autenticación segura por empresa

### 🔄 Próximas Fases
- **Q2 2025**: Integración con APIs de proveedores energéticos
- **Q3 2025**: Reportes automatizados para certificaciones
- **Q4 2025**: Marketplace de compensación de carbono
- **2026**: IA predictiva para optimización de emisiones

## 👥 Tipos de Usuario

### 🏢 Empresas Cliente
- Acceso a dashboard personalizado
- Subida y gestión de documentos
- Visualización de huella de carbono
- Descarga de reportes

### 🛠️ Administradores Trinoa
- Gestión de empresas cliente
- Supervisión de procesamiento
- Configuración de factores de emisión
- Analytics del sistema

## 🔒 Seguridad y Privacidad

- **Encriptación**: Todos los documentos se almacenan encriptados
- **Aislamiento**: Datos completamente separados por empresa
- **Auditoría**: Logs completos de acceso y modificaciones
- **GDPR**: Cumplimiento total con regulaciones de privacidad
- **Backup**: Respaldos automáticos y recuperación de desastres

## 📞 Soporte

- **Documentación**: Revisa la documentación técnica en `/docs`
- **Issues**: Reporta problemas técnicos internamente
- **Desarrollo**: Sigue las [reglas de desarrollo](./.cursorrules)

## 📄 Licencia

Este proyecto es propiedad privada de Trinoa. Uso interno únicamente.

---

**Trinoa** - _Simplificando la sostenibilidad empresarial con tecnología_ 🌱🤖
