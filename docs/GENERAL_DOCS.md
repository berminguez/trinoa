# Documentación Técnica: Plataforma Trinoa de Cálculo de Huella de Carbono

> **Objetivo**: Proporcionar un servicio empresarial que permita a las empresas subir facturas y recibos, transformando automáticamente su contenido en datos estructurados para el cálculo preciso de huella de carbono mediante OCR e IA. La plataforma facilita la gestión completa del proceso de medición y compensación de emisiones.

---

## Índice

1. [Visión y Objetivo del Proyecto](#visión-y-objetivo-del-proyecto)
2. [Valor y Alcance del MVP](#valor-y-alcance-del-mvp)
3. [Tecnología y Stack](#tecnología-y-stack)
4. [Arquitectura de Componentes](#arquitectura-de-componentes)
5. [Modelo de Datos — Colección ](#modelo-de-datos--colección-documents)[`documents`](#modelo-de-datos--colección-documents)
6. [API REST](#api-rest)
7. [Workflow de Procesamiento](#workflow-de-procesamiento)
8. [Detalles de los Workers](#detalles-de-los-workers)
9. [Cálculos de Huella de Carbono](#cálculos-de-huella-de-carbono)
10. [Gestión de Errores y Monitoreo](#gestión-de-errores-y-monitoreo)
11. [Seguridad y Buenas Prácticas](#seguridad-y-buenas-prácticas)
12. [Despliegue e Infraestructura](#despliegue-e-infraestructura)
13. [Roadmap y Extensiones Futuras](#roadmap-y-extensiones-futuras)
14. [Glosario y Referencias](#glosario-y-referencias)

---

## 1. Visión y Objetivo del Proyecto

### Visión

Simplificar la gestión de sostenibilidad empresarial mediante la automatización del cálculo de huella de carbono. Una plataforma donde todas las facturas y recibos se convierten automáticamente en **datos estructurados de emisiones** para facilitar certificaciones y programas de compensación.

### Objetivos

- **MVP Documentos**: permitir upload de facturas PDF/JPG y extraer automáticamente datos de consumo energético, transporte y materiales.
- **Cálculo Automatizado**: conversión directa de datos extraídos a CO₂ equivalente por categoría.
- **Compensación Inteligente**: sugerencias personalizadas de plantación de árboles basadas en emisiones calculadas.

---

## 2. Valor y Alcance del MVP

- **Propuesta de valor**: las empresas necesitan medir su huella de carbono para certificaciones y RSC. Trinoa automatiza el proceso más tedioso: la extracción y clasificación de datos de consumo.
- **Alcance inicial**:
  - Ingesta de facturas PDF e imágenes (JPG, PNG).
  - OCR avanzado para extracción de datos estructurados.
  - Clasificación automática por categorías de emisión.
  - Cálculo de CO₂ equivalente usando factores estándar.
  - Dashboard empresarial con reportes descargables.
  - Sistema de sugerencias de compensación.
- **KPIs clave**: precisión OCR >95%, tiempo de procesamiento <2min/documento, satisfacción cliente >4.5/5.

---

## 3. Tecnología y Stack

| Capa                     | Tecnología / Librerías                                                    |                                                                      |
| ------------------------ | ------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| **API / CMS**            | Payload CMS (Node.js, MongoDB)                                           |                                                                      |
| **Almacenamiento**       | AWS S3 (documentos originales), MongoDB (metadatos de Payload)           |                                                                      |
| **Cola de Jobs**         | Agenda (MongoDB)                                                         | Sistema de colas ligero utilizando la misma base de datos de Payload |
| **Worker Documentos**    | Node.js: Azure Document Intelligence, Tesseract OCR, OpenAI GPT-4o       |                                                                      |
| **Worker Embeddings**    | Node.js: OpenAI (text-embedding-3-small), Pinecone SDK                   |                                                                      |
| **Cálculos CO₂**         | Factores DEFRA, EPA, IPCC, algoritmos personalizados                     |                                                                      |
| **Vector Store**         | Pinecone (búsqueda semántica de documentos)                              |                                                                      |
| **UI**                   | Shadcn/ui + Tailwind CSS + Tabler Icons                                  |                                                                      |
| **Deploy**               | Railway (Web Service + Background Workers)                               |                                                                      |

---

## 4. Arquitectura de Componentes

```
+---------+           +---------------+           +----------------+
| Empresa |--POST---->| Payload CMS   |--enque--->| Worker Docs    |
+---------+           +---------------+           +-------+--------+   
                                                        |        |   
                                                        v        v   
                                                   +--------+ +--------+
                                                   | OCR     | | AI     |
                                                   | Azure   | | GPT-4o |
                                                   +--------+ +--------+
                                                        |        |   
                                                        v        v   
                                                  +----------------+
                                                  | Worker Embeds  |
                                                  +----------------+
                                                        |
                                                        v
                                                   +-----------+
                                                   | Pinecone  |
                                                   +-----------+
                                                        |
                                                        v
                                                +----------------+
                                                | Cálculo CO₂    |
                                                | Dashboard      |
                                                +----------------+
```

*Flujo de datos*:

1. La empresa sube facturas a `/api/documents/upload`.
2. Payload guarda metadatos y encola job de procesamiento.
3. Worker Documentos extrae datos con OCR + IA.
4. Worker Embeddings indexa contenido para búsqueda.
5. Sistema calcula emisiones CO₂ automáticamente.
6. Dashboard actualizado con nuevos datos.

---

## 5. Modelo de Datos — Colección `documents`

```js
{
  slug: 'documents',
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'description', type: 'textarea' },
    { name: 'company', type: 'relationship', relationTo: 'companies', required: true },
    { name: 'type', type: 'select', options: [
      { label: 'Factura', value: 'invoice' },
      { label: 'Recibo', value: 'receipt' },
      { label: 'Ticket', value: 'ticket' },
      { label: 'Gastos', value: 'expense' }
    ], defaultValue: 'invoice' },
    { name: 'category', type: 'select', options: [
      { label: 'Energía', value: 'energy' },
      { label: 'Transporte', value: 'transport' },
      { label: 'Materiales', value: 'materials' },
      { label: 'Oficina', value: 'office' },
      { label: 'Residuos', value: 'waste' },
      { label: 'Agua', value: 'water' },
      { label: 'Digital', value: 'digital' }
    ] },
    { name: 'file', type: 'upload', relationTo: 'media', required: true },
    { name: 'status', type: 'select', options: [
      { label: 'Pendiente', value: 'pending' },
      { label: 'Procesando', value: 'processing' },
      { label: 'Completado', value: 'completed' },
      { label: 'Fallido', value: 'failed' },
      { label: 'Requiere revisión', value: 'review' }
    ], defaultValue: 'pending' },
    { name: 'progress', type: 'number', admin: { readOnly: true } },
    { name: 'extractedData', type: 'json', admin: { readOnly: true } },
    { name: 'emissions', type: 'group', fields: [
      { name: 'co2Amount', type: 'number' },
      { name: 'calculationMethod', type: 'text' },
      { name: 'emissionFactor', type: 'number' },
      { name: 'confidence', type: 'number' }
    ] },
    { name: 'logs', type: 'array', fields: [
      { name: 'step', type: 'text' },
      { name: 'status', type: 'text' },
      { name: 'at', type: 'dateTime' },
      { name: 'details', type: 'text' }
    ] }
  ],
  hooks: {
    afterChange: [ async ({ doc, operation }) => {
      if (operation === 'create') {
        // Encolar job de procesamiento de documento
        await enqueueDocumentProcessing(doc.id)
      }
    }]
  }
}
```

---

## 6. API REST

### 6.1. Subir documento

```
POST /api/documents/upload
Content-Type: multipart/form-data
Authorization: Bearer JWT_TOKEN

{ file: PDF|JPG, type: 'invoice', category: 'energy', title: 'Factura Luz Enero', description: 'Factura eléctrica mensual' }
```

**Respuesta:**

```json
{ "id": "doc_123", "status": "pending", "message": "Documento encolado para procesamiento" }
```

### 6.2. Consultar estado

```
GET /api/documents/doc_123
```

**Respuesta:**

```json
{ 
  "id": "doc_123", 
  "type": "invoice", 
  "category": "energy",
  "status": "completed",
  "progress": 100, 
  "emissions": {
    "co2Amount": 45.2,
    "calculationMethod": "DEFRA_2024",
    "confidence": 0.95
  },
  "createdAt": "2025-01-15T10:00:00Z" 
}
```

### 6.3. Ver datos extraídos

```
GET /api/documents/doc_123/data
```

**Respuesta:**

```json
{
  "supplier": "Iberdrola",
  "period": { "start": "2024-12-01", "end": "2024-12-31" },
  "consumption": { "amount": 450, "unit": "kWh" },
  "cost": { "amount": 89.50, "currency": "EUR" },
  "extractionConfidence": 0.92
}
```

### 6.4. Obtener emisiones de empresa

```
GET /api/companies/company_456/emissions?start=2024-01-01&end=2024-12-31
```

**Respuesta:**

```json
{
  "totalCO2": 1250.8,
  "breakdown": {
    "energy": 650.2,
    "transport": 400.5,
    "materials": 200.1
  },
  "offsetSuggestion": {
    "trees": 62,
    "cost": 1250.80,
    "projects": ["Reforestación Amazonas", "Bosques Urbanos Madrid"]
  }
}
```

---

## 7. Workflow de Procesamiento

1. **OCR Avanzado**: Azure Document Intelligence o Tesseract → texto estructurado.
2. **Análisis con IA**: GPT-4o extrae datos específicos (proveedor, consumo, período, costo).
3. **Clasificación**: algoritmo determina categoría de emisión si no se especificó.
4. **Cálculo CO₂**: factores de conversión según tipo de energía/combustible/actividad.
5. **Indexación**: embeddings del contenido para búsqueda semántica.
6. **Validación**: sistema de confianza y flags para revisión manual.
7. **Actualización**: dashboard empresarial con nuevos cálculos.

---

## 8. Detalles de los Workers

### 8.1. Worker Documentos

**Funciones principales:**
- Descarga documento de S3
- OCR con Azure Document Intelligence (preferido) o Tesseract (fallback)
- Análisis con GPT-4o para extracción semántica
- Clasificación automática de categoría de emisión
- Cálculo preliminar de CO₂
- Almacenamiento de datos estructurados

**Pipeline de extracción:**
```json
{
  "supplier": "string",
  "period": { "start": "date", "end": "date" },
  "consumption": { "amount": "number", "unit": "string" },
  "cost": { "amount": "number", "currency": "string" },
  "energyType": "electricity|gas|diesel|gasoline",
  "confidence": 0.0-1.0
}
```

### 8.2. Worker Embeddings

**Funciones principales:**
- Genera embeddings con text-embedding-3-small (1024 dimensiones)
- Indexa en Pinecone para búsqueda semántica
- Permite consultas como "facturas de electricidad de diciembre"
- Facilita análisis de patrones de consumo

---

## 9. Cálculos de Huella de Carbono

### 9.1. Factores de Emisión por Categoría

**Energía:**
- Electricidad (España): 0.256 kg CO₂/kWh (CNMC 2024)
- Gas natural: 0.202 kg CO₂/kWh (DEFRA 2024)
- Gasóleo calefacción: 2.96 kg CO₂/litro

**Transporte:**
- Gasolina: 2.31 kg CO₂/litro
- Diésel: 2.69 kg CO₂/litro
- Vuelos domésticos: 0.255 kg CO₂/km

**Materiales:**
- Papel oficina: 0.91 kg CO₂/kg
- Plástico: 6.0 kg CO₂/kg
- Aluminio: 11.5 kg CO₂/kg

### 9.2. Algoritmo de Cálculo

```javascript
function calculateEmissions(extractedData, category) {
  const factor = getEmissionFactor(category, extractedData.energyType)
  const consumption = extractedData.consumption.amount
  const unit = extractedData.consumption.unit
  
  // Conversión a unidades estándar si es necesario
  const standardConsumption = convertToStandardUnit(consumption, unit)
  
  // Cálculo CO₂
  const co2Amount = standardConsumption * factor
  
  return {
    co2Amount: Math.round(co2Amount * 100) / 100,
    calculationMethod: `${factor.source}_${factor.year}`,
    emissionFactor: factor.value,
    confidence: extractedData.confidence * factor.reliability
  }
}
```

---

## 10. Gestión de Errores y Monitoreo

- **Retries**: back-off exponencial (hasta 3 intentos)
- **Logs detallados**: cada paso guarda en `documents.logs`
- **Alertas**: notificación para documentos con `status: 'failed'` o `confidence < 0.7`
- **Dashboard administrativo**: monitoreo en tiempo real de procesamiento
- **Métricas**: tiempo promedio de procesamiento, tasa de éxito OCR, precisión de clasificación

---

## 11. Seguridad y Buenas Prácticas

- **Validación estricta**: MIME types, tamaño máximo, estructura de archivos
- **Autenticación robusta**: JWT tokens por empresa, aislamiento completo de datos
- **Encriptación**: documentos encriptados en S3, comunicaciones HTTPS
- **Auditoría**: logs completos de acceso y modificaciones
- **GDPR**: cumplimiento total, derecho al olvido implementado
- **IAM**: privilegios mínimos para workers y servicios

---

## 12. Despliegue e Infraestructura

Para el MVP priorizaremos **Railway** con un sistema de colas ligero:

1. **Estructura del proyecto**:

   ```
   /api              ← Payload CMS (Web Service)
   /worker-documents ← Worker Documentos (Background Worker)
   /worker-embeddings← Worker Embeddings (Background Worker)
   /dashboard        ← Dashboard empresarial (Web Service)
   ```

2. **Railway**:

   - **Web Service**: despliega `api` con Payload CMS apuntando a MongoDB Atlas
   - **Background Workers**: dos servicios Worker para procesamiento de documentos y embeddings
   - **Queue**: utiliza **Agenda** ligado a MongoDB (sin infraestructura adicional)

3. **Bases de datos**:

   - **MongoDB Atlas**: datos de Payload, cola de jobs, logs
   - **Pinecone**: índice `trinoa-documents` para búsqueda semántica
   - **S3**: almacenamiento de documentos originales

4. **Variables de entorno**:

   ```bash
   # Base de datos
   DATABASE_URI=mongodb+srv://...
   
   # IA y OCR
   OPENAI_API_KEY=sk-...
   AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=https://...
   AZURE_DOCUMENT_INTELLIGENCE_KEY=...
   
   # Vector store
   PINECONE_API_KEY=...
   PINECONE_ENVIRONMENT=us-east-1-aws
   
   # Almacenamiento
   AWS_ACCESS_KEY_ID=...
   AWS_SECRET_ACCESS_KEY=...
   AWS_S3_BUCKET=trinoa-documents
   
   # Autenticación
   JWT_SECRET=...
   PAYLOAD_SECRET=...
   ```

5. **Health Checks**:

   ```json
   {
     "status": "healthy",
     "services": {
       "api": { "status": "healthy", "uptime": 3600 },
       "queue": { "status": "healthy", "pending": 5, "processing": 2 },
       "ocr": { "status": "healthy", "provider": "azure" },
       "emissions": { "status": "healthy", "factors_updated": "2024-01-15" }
     }
   }
   ```

---

## 13. Roadmap y Extensiones Futuras

### ✅ Fase Actual (Q1 2025)
- ✅ Procesamiento automático de facturas PDF y JPG
- ✅ OCR con Azure Document Intelligence
- ✅ Cálculos básicos de huella de carbono
- ✅ Dashboard empresarial con reportes

### 🔄 Próximas Fases
- **Q2 2025**: 
  - Integración con APIs de proveedores energéticos
  - Importación automática de facturas digitales
  - Análisis predictivo de consumo
- **Q3 2025**: 
  - Reportes automatizados para certificaciones (ISO 14001, GRI)
  - Integración con sistemas ERP empresariales
  - Alertas de anomalías en consumo
- **Q4 2025**: 
  - Marketplace de compensación de carbono
  - Proyectos de reforestación personalizados
  - API para partners de sostenibilidad
- **2026**: 
  - IA predictiva para optimización de emisiones
  - Análisis de cadena de suministro (Scope 3)
  - Blockchain para trazabilidad de compensaciones

---

## 14. Pipeline de Transformación Detallado

Este apartado describe los **tres grandes pasos** del pipeline de Trinoa para convertir documentos empresariales en datos estructurados de emisiones.

```
Documento PDF/JPG
   │
   ├───➤ 1) Extracción OCR (Azure Document Intelligence)
   │        - Obtener texto estructurado con posiciones
   │        - Identificar tablas, campos clave, fechas
   │        - Almacenar como `raw_text` con metadatos de confianza
   │
   ├───➤ 2) Análisis semántico con IA (GPT-4o)
   │        ├─ Identificar tipo de documento (factura vs recibo vs ticket)
   │        ├─ Extraer datos estructurados:
   │        │    • Proveedor/empresa emisora
   │        │    • Período de facturación
   │        │    • Consumo (cantidad + unidad)
   │        │    • Costo total y desglose
   │        │    • Tipo de energía/combustible
   │        │    • Datos adicionales (potencia, tarifa, etc.)
   │        │ Construir objeto estructurado:
   │        │    ```json
   │        │    {
   │        │      "supplier": "Iberdrola",
   │        │      "period": { "start": "2024-01-01", "end": "2024-01-31" },
   │        │      "consumption": { "amount": 450, "unit": "kWh" },
   │        │      "cost": { "amount": 89.50, "currency": "EUR" },
   │        │      "energyType": "electricity",
   │        │      "tariff": "tarifa_nocturna",
   │        │      "confidence": 0.95
   │        │    }
   │        │    ```
   │        └─ Generar `extracted_data` validado
   │
   └───➤ 3) Cálculo de emisiones y clasificación
            - Input: `extracted_data` + factores de emisión actualizados
            - Proceso:
              1. Determinar categoría de emisión (Scope 1, 2 o 3)
              2. Aplicar factor de conversión regional/nacional
              3. Calcular CO₂ equivalente
              4. Estimar incertidumbre del cálculo
            - Salida: `emissions_data` con cálculos validados
            - Indexación para búsqueda semántica

```json
{
  "documentId": "doc_123",
  "raw_text": "...",
  "extracted_data": {
    "supplier": "Repsol",
    "period": { "start": "2024-01-15", "end": "2024-01-15" },
    "consumption": { "amount": 45.5, "unit": "litros" },
    "cost": { "amount": 67.80, "currency": "EUR" },
    "fuelType": "diesel",
    "confidence": 0.92
  },
  "emissions_data": {
    "co2Amount": 122.4,
    "calculationMethod": "DEFRA_2024",
    "emissionFactor": 2.69,
    "scope": 1,
    "confidence": 0.90
  },
  "category": "transport",
  "status": "completed"
}
```

### Validación y control de calidad

- **Validación automática**: rangos esperados, formatos de fecha, unidades coherentes
- **Flags de revisión**: documentos con `confidence < 0.8` marcados para revisión manual
- **Aprendizaje continuo**: feedback humano mejora precisión del modelo
- **Auditoría**: trail completo de decisiones de IA para transparencia

### Conversión a vectores para búsqueda

1. **Documento completo**:
   ```javascript
   text = `${extracted_data.supplier} ${extracted_data.energyType} ${extracted_data.period.start} consumo ${extracted_data.consumption.amount}${extracted_data.consumption.unit}`
   embedding = openai.embeddings.create(model='text-embedding-3-small', input=text)
   pinecone.upsert(id=documentId, vector=embedding.data[0].embedding, metadata=extracted_data)
   ```

2. **Búsquedas posibles**:
   - "facturas de electricidad del último trimestre"
   - "gastos en combustible superiores a 100 euros"
   - "consumo de gas en invierno"

---

## 15. Glosario y Referencias

- **OCR**: Optical Character Recognition (Reconocimiento Óptico de Caracteres)
- **GPT-4o**: Modelo multimodal de OpenAI para análisis de texto e imágenes
- **DEFRA**: Department for Environment, Food and Rural Affairs (Reino Unido)
- **EPA**: Environmental Protection Agency (Estados Unidos)
- **IPCC**: Intergovernmental Panel on Climate Change
- **Scope 1/2/3**: Categorías de emisiones según el protocolo GHG
- **CO₂eq**: CO₂ equivalente (incluye todos los gases de efecto invernadero)
- **Pinecone**: Vector database para búsqueda semántica
- **Azure Document Intelligence**: Servicio de Microsoft para análisis de documentos

---

*Esta documentación técnica sirve como guía de implementación para la plataforma Trinoa y se actualizará conforme evolucione el producto y sus funcionalidades.*

