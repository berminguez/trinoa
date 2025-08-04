Quiero que implementes el “Worker Vídeo” de Eidetik exactamente con esta ruta de trabajo, pero incorporando las siguientes mejoras de robustez, precisión y rendimiento:

1. **Descarga del MP4**  
   - Descarga desde S3 a `/tmp/video.mp4` con retries (3 intentos, back-off exponencial).  
   - Si falla, registra en `resources.logs` y reintenta; si tras 3 intentos sigue fallando, marca el job como `failed`.

2. **Transcripción completa (Whisper → JSON)**  
   - Llama a Whisper y obtén un JSON array de `{ text, start_ms, end_ms }` (milisegundos).  
   - Guarda este array en `transcript_full`.  
   - Registra en logs `{ step: "transcribe", status, timestamp, details }`.

3. **Detección de escenas y extracción de key-frames**  
   - Usa PySceneDetect para obtener rangos de escena `[{ start_ms, end_ms }]`.  
   - Filtra solo cambios significativos (histogram diff > umbral).  
   - Por cada rango, con FFmpeg extrae un key-frame y guárdalo como `/tmp/frame_<timestamp_ms>.jpg`.  
   - Registra logs de los pasos `scenes_detect` y `frames_extract`.

4. **Descripción de cada frame (GPT-4o Vision)**  
   - Para cada `/tmp/frame_<ts>.jpg`:  
     • Súbelo a S3 y obtén `screenshotUrl`.  
     • Invoca GPT-4o Vision con el prompt:
     ```
     Eres un asistente que describe escenas. Para esta imagen:
     • Proporciona “shortDescription” (1–2 frases).
     • Proporciona “longDescription” (3–4 frases con detalles: objetos, textos que encuentres en la imagen, número de asistentes, iluminación, contexto, señales).
     ```
     • Almacena en un array `screenshots` objetos de la forma:
     ```jsonc
     {
       "id": "<resourceId>--frame-<timestamp_ms>",
       "timestamp_ms": 1234500,
       "screenshotUrl": "...",
       "shortDescription": "...",
       "longDescription": "..."
     }
     ```
     • Loguea cada `frame_describe`.

5. **Arrays de chunks de 15 s (con overlap)**  
   - Divide la línea de tiempo en fragmentos de 15 000 ms con 2 000 ms de overlap.  
   - Para cada chunk:
     1. Extrae de `transcript_full` los items cuyo rango caiga dentro de `[start_ms, end_ms]`.  
     2. Filtra `screenshots` para quedarte solo los cuya `timestamp_ms` esté en ese intervalo.  
     3. Construye un objeto chunk:
     ```jsonc
     {
       "id": "<resourceId>--chunk-<start_ms>",
       "start_ms": 15000,
       "end_ms": 30000,
       "transcription": "…",      // concatenación de textos de transcript_full
       "screenshots": [ … ]       // subset de screenshots
     }
     ```
     4. Llama a GPT-4 con este prompt:
     ```
     Eres un asistente en sumarización de vídeo.
     Recibes:
     • Transcripción parcial (15 s): "<transcription>"
     • Array de shortDescriptions de screenshots en ese periodo.
     Genera una “chunkDescription” de 2–3 frases que resuma lo visual y auditivo.
     ```
     5. Añade `"description": "…"` al chunk y registra `chunk_process`.

6. **Síntesis global (Sinopsis)**  
   - Al completar todos los chunks, invoca GPT-4 con:
     ```
     Eres un asistente de vídeo.
     Tienes la transcripción completa y este array de chunkDescriptions:
     [{ "start_ms":…, "description": "…" }, …]
     Genera una sinopsis general de 2–3 párrafos que:
     • Describa el tema y propósito del vídeo.
     • Contextualice curso/ubicación.
     • Destaque puntos clave.
     ```
   - Guarda el resultado en `description` y registra `global_synthesis`.

7. **Finalización y persistencia**  
   - Actualiza el documento `resource` en Payload CMS:
     ```jsonc
     {
       "id": "78677649832032847",
       "title": "título del vídeo",
       "type": "video",
       "namespace": "curso-ejemplo",
       "filters": { /* opcional */ },
       "transcription_full": [ … ],
       "user_metadata": { … },
       "screenshots": [ /* array detallado arriba */ ],
       "chunks": [ /* array de chunks con descripción */ ],
       "description": "Sinopsis generada",
       "status": "completed",
       "completedAt": "2025-07-04T12:34:56.789Z"
     }
     ```


**Consideraciones extra**  
- Emplea timestamps en **ms o ISO 8601** para máxima precisión.
- Maneja errores de cada sub-paso de forma aislada, permitiendo reintentos individuales sin bloquear todo el job.
- Procesa en paralelo hasta N chunks simultáneos, respetando rate limits de OpenAI.
- Parámetros configurables: tamaño de chunk, overlap, timeouts, rutas temporales.
- Mantén las capturas en S3 para futuras funcionalidades de visión avanzada, aunque no hagas embeddings visuales en este MVP.
