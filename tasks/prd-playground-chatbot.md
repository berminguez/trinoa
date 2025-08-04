# PRD: Playground - Chatbot de IA con RAG

## Introducción/Overview

El **Playground** es una nueva página de la aplicación que proporcionará a los usuarios un chatbot inteligente basado en IA para interactuar con documentos y recursos previamente subidos a la plataforma. Esta funcionalidad implementará un sistema RAG (Retrieval Augmented Generation) que permitirá a los usuarios hacer preguntas tanto generales como específicas sobre el contenido de sus recursos, utilizando los embeddings ya procesados por el sistema.

**Problema que resuelve:** Los usuarios necesitan una forma intuitiva de explorar y extraer información de sus documentos y videos subidos, sin tener que revisar manualmente todo el contenido.

**Meta principal:** Crear una interfaz de chat moderna y eficiente que combine la potencia de GPT-4 con el conocimiento específico de los recursos del usuario.

## Goals

1. **Implementar chat RAG funcional:** Permitir consultas inteligentes sobre documentos/videos subidos usando embeddings existentes
2. **Reestructurar arquitectura de páginas privadas:** Crear estructura `(private)` para páginas protegidas compartiendo layout y lógica de autenticación
3. **Interfaz de usuario intuitiva:** Diseño minimalista inspirado en ChatGPT con excelente UX/UI
4. **Historial persistente:** Guardar y recuperar conversaciones previas del usuario
5. **Integración seamless:** Aprovechar toda la infraestructura existente (auth, PayloadCMS, OpenAI, embeddings)

## User Stories

### Historia Principal
**Como usuario autenticado, quiero acceder a un playground de chat donde pueda hacer preguntas sobre mis documentos subidos y recibir respuestas contextualizadas basadas en el contenido real de esos recursos.**

### Historias Específicas

1. **US-1: Navegación al Playground**
   - Como usuario del dashboard, quiero navegar fácilmente al playground desde la navegación principal
   - Criterio de aceptación: Enlace visible en sidebar/nav que lleve a `/playground`

2. **US-2: Chat Básico**
   - Como usuario, quiero escribir mensajes en un chat y recibir respuestas de la IA
   - Criterio de aceptación: Input de texto, botón enviar, área de mensajes con historial en tiempo real

3. **US-3: RAG con Documentos**
   - Como usuario, quiero hacer preguntas como "¿Qué dice el documento X sobre Y?" y recibir respuestas basadas en el contenido real
   - Criterio de aceptación: La IA debe buscar en embeddings y referenciar documentos específicos

4. **US-4: Preguntas Generales**
   - Como usuario, quiero también hacer preguntas generales que no requieran contexto de documentos
   - Criterio de aceptación: La IA responde preguntas generales sin necesidad de RAG

5. **US-5: Historial de Conversaciones**
   - Como usuario, quiero que mis conversaciones se guarden y pueda acceder a ellas más tarde
   - Criterio de aceptación: Conversaciones persistentes asociadas a mi cuenta

6. **US-6: Experimentación con Configuración**
   - Como usuario, quiero poder ajustar parámetros básicos del chat (como creatividad/precisión)
   - Criterio de aceptación: Controles básicos para temperatura u otros parámetros

## Functional Requirements

### RF-1: Reestructuración de Arquitectura
1.1. Crear nueva estructura de carpetas `app/(frontend)/(private)/` para páginas protegidas
1.2. Mover dashboard actual a `app/(frontend)/(private)/dashboard/`
1.3. Crear layout compartido en `app/(frontend)/(private)/layout.tsx` con navegación y lógica de autenticación
1.4. Integrar `ProtectedDashboardLayout` en el nuevo layout de páginas privadas

### RF-2: Página Playground Base
2.1. Crear ruta `/playground` dentro de la estructura privada
2.2. Implementar página con Suspense y skeleton loading
2.3. Diseño minimalista con área de chat centrada
2.4. Responsivo (mobile-first con Tailwind)

### RF-3: Interfaz de Chat
3.1. Input de texto para mensajes del usuario con botón de envío
3.2. Área de mensajes scrolleable mostrando conversación
3.3. Indicador de "typing" cuando la IA está procesando
3.4. Manejo de estados de carga y error
3.5. Auto-scroll a mensaje más reciente
3.6. Soporte para mensajes largos con scroll interno

### RF-4: Integración con Vercel AI SDK
4.1. Configurar Vercel AI SDK con OpenAI GPT-4
4.2. Implementar server action para manejo de chat
4.3. Streaming de respuestas para UX fluida
4.4. Manejo de errores de API y límites de rate

### RF-5: Sistema RAG
5.1. Integrar con sistema de embeddings existente (Pinecone)
5.2. Buscar documentos relevantes antes de generar respuesta
5.3. Incluir contexto de documentos en prompt de GPT-4
5.4. Referenciar fuentes en las respuestas cuando sea relevante

### RF-6: Persistencia de Conversaciones
6.1. Crear nueva colección `conversations` en PayloadCMS
6.2. Crear nueva colección `messages` en PayloadCMS  
6.3. Asociar conversaciones al usuario autenticado
6.4. Guardar mensajes en tiempo real
6.5. Cargar historial al acceder al playground

### RF-7: Navegación y UX
7.1. Añadir enlace "Playground" a navegación principal
7.2. Breadcrumbs en página de playground
7.3. Mantener consistencia visual con resto de la aplicación (Shadcn + Tailwind)

### RF-8: Configuración Básica
8.1. Panel/modal simple para ajustar temperatura del modelo
8.2. Toggle para habilitar/deshabilitar RAG
8.3. Selector de conversación (nueva/existente)

## Non-Goals (Fuera del Scope)

- **Múltiples modelos de IA:** Solo GPT-4 en esta iteración
- **Subida de archivos desde chat:** Usar solo recursos ya existentes
- **Compartir conversaciones:** Funcionalidad para futuras iteraciones
- **Exportar conversaciones:** No prioritario para MVP
- **Chat en tiempo real entre usuarios:** Solo chat usuario-IA
- **Integración con workers de video:** Usar solo embeddings ya procesados
- **Personalización avanzada de UI:** Mantener diseño estándar de la app
- **APIs públicas:** Todo privado, requiere autenticación

## Design Considerations

### UI/UX
- **Framework:** Shadcn components + Tailwind CSS 4
- **Iconos:** Tabler icons exclusivamente  
- **Layout:** Inspirado en ChatGPT - área de chat centrada, input en la parte inferior
- **Responsive:** Mobile-first approach
- **Loading states:** Skeleton components consistentes con el resto de la app
- **Tema:** Coherente con active-theme.tsx existente

### Componentes Clave
- `PlaygroundPage` - Página principal con Suspense
- `PlaygroundContent` - Lógica principal del chat
- `ChatInterface` - Componente de interfaz de chat
- `MessageList` - Lista de mensajes con scroll
- `MessageInput` - Input de usuario con envío
- `ConfigPanel` - Panel de configuración opcional
- `PlaygroundSkeleton` - Estado de carga

## Technical Considerations

### Stack Tecnológico
- **Frontend:** Next.js 14+ (App Router), Shadcn, Tailwind 4
- **Backend:** PayloadCMS 3, Server Actions
- **IA:** Vercel AI SDK + OpenAI GPT-4
- **Vector Search:** Pinecone (infraestructura existente)
- **Estado:** Zustand para estado local del chat si es necesario
- **Tipado:** TypeScript estricto con tipos de payload-types.ts

### Integraciones Requeridas
- **Autenticación:** Reutilizar sistema existente (`getUser`, `useAuthStore`)
- **Embeddings:** Integrar con `lib/embeddings/` y `lib/pinecone.ts`
- **OpenAI:** Utilizar configuración existente en `lib/openai.ts`

### Nuevas Colecciones PayloadCMS
```typescript
// Conversaciones
interface Conversation {
  id: string
  title: string
  user: string | User
  createdAt: Date
  updatedAt: Date
}

// Mensajes
interface Message {
  id: string
  conversation: string | Conversation  
  role: 'user' | 'assistant'
  content: string
  sources?: string[] // Referencias a documentos RAG
  createdAt: Date
}
```

### Server Actions
- `createConversation` - Crear nueva conversación
- `sendMessage` - Enviar mensaje y obtener respuesta IA
- `getConversations` - Obtener conversaciones del usuario
- `getConversationMessages` - Obtener mensajes de conversación específica

### Consideraciones de Performance
- Streaming de respuestas para UX fluida
- Pagination de mensajes para conversaciones largas
- Cache de búsquedas RAG frecuentes
- Lazy loading de conversaciones históricas

## Success Metrics

### Métricas Técnicas
- **Tiempo de respuesta:** < 3 segundos para respuestas RAG
- **Uptime:** 99.9% disponibilidad de la funcionalidad
- **Latencia de streaming:** Primeras palabras en < 1 segundo

### Métricas de Usuario
- **Adopción:** 80% de usuarios activos usan el playground al menos una vez
- **Retención:** 50% de usuarios regresan al playground en 7 días
- **Engagement:** Promedio de 5+ mensajes por sesión de chat
- **Satisfacción:** Feedback positivo en respuestas RAG relevantes

### Métricas de Negocio
- **Reducción de tiempo:** 50% menos tiempo buscando información en documentos manualmente
- **Precisión RAG:** 85% de respuestas con referencias correctas a documentos
- **Error rate:** < 5% de errores en interacciones de chat

## Open Questions

### Preguntas Técnicas
1. **Límites de contexto:** ¿Cuántos documentos máximo incluir en contexto RAG por consulta?
2. **Caching strategy:** ¿Implementar cache de embeddings frecuentes o usar siempre búsqueda en tiempo real?
3. **Rate limiting:** ¿Límites por usuario para prevenir abuse del modelo GPT-4?
4. **Fallback behavior:** ¿Qué hacer si Pinecone/OpenAI están temporalmente no disponibles?

### Preguntas de Producto
1. **Pricing:** ¿Considerar límites de mensajes por usuario/plan?
2. **Analytics:** ¿Trackear qué tipos de preguntas son más comunes para mejoras futuras?
3. **Feedback loop:** ¿Permitir a usuarios marcar respuestas como útiles/no útiles?
4. **Multi-idioma:** ¿Soporte para idiomas además del español?

### Preguntas de UX
1. **Onboarding:** ¿Tutorial inicial para enseñar capacidades RAG?
2. **Empty states:** ¿Mostrar ejemplos de preguntas cuando no hay conversación activa?
3. **Search within chat:** ¿Funcionalidad para buscar en historial de mensajes?

---

**Nota para el desarrollador:** Este PRD debe implementarse en fases. Comenzar con la reestructuración de carpetas y chat básico, luego agregar funcionalidad RAG y finalmente historial persistente. 