# Documentación Técnica: Plataforma de Ingesta Multimodal (MVP Vídeo)

> **Objetivo**: Proporcionar un servicio API que permita a los usuarios subir vídeos (MP4) y transformar automáticamente su contenido en vectores indexables en Pinecone, listos para alimentar sistemas RAG. En fases posteriores, la plataforma admitirá otros tipos de recursos (PDF, audio, PPT…), manteniendo una experiencia unificada.

---

## Índice

1. [Visión y Objetivo del Proyecto](#visión-y-objetivo-del-proyecto)
2. [Valor y Alcance del MVP Vídeo](#valor-y-alcance-del-mvp-vídeo)
3. [Tecnología y Stack](#tecnología-y-stack)
4. [Arquitectura de Componentes](#arquitectura-de-componentes)
5. [Modelo de Datos — Colección ](#modelo-de-datos--colección-resources)[`resources`](#modelo-de-datos--colección-resources)
6. [API REST](#api-rest)
7. [Workflow de Procesamiento](#workflow-de-procesamiento)
8. [Detalles de los Workers](#detalles-de-los-workers)
9. [Gestión de Errores y Monitoreo](#gestión-de-errores-y-monitoreo)
10. [Seguridad y Buenas Prácticas](#seguridad-y-buenas-prácticas)
11. [Despliegue e Infraestructura](#despliegue-e-infraestructura)
12. [Roadmap y Extensiones Futuras](#roadmap-y-extensiones-futuras)
13. [Glosario y Referencias](#glosario-y-referencias)

---

## 1. Visión y Objetivo del Proyecto

### Visión

Convertir cualquier contenido empresarial (vídeos de formación, webinars, manuales PDF, presentaciones) en **conocimiento semántico** accesible por IA. Una plataforma donde todos los recursos multimodales convivan en un único vector store.

### Objetivos

- **MVP Vídeo**: permitir upload de MP4 y generar embeddings de segmentos de audio y descripciones visuales.
- **UX Unificada**: un solo endpoint para todos los tipos de recursos.
- **RAG Ready**: los vectores generados alimentan chatbots y asistentes virtuales.

---

## 2. Valor y Alcance del MVP Vídeo

- **Propuesta de valor**: las empresas invierten horas de vídeo en formación y marketing. Nuestro servicio indexa esa información, mejorando la búsqueda y personalización de la IA.
- **Alcance inicial**:
  - Ingesta de vídeos MP4.
  - Transcripción con Whisper.
  - Detección de escenas y extracción de fotogramas.
  - Descripción visual con LLM de visión.
  - Generación de embeddings textuales+visuales.
  - Almacenamiento en Pinecone.
- **KPIs clave**: tiempo medio de procesamiento / minuto de vídeo, tasa de éxito de jobs, latencia de queries RAG.

---

## 3. Tecnología y Stack

| Capa                                | Tecnología / Librerías                                                |                                                                      |
| ----------------------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------- |
| **API / CMS**                       | Payload CMS (Node.js, MongoDB)                                        |                                                                      |
| **Almacenamiento**                  | AWS S3 (vídeos y frames), MongoDB (metadatos de Payload)              |                                                                      |
| **Cola de Jobs**                    | Agenda (MongoDB)                                                      | Sistema de colas ligero utilizando la misma base de datos de Payload |
| Redis con BullMQ o Agenda (MongoDB) | Sistema de colas sencillo para MVP, integrable como addon en Render   |                                                                      |
| RabbitMQ / Redis Streams / AWS SQS  |                                                                       |                                                                      |
| **Worker Vídeo**                    | Node.js o Python: Whisper, PySceneDetect, FFmpeg                      |                                                                      |
| **Worker Embeddings**               | Node.js: OpenAI (gpt-4o-vision, text-embedding-ada-002), Pinecone SDK |                                                                      |
| **Vector Store**                    | Pinecone                                                              |                                                                      |
| **Despliegue**                      | Docker, Kubernetes / AWS ECS / Heroku / Vercel                        |                                                                      |

---

## 4. Arquitectura de Componentes

```
+---------+           +---------------+           +-------------+
| Cliente |--POST---->| Payload CMS   |--enque--->| Worker Vídeo|
+---------+           +---------------+           +------+------+   
                                                       |       |   
                                                       v       v   
                                                  +--------+ +--------+
                                                  | S3      | | PyScene|
                                                  +--------+ +--------+
                                                       |       |   
                                                       v       v   
                                                 +---------------+
                                                 | Worker Embeds |
                                                 +---------------+
                                                       |
                                                       v
                                                  +-----------+
                                                  | Pinecone  |
                                                  +-----------+
                                                       |
                                                       v
                                               +---------------+
                                               | Payload CMS DB|
                                               +---------------+
```

*Flujo de datos*:

1. El cliente sube un vídeo a `/api/resources`.
2. Payload guarda metadatos y encola job.
3. Worker Vídeo procesa el MP4 y publica sub-jobs por segmento.
4. Worker Embeddings genera y sube vectores.
5. Estado actualizado en Payload.

---

## 5. Modelo de Datos — Colección `resources`

```js
{
  slug: 'resources',
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'description', type: 'textarea' },
    { name: 'type', type: 'select', options: [
      { label: 'Vídeo', value: 'video' },
      { label: 'PDF',   value: 'pdf'   },
      { label: 'Audio', value: 'audio' },
      { label: 'PPT',   value: 'ppt'   }
    ], defaultValue: 'video' },
    { name: 'file',    type: 'upload', relationTo: 'media', required: true },
    { name: 'status',  type: 'select', options: [
      { label: 'pending',   value: 'pending'   },
      { label: 'processing',value: 'processing'},
      { label: 'completed', value: 'completed' },
      { label: 'failed',    value: 'failed'    }
    ], defaultValue: 'pending' },
    { name: 'progress', type: 'number', admin: { readOnly: true } },
    { name: 'logs',     type: 'array', fields: [
      { name: 'step',    type: 'text'     },
      { name: 'status',  type: 'text'     },
      { name: 'at',      type: 'dateTime' },
      { name: 'details', type: 'text'     }
    ] }
  ],
  hooks: {
    afterChange: [ async ({ doc, operation }) => {
      if (operation === 'create' && doc.type === 'video') {
        // Encolar job de vídeo
      }
      // FUTURO: manejar otros tipos (pdf, audio, ppt)
    }]
  }
}
```

---

## 6. API REST

### 6.1. Crear recurso

```
POST /api/resources
Content-Type: multipart/form-data

{ file: MP4, type: 'video', title: 'Clase 1', description: 'Introducción' }
```

**Respuesta:**

```json
{ "id": "res_123", "status": "pending" }
```

### 6.2. Consultar estado

```
GET /api/resources/res_123
```

**Respuesta:**

```json
{ "id":"res_123", "type":"video", "status":"processing",
  "progress": 40, "createdAt":"2025-07-04T10:00:00Z" }
```

### 6.3. Consultar logs

```
GET /api/resources/res_123/logs
```

**Respuesta:**

```json
[
  { "step":"transcribe","status":"success","at":"...","details":"..." },
  { "step":"scenes","status":"success","at":"..." }
]
```

### 6.4. Eliminar recurso

```
DELETE /api/resources/res_123
```

**Respuesta:**

```json
{ "success": true }
```

---

## 7. Workflow de Procesamiento

1. **Transcripción**: Whisper → JSON con `[{text, start, end}, …]`.
2. **Detección de escenas**: PySceneDetect → lista de rangos (`start`, `end`).
3. **Extracción de fotogramas**: FFmpeg → `frame_XXXX.jpg`.
4. **Sub-jobs**: por cada segmento `(start,end, transcript, frame)`.
5. **Descripción visual**: GPT-4o Vision/CLIP → texto descriptivo.
6. **Chunk JSON**:
   ```json
   { "resourceId":"res_123", "start":60, "end":65,
     "transcript":"…", "description":"…" }
   ```
7. **Embeddings**: text-embedding-ada-002 → vector.
8. **Upsert**: Pinecone index `resources-chunks`.

---

## 8. Detalles de los Workers

### 8.1. Worker Vídeo

- Descarga MP4 de S3.
- Llama a Whisper (`whisper-1`).
- Ejecuta PySceneDetect.
- Extrae fotogramas (1 cada 5s).
- Publica sub-jobs JSON.

### 8.2. Worker Embeddings

- Consume sub-job.
- Llama a GPT-4o Vision para descripción.
- Genera embedding combinado.
- Upsert en Pinecone con metadata `{resourceId, start, end}`.

---

## 9. Gestión de Errores y Monitoreo

- **Retries**: back-off exponencial (hasta 3).
- **Logs**: cada paso guarda en `resources.logs`.
- **Alertas**: opcional Slack/Email para `failed`.

---

## 10. Seguridad y Buenas Prácticas

- Validar MIME y tamaño.
- Autenticación: API Keys/JWT.
- IAM con privilegios mínimos.
- Variables de entorno para claves.

---

## 11. Despliegue e Infraestructura

Para el MVP priorizaremos **Render** y un sistema de colas ligero:

1. **Monorepo** en GitHub con carpetas:

   ```
   /api        ← Payload CMS (Web Service)
   /worker-vid ← Worker Vídeo (Background Worker)
   /worker-emb ← Worker Embeddings (Background Worker)
   ```

2. **Render**:

   - **Web Service**: despliega `api` apuntando a MongoDB Atlas para Payload CMS.
   - **Background Workers**: crea dos servicios de tipo Worker para `/worker-vid` y `/worker-emb`.
   - **Queue**: utiliza **Agenda** ligado a MongoDB (sin necesidad de addon extra). Configura en el worker la conexión a `PAYLOAD_MONGODB_URL` para encolar y procesar.

3. **Queue**:

   - Utiliza **BullMQ** (con Redis) o **Agenda** (sobre MongoDB) para encolar y procesar jobs sin infra adicional.
   - Configura la URL de Redis en las variables de entorno (`REDIS_URL`).

4. **Pinecone**:

   - Crea el índice `resources-chunks` y configura las claves API en Render.
   - **Importante**: desactiva la opción de "Integrated Embedding" al crear el índice, ya que las embeddings se generan externamente en el Worker Embeddings y se insertan manualmente.

5. **S3**:

   - Usa AWS S3 para almacenar vídeos y fotogramas; configura el bucket y credenciales en env vars.

6. **Variables de entorno**:

   - `PAYLOAD_MONGODB_URL`, `REDIS_URL`, `PINECONE_API_KEY`, `OPENAI_API_KEY`, `S3_BUCKET`, etc.

7. **Health Checks y Escalado**:

   - Habilita health checks en los servicios de Render.
   - Ajusta el número de instancias de Workers según la carga (cronómetro o auto-scaling de Render).

Con esta configuración mínima en Render lanzamos un MVP funcional sin montar infra pesada, listo para iterar y validar rápidamente.

## 12. Roadmap y Extensiones Futuras. Roadmap y Extensiones Futuras

- **Q3 2025**: Worker PDF, ingesta de texto estructurado.
- **Q4 2025**: Worker Audio (podcasts).
- **Q1 2026**: Worker PPT con extracción de slides.
- **Mid-2026**: Portal frontend drag-&-drop y analytics.

---

## 13. Pipeline de Transformación Detallado

Este apartado describe en detalle los **tres grandes pasos** (ramas) del pipeline de Eidetik para convertir un vídeo MP4 en un JSON rico y estructurado, listo para indexar en Pinecone.

````
Vídeo MP4
   │
   ├───➤ 1) Transcripción completa (Whisper)
   │        - Obtener JSON con [{ text, start, end }]
   │        - Almacenar como `transcript_full` en el JSON final
   │
   ├───➤ 2) Chunking visual por escenas (PySceneDetect + FFmpeg)
   │        ├─ Detectar cambios de escena → lista de rangos (start,end)
   │        ├─ Extraer key‑frames para cada rango
   │        ├─ Para cada key‑frame:
   │        │    • Enviar imagen a GPT-4o Vision →
   │        │      • `description_short` (1–2 frases)
   │        │      • `description_long` (detalle de objetos, texto en pizarra, número de asistentes, iluminación, etc.)
   │        │    • Construir objeto chunk:
   │        │      ```json
   │        │      {
   │        │        "start": 123.5,
   │        │        "end": 130.2,
   │        │        "description_short": "Profesor señalando diagrama en pizarra",
   │        │        "description_long": "El profesor explica un diagrama de flujo en la pizarra, con una libreta abierta. En la sala hay 10 alumnos sentados bajo luz natural..."
   │        │      }
   │        │      ```
   │        └─ Generar array `chunks_visual` con todos los objetos
   │
   └───➤ 3) Síntesis global (GPT-4)
            - Input al modelo: 
              1. `transcript_full` completo
              2. Para cada chunk en `chunks_visual`: solo `description_short`
            - Prompt: “Lee la transcripción completa y las descripciones cortas de cada sección. Resume de forma genérica de qué trata este vídeo, dónde ocurre (institución, contexto) y cuál es su propósito.”
            - Salida: `synopsis` — texto de 2–3 párrafos describiendo el contexto general, tema y alcance de la clase.

```json
{
  "resourceId": "res_123",
  "transcript_full": [ ... ],
  "chunks_visual": [
     { "start":…, "end":…, "description_short":…, "description_long":… },
     …
  ],
  "synopsis": "Esta lección de la TecnoCreativa..."
}
````

### Almacenamiento intermedio: JSON vs Markdown

- **JSON** estructurado permite manipulación programática directa y fácil serialización a vectores.
- **Markdown** puede facilitar revisión manual, documentación y versionado con diffs legibles.

**Recomendación**: guardar el JSON de cada vídeo como fuente de verdad (`.json`) y opcionalmente generar un `.md` al vuelo (o bajo demanda) para presentaciones o revisiones humanas.

### Conversión a vectores

1. **Chunks**: cada elemento de `chunks_visual` se convierte en un vector:
   ```python
   text = chunk['transcript_excerpt'] + ' ' + chunk['description_short']
   embedding = openai.embeddings.create(model='text-embedding-ada-002', input=text)
   pinecone.upsert(id=f"{resourceId}-{chunk['start']}", vector=embedding.vector, metadata=chunk)
   ```
2. **Sinopsis**: también puedes crear un vector de `synopsis` para consultas de alto nivel.
3. **Transcripción completa**: si deseas búsquedas palabra a palabra, fragmenta el transcript en bloques de N tokens y embédelos.

Así, el vector store contendrá tres tipos de vectores: **micro** (chunks visuales), **macro** (synopsis) y **transcript** (texto puro), cubriendo todas las necesidades de RAG.

## 14. Glosario y Referencias

- **RAG**: Retrieval-Augmented Generation.
- **Whisper**: modelo OpenAI para transcripción.
- **PySceneDetect**: detección de escenas en vídeo.
- **FAISS**: biblioteca de similaridad vec
- **Pinecone**: vector database gestionado.

---

*Esta documentación sirve como guía de implementación y se ampliará con ejemplos de código, diagramas detallados y tests cuando se avance en el desarrollo.*

