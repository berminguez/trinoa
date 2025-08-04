# PRD: Eidetik MVP - Plataforma de Ingesta de Vídeo a Vector Store

## 1. Introducción/Overview

**Eidetik** es una plataforma API que convierte contenido audiovisual en
"memoria eidética" accesible por sistemas de IA. El MVP se enfoca en procesar
vídeos MP4 y transformar automáticamente su contenido en vectores indexables,
listos para alimentar sistemas RAG (Retrieval-Augmented Generation).

### Problema que Resuelve

Las empresas acumulan cientos de horas de contenido de formación, webinars y
material educativo en vídeo, pero carecen de un índice semántico que los haga
navegables y consultables por IA. Actualmente, este conocimiento audiovisual
permanece "encerrado" y no accesible para asistentes virtuales o sistemas de IA
corporativos.

### Goal Statement

Proporcionar un servicio "llave en mano" que permita a cualquier empresa
convertir su biblioteca de vídeos en vectores semánticos, eliminando la
complejidad técnica de montar pipelines de Whisper, PySceneDetect, FFmpeg y
Pinecone.

## 2. Goals

1. **Ingesta Simplificada**: Permitir upload de vídeos MP4 mediante API REST con
   interfaz web opcional
2. **Procesamiento Automático**: Transcripción, segmentación de escenas y
   descripción visual sin intervención manual
3. **Vector Store Listo**: Generar embeddings multimodales indexados en Pinecone
   con metadatos completos
4. **Integración RAG**: Proporcionar endpoints y documentación para que las
   empresas integren los vectores en sus sistemas de IA
5. **Notificaciones Confiables**: Sistema de webhooks y polling para monitorear
   el progreso del procesamiento
6. **Adopción Empresarial**: Lograr que empresas del sector learning y formación
   adopten la plataforma en los primeros 3 meses

## 3. User Stories

### Historia Principal

**Como** responsable de formación en una empresa  
**Quiero** subir nuestros vídeos de capacitación a Eidetik  
**Para que** nuestro chatbot corporativo pueda responder preguntas basándose en
el contenido audiovisual de los cursos

### Historias Secundarias

**Como** desarrollador de sistemas de IA  
**Quiero** recibir los vectores procesados y sus metadatos via API  
**Para que** pueda integrarlos en nuestro sistema RAG existente

**Como** administrador de contenido  
**Quiero** ser notificado cuando el procesamiento de un vídeo esté completo  
**Para que** pueda informar a mi equipo que el conocimiento ya está disponible
para consulta

**Como** usuario de prueba  
**Quiero** una interfaz web simple para subir vídeos  
**Para que** pueda probar la funcionalidad sin implementar código

## 4. Functional Requirements

### FR1: Ingesta de Vídeos

1.1. El sistema DEBE aceptar archivos MP4 via endpoint POST `/api/resources`  
1.2. El sistema DEBE validar formato MIME y tamaño máximo (2 horas de vídeo)  
1.3. El sistema DEBE proporcionar una interfaz web con drag & drop para upload
manual  
1.4. El sistema DEBE retornar un ID único del recurso inmediatamente después del
upload

### FR2: Procesamiento Automático

2.1. El sistema DEBE transcribir el audio usando Whisper con timestamps
precisos  
2.2. El sistema DEBE detectar escenas y cambios significativos usando
PySceneDetect  
2.3. El sistema DEBE extraer fotogramas representativos en momentos clave  
2.4. El sistema DEBE generar descripciones visuales usando GPT-4o Vision  
2.5. El sistema DEBE segmentar el contenido en chunks de 30-60 segundos máximo

### FR3: Generación de Vectores

3.1. El sistema DEBE combinar transcripción y descripción visual en texto
unificado  
3.2. El sistema DEBE generar embeddings usando text-embedding-ada-002  
3.3. El sistema DEBE indexar vectores en Pinecone con metadatos (resourceId,
start, end, type)  
3.4. El sistema DEBE mantener relación entre vector y archivo original

### FR4: API de Consulta y Estado

4.1. El sistema DEBE proporcionar endpoint GET `/api/resources/{id}` para
consultar estado  
4.2. El sistema DEBE proporcionar endpoint GET `/api/resources/{id}/logs` para
ver progreso detallado  
4.3. El sistema DEBE retornar información de los vectores generados y su
ubicación en Pinecone  
4.4. El sistema DEBE permitir DELETE `/api/resources/{id}` para eliminar recurso
y vectores

### FR5: Notificaciones y Monitoreo

5.1. El sistema DEBE actualizar estado en tiempo real (pending → processing →
completed/failed)  
5.2. El sistema DEBE enviar webhooks cuando cambie el estado del procesamiento  
5.3. El sistema DEBE registrar logs detallados de cada paso del pipeline  
5.4. El sistema DEBE implementar sistema de reintentos con backoff exponencial
(máximo 3 intentos)

### FR6: Autenticación Básica

6.1. El sistema DEBE requerir API key para acceder a todos los endpoints  
6.2. El sistema DEBE validar permisos básicos por API key

## 5. Non-Goals (Out of Scope)

- ❌ **Autenticación avanzada**: Sin roles, usuarios múltiples o OAuth para el
  MVP
- ❌ **Analytics y dashboard**: Sin métricas de uso o reportes para el MVP
- ❌ **Vídeos largos**: Sin soporte para contenido > 2 horas en el MVP
- ❌ **Procesamiento en tiempo real**: Solo procesamiento batch asíncrono
- ❌ **Chatbot integrado**: Sin interfaz de prueba conversacional en el MVP
- ❌ **Soporte multiidioma**: Solo español e inglés para transcripción
- ❌ **Edición de contenido**: Sin capacidad de modificar transcripciones o
  descripciones
- ❌ **Otros formatos**: Sin PDF, audio o PPT en el MVP (roadmap futuro)

## 6. Design Considerations

### Interfaz Web Mínima

- Página única con drag & drop para subir vídeos
- Formulario simple: archivo + título + descripción opcional
- Lista de recursos subidos con estado actual
- Sin necesidad de registro de usuarios (uso de API key temporal para pruebas)

### API Design Principles

- RESTful endpoints siguiendo convenciones estándar
- Respuestas JSON consistentes con códigos de estado HTTP apropiados
- Documentación OpenAPI/Swagger automática
- Rate limiting básico para prevenir abuso

### Vector Store Structure

```json
{
  "id": "chunk_uuid",
  "values": [0.1, 0.2, ...], // embedding vector
  "metadata": {
    "resourceId": "res_123",
    "start": 60,
    "end": 90,
    "type": "video",
    "transcript": "texto transcrito...",
    "description": "descripción visual...",
    "filename": "video_original.mp4"
  }
}
```

## 7. Technical Considerations

### Stack Tecnológico Confirmado

- **API/CMS**: Payload CMS + Node.js + MongoDB
- **Storage**: AWS S3 para vídeos y fotogramas
- **Queue**: Agenda (MongoDB) para MVP, migrable a Redis/BullMQ
- **Workers**: Node.js con librerías Python (Whisper, PySceneDetect)
- **Vector Store**: Pinecone
- **Deploy**: Render con Web Service + Background Workers

### Dependencies & Integrations

- OpenAI API para Whisper y GPT-4o Vision
- Pinecone SDK para vector operations
- FFmpeg para manipulación de vídeo
- PySceneDetect vía Python subprocess
- AWS SDK para S3 operations

### Performance Considerations

- Procesamiento asíncrono obligatorio (no bloquear API)
- Paralelización de chunks para acelerar embedding generation
- Cleanup automático de archivos temporales
- Rate limiting en OpenAI API calls

## 8. Success Metrics

### Métrica Principal: Adopción

- **Target**: 5 empresas activamente usando la plataforma en 3 meses
- **Medición**: Empresas que han subido >10 vídeos y están consultando vectores

### Métricas Secundarias

- **Calidad de Transcripción**: >95% precisión en audio claro español/inglés
- **Tiempo de Procesamiento**: Máximo 2x la duración del vídeo (ej: 10 min vídeo
  = 20 min procesamiento)
- **Disponibilidad del Servicio**: >99% uptime
- **Adopción API**: >80% de usuarios usando endpoints de consulta
  post-procesamiento

### Criterios de Validación

- Usuario puede subir vídeo y recibir vectores utilizables en <24 horas
- Vectores generados permiten búsquedas semánticas relevantes en sistema RAG
- Documentación suficiente para integración sin soporte adicional

## 9. Open Questions

1. **Pricing Model**: ¿Cómo cobraremos? ¿Por minuto de vídeo procesado? ¿Por
   número de vectores generados?

2. **Retention Policy**: ¿Cuánto tiempo mantenemos los archivos originales en
   S3? ¿Y los vectores en Pinecone?

3. **Multi-tenant**: ¿Cada cliente tendrá su propio namespace en Pinecone o
   compartirán índice con filtros?

4. **Error Recovery**: ¿Cómo manejaremos vídeos con audio de mala calidad o sin
   contenido visual relevante?

5. **Scale Testing**: ¿Cuál es el volumen máximo de vídeos concurrentes que
   debemos soportar para el MVP?

6. **Content Moderation**: ¿Necesitamos validar que el contenido subido es
   apropiado?

---

## Acceptance Criteria Summary

### Criterio de Éxito Principal

Un usuario puede:

1. Subir un vídeo MP4 via API o interfaz web
2. Recibir confirmación con ID de recurso
3. Monitorear progreso via polling o webhook
4. Obtener información de vectores generados en Pinecone
5. Consultar esos vectores desde su sistema RAG
6. Recibir respuestas relevantes basadas en contenido audiovisual

### Criterio de Calidad

- Transcripción comprensible y temporalmente precisa
- Descripciones visuales que aporten contexto significativo
- Vectores que generen resultados relevantes en búsquedas semánticas
- Documentación clara para integración técnica

---

**Fecha de creación**: Enero 2025  
**Versión**: 1.0  
**Próxima revisión**: Post-implementación MVP
