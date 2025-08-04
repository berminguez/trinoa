# PRD: Worker de Video - Procesamiento Avanzado de Contenido Audiovisual

## 1. Introducción/Overview

El Worker de Video es un componente crítico del sistema Eidetik que transforma contenido audiovisual en datos estructurados y consultables por sistemas de IA. Su objetivo principal es procesar videos MP4 subidos por usuarios y convertirlos en información granular que pueda ser utilizada por sistemas RAG (Retrieval-Augmented Generation) para hacer el conocimiento audiovisual accesible y consultable.

**Problema que resuelve:** Los videos contienen información valiosa (audio + visual) que no es directamente consultable por sistemas de IA. Este worker extrae, estructura y describe todo el contenido para hacer posible la "memoria eidética" de videos.

## 2. Goals

1. **Extracción precisa de contenido audiovisual** - Transcribir audio con >95% de precisión y detectar cambios de escena significativos
2. **Estructuración granular en chunks** - Dividir el contenido en segmentos de 15 segundos consultables independientemente  
3. **Generación de descripciones visuales** - Crear descripciones detalladas de frames clave usando GPT-4o Vision
4. **Síntesis inteligente** - Generar sinopsis global que contextualice el contenido completo
5. **Robustez y recuperación** - Manejar errores de forma aislada con reintentos automáticos
6. **Preparación para RAG** - Estructurar toda la información para facilitar la indexación y búsqueda semántica

## 3. User Stories

**Como empresa con biblioteca de videos educativos:**
- Quiero que mis videos sean procesados automáticamente para que mis usuarios puedan hacer preguntas específicas sobre el contenido y obtener respuestas precisas con referencias temporales.

**Como usuario final subiendo un video:**
- Quiero que mi video sea analizado completamente (audio + visual) para poder consultarlo posteriormente usando IA, preguntando tanto por lo que se dice como por lo que se ve.

**Como sistema automatizado de procesamiento:**
- Quiero procesar lotes de videos de forma confiable, obteniendo datos estructurados consistentes que pueda indexar en sistemas de búsqueda semántica.

**Como desarrollador integrando con Eidetik:**
- Quiero recibir datos de video estructurados en chunks con timestamps precisos para implementar funcionalidades de búsqueda temporal y contextual.

## 4. Functional Requirements

### 4.1 Descarga y Preparación
1. El sistema debe descargar el archivo MP4 desde S3 al directorio temporal `/tmp/video.mp4`
2. El sistema debe implementar reintentos automáticos (3 intentos con backoff exponencial) para descargas fallidas
3. El sistema debe registrar cada intento en `resources.logs` con estado y detalles del error
4. Si tras 3 intentos la descarga falla, el sistema debe marcar el job como `failed`
5. El sistema debe validar que el recurso contiene los campos requeridos: `namespace`, `filters`, `user_metadata`

### 4.2 Transcripción Completa con Whisper
5. El sistema debe procesar el audio usando OpenAI Whisper para obtener transcripción completa
6. El sistema debe generar "conversación json con tiempos" en formato array de segmentos temporales
7. El sistema debe almacenar el resultado completo como string en el campo `transcription`
8. El sistema debe registrar logs con formato `{ step: "transcribe", status, timestamp, details }`

### 4.3 Detección de Escenas y Extracción de Frames
9. El sistema debe usar PySceneDetect para identificar cambios significativos de escena
10. El sistema debe filtrar solo cambios con histogram diff superior al umbral configurado
11. El sistema debe extraer un key-frame por cada rango de escena usando FFmpeg
12. El sistema debe guardar frames como `/tmp/frame_<timestamp_ms>.jpg`
13. El sistema debe registrar logs separados para `scenes_detect` y `frames_extract`

### 4.4 Descripción Visual con GPT-4o Vision
14. El sistema debe crear Media objects en PayloadCMS para cada frame extraído
15. El sistema debe invocar GPT-4o Vision con prompt específico para obtener descripción corta y descripción extensa
16. El sistema debe generar objetos screenshot almacenados en array `screenshots` con estructura:
    ```json
    {
      "id": "23456765432",
      "image": "Media_Object_ID",
      "shortDescription": "Profesor explicando enfrente de una pizarra",
      "description": "Hay un profesor explicando frente a una pizarra. La clase parece un colegio, las paredes blancas, pizarra verde, hay un crucifijo arriba de la pizarra, en la pizarra se puede leer: x + y = 4z | x = 3. Etc..."
    }
    ```
17. El sistema debe registrar cada proceso de `frame_describe` en logs

### 4.5 Generación de Chunks de 15 segundos (Sin Overlap)
18. El sistema debe dividir el contenido en chunks de 15,000ms (15 segundos) sin overlap
19. Para cada chunk, el sistema debe extraer transcripción parcial correspondiente al rango temporal (en formato "conversación json con tiempos")
20. Para cada chunk, el sistema debe filtrar screenshots que caen dentro del rango temporal
21. El sistema debe generar descripción de chunk usando GPT-4 basándose en transcripción parcial y descripciones cortas de screenshots
22. El sistema debe crear objetos chunk almacenados en array `chunks` con estructura:
    ```json
    {
      "id": "64589675432",
      "timeStart": 15000,
      "timeEnd": 30000,
      "transcription": "conversación json con tiempos del fragmento",
      "description": "El profesor explica, se levanta de la silla y se acerca a la pizarra.",
      "screenshots": ["screenshot_id_1", "screenshot_id_2"]
    }
    ```

### 4.6 Síntesis Global
23. El sistema debe generar sinopsis general usando GPT-4 basada en transcripción completa y descripciones de chunks
24. El sistema debe crear sinopsis de 2-3 párrafos que incluya tema, propósito, contexto y puntos clave
25. El sistema debe almacenar resultado en campo `description`

### 4.7 Persistencia y Finalización en PayloadCMS
26. El sistema debe actualizar el documento Resource en Payload CMS con la estructura completa procesada:
    ```json
    {
      "id": "78677649832032847",
      "title": "título del video",
      "type": "video",
      "namespace": "curso-ejemplo",
      "filters": {},
      "transcription": "transcripción completa de whisper",
      "user_metadata": {},
      "screenshots": [/* array de objetos screenshot */],
      "chunks": [/* array de objetos chunk */],
      "description": "El vídeo es una clase de matemáticas en la escuela de Murcia donde el profesor explica las ecuaciones de segundo grado. Etc....",
      "status": "completed",
      "completedAt": "2025-01-04T12:34:56.789Z"
    }
    ```
27. El sistema debe limpiar archivos temporales después del procesamiento exitoso

### 4.8 Manejo de Casos Especiales
28. Para videos sin audio, el sistema debe procesar solo análisis visual (screenshots y chunks solo con descripciones visuales)
29. Para videos menores a 15 segundos, el sistema debe crear un único chunk con `timeStart: 0` y `timeEnd: duración_total`
30. El sistema debe continuar procesamiento parcial si fallan pasos individuales

### 4.9 Actualización del Endpoint de Upload
31. El endpoint `/api/resources/upload` debe actualizarse para recibir campos adicionales:
    - `namespace`: string requerido para organizar contenidos
    - `filters`: object opcional para configuración de Pinecone
    - `user_metadata`: object opcional para metadatos del usuario
32. El sistema debe validar que `namespace` no esté vacío y tenga formato válido

## 5. Non-Goals (Out of Scope)

- **Limitaciones de tamaño/duración:** No procesar videos superiores a 2GB o 3 horas de duración
- **Generación de embeddings:** Los embeddings vectoriales serán generados por worker separado
- **Análisis de contenido avanzado:** No incluye detección de objetos específicos, reconocimiento facial, o análisis de sentimientos
- **Edición o transformación:** No modifica, recorta o transforma el video original
- **Streaming en tiempo real:** Solo procesamiento de archivos completos subidos
- **Múltiples formatos:** Solo MP4 en esta versión del MVP

## 6. Design Considerations

### 6.1 Modificaciones Required en PayloadCMS

**Colección Resources debe incluir los siguientes campos:**
```typescript
{
  // Campos existentes
  id: string,
  title: string,
  type: 'video' | 'audio' | 'pdf' | 'ppt',
  file: Media,
  status: 'pending' | 'processing' | 'completed' | 'failed',
  
  // Nuevos campos requeridos
  namespace: string,                    // Para organizar contenidos
  filters: object,                      // JSON para filters de Pinecone
  transcription: string,                // Transcripción completa de Whisper
  user_metadata: object,                // JSON de metadatos del usuario
  description: string,                  // Descripción generada por GPT-4
  
  // Arrays relacionales
  screenshots: Array<{
    id: string,
    image: Media,                       // Relación a Media object
    shortDescription: string,
    description: string
  }>,
  
  chunks: Array<{
    id: string,
    timeStart: number,                  // Milisegundos
    timeEnd: number,                    // Milisegundos
    transcription: string,              // JSON con tiempos del fragmento
    description: string,
    screenshots: Array<string>          // Referencias a IDs de screenshots
  }>
}
```

### 6.2 Configuración mediante Variables de Entorno
```bash
CHUNK_SIZE_MS=15000           # Tamaño de chunks en milisegundos (15 segundos)
SCENE_DETECTION_THRESHOLD=0.3 # Umbral para detección de escenas
FRAME_QUALITY=720             # Resolución de frames extraídos
WHISPER_MODEL=whisper-1       # Modelo de Whisper a utilizar
GPT_VISION_MODEL=gpt-4o       # Modelo de visión para describir frames
GPT_TEXT_MODEL=gpt-4          # Modelo para descripciones de chunks y síntesis
```

### 6.2 Estructura de Logs Detallados
Cada paso debe registrar logs con formato consistente:
```json
{
  "step": "transcribe|scenes_detect|frames_extract|frame_describe|chunk_process|global_synthesis",
  "status": "started|progress|success|error",
  "at": "2025-01-04T12:34:56.789Z",
  "details": "Descripción específica del paso",
  "data": { /* datos específicos del paso */ }
}
```

### 6.3 Gestión de Archivos Temporales
- Usar `/tmp/` para almacenamiento temporal durante procesamiento
- Limpieza automática al finalizar (exitoso o fallido)
- Manejo de límites de espacio en disco

## 7. Technical Considerations

### 7.1 Dependencias Principales
- **OpenAI API:** Whisper, GPT-4, GPT-4o Vision
- **FFmpeg:** Extracción de frames y manipulación de video
- **PySceneDetect:** Detección automática de cambios de escena
- **AWS S3:** Almacenamiento de frames y acceso a video original

### 7.2 Manejo de Rate Limits
- Implementar rate limiting para llamadas a OpenAI API
- Procesamiento en paralelo limitado para frames múltiples
- Backoff exponencial para reintentos

### 7.3 Gestión de Memoria
- Procesamiento streaming para videos grandes
- Liberación de memoria entre chunks
- Monitoreo de uso de recursos del sistema

## 8. Success Metrics

### 8.1 Métricas de Calidad
- **Precisión de transcripción:** >95% para audio claro (medido contra transcripciones manuales)
- **Detección de escenas:** Identificación precisa de cambios significativos sin false positives excesivos
- **Calidad de descripciones:** Descripciones coherentes y útiles que agreguen valor contextual

### 8.2 Métricas de Performance  
- **Tiempo de procesamiento:** Máximo 2x la duración del video para procesamiento completo
- **Tasa de éxito:** >98% de jobs completados sin errores críticos
- **Disponibilidad del worker:** >99% uptime para procesamiento de cola

### 8.3 Métricas de Robustez
- **Recuperación de errores:** Reintentos exitosos en >90% de fallos temporales
- **Consistencia de output:** Estructura de datos idéntica independiente del contenido de video

## 9. Open Questions

1. **Límites de costo por video:** ¿Establecer límite máximo de llamadas a OpenAI por video individual?
2. **Validación de namespace:** ¿Qué formato específico debe seguir el campo namespace? (ej: alfanumérico, guiones)
3. **Formato de filters:** ¿Qué estructura específica debe seguir el objeto filters para Pinecone?
4. **Paralelización de frames:** ¿Procesar múltiples descripciones de GPT-4o Vision simultáneamente?
5. **Calidad de frames:** ¿Extraer frames en resolución original o redimensionar para optimizar costos?
6. **Detección de idioma:** ¿Auto-detectar idioma para Whisper y optimizar prompts de GPT-4?
7. **Gestión de Media objects:** ¿Cómo manejar la limpieza de screenshots si falla el procesamiento?
8. **Formato temporal:** ¿Usar milisegundos consistentemente o permitir otros formatos como HH:MM:SS?

---

**Documento creado:** 2025-01-04  
**Versión:** 1.0  
**Autor:** Equipo Eidetik  
**Target Implementation:** Q1 2025 