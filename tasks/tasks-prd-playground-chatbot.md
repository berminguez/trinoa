# Tareas: Playground - Chatbot de IA con RAG

## Relevant Files

- `src/app/(frontend)/(private)/layout.tsx` - Layout compartido para páginas privadas con navegación y autenticación ✅
- `src/app/(frontend)/(private)/dashboard/layout.tsx` - Layout simplificado del dashboard (duplicación eliminada) ✅
- `src/app/(frontend)/(private)/dashboard/page.tsx` - Página del dashboard actualizada para usar layout compartido ✅
- `src/app/(frontend)/(private)/playground/page.tsx` - Página principal con Suspense wrapper ✅
- `src/app/(frontend)/(private)/playground/components/PlaygroundSkeleton.tsx` - Skeleton de chat con animaciones ✅
- `src/app/(frontend)/(private)/playground/components/PlaygroundContent.tsx` - Interfaz principal de chat ✅
- `src/middleware.ts` - Middleware actualizado para proteger ruta /playground ✅
- `src/app/(frontend)/(private)/playground/components/PlaygroundSkeleton.tsx` - Estado de carga para el playground ✅
- `src/app/(frontend)/(private)/playground/components/ChatInterface.tsx` - Interfaz principal del chat ✅
- `src/app/(frontend)/(private)/playground/components/MessageList.tsx` - Lista de mensajes con scroll ✅
- `src/app/(frontend)/(private)/playground/components/MessageInput.tsx` - Input de usuario con envío ✅
- `src/app/(frontend)/(private)/playground/components/ConfigPanel.tsx` - Panel de configuración opcional
- `src/collections/Conversations.ts` - Colección PayloadCMS para conversaciones ✅
- `src/payload.config.ts` - Configuración actualizada con Conversations y Messages ✅
- `src/payload-types.ts` - Tipos TypeScript regenerados para nuevas colecciones ✅
- `src/collections/Messages.ts` - Colección PayloadCMS para mensajes ✅
- `src/actions/chat/` - Estructura de carpetas para server actions del chat ✅
- `src/actions/chat/index.ts` - Archivo índice para exportaciones centralizadas ✅
- `src/actions/chat/sendMessage.ts` - Server action para manejo de chat con IA
- `src/actions/chat/getConversations.ts` - Server action para obtener conversaciones del usuario
- `src/actions/chat/createConversation.ts` - Server action para crear nueva conversación
- `src/lib/ai/` - Estructura de carpetas para servicios de IA ✅
- `src/lib/ai/index.ts` - Archivo índice para exportaciones de servicios IA ✅
- `src/lib/config.ts` - Configuración actualizada con variables para Chat IA y RAG ✅
- `docs/environment-variables.md` - Documentación completa de variables de entorno ✅
- `src/lib/ai/rag-service.ts` - Servicio para búsqueda RAG con Pinecone y OpenAI
- `src/components/nav-main.tsx` - Navegación actualizada con enlaces funcionales (Link de Next.js) ✅
- `src/components/app-sidebar.tsx` - Sidebar actualizado con enlace al Playground (IconFileAi) ✅

### Notes

- La reestructuración a `(private)` requiere mover archivos existentes del dashboard ✅
- Dashboard movido exitosamente a `src/app/(frontend)/(private)/dashboard/` ✅
- Imports y referencias actualizadas, cache de Next.js limpiado ✅
- ProtectedDashboardLayout integrado en layout compartido, duplicación eliminada ✅
- Navegación actualizada: Dashboard (/dashboard) y Playground (/playground) añadidos ✅
- Rutas privadas verificadas: middleware, compilación exitosa, estructura completa ✅
- Tipos de PayloadCMS regenerados: interfaces Conversation y Message disponibles ✅
- Vercel AI SDK instalado: ai@4.3.19 + @ai-sdk/openai@1.3.23 ✅
- Colección Conversations creada con campos: title, user, isActive, messageCount, lastMessageAt ✅
- Colección Messages creada con campos: conversation, role, content, sources, metadata ✅
- Tipos TypeScript incluyen: Conversation, Message, ConversationsSelect, MessagesSelect ✅
- Estructura de server actions chat creada siguiendo convenciones del proyecto ✅
- Estructura de servicios IA preparada para integrar con infraestructura existente ✅
- Variables de entorno configuradas: OPENAI_API_KEY + configuraciones de chat y RAG ✅
- Página principal playground con interfaz de chat estilo ChatGPT implementada ✅
- Manejo robusto de errores con retry functionality y estados visuales ✅
- Tests unitarios se añadirán según se implementen los componentes

## Tasks

- [x] 1.0 Reestructurar Arquitectura de Páginas Privadas
  - [x] 1.1 Crear nueva estructura de carpetas `app/(frontend)/(private)/`
  - [x] 1.2 Crear layout compartido `app/(frontend)/(private)/layout.tsx` con navegación y autenticación
  - [x] 1.3 Mover dashboard actual de `app/(frontend)/dashboard/` a `app/(frontend)/(private)/dashboard/`
  - [x] 1.4 Actualizar imports y rutas en archivos movidos
  - [x] 1.5 Integrar `ProtectedDashboardLayout` en el nuevo layout de páginas privadas
  - [x] 1.6 Actualizar navegación principal para incluir enlace "Playground"
  - [x] 1.7 Verificar que todas las rutas privadas funcionen correctamente

- [x] 2.0 Configurar Infraestructura y Dependencias
  - [x] 2.1 Instalar Vercel AI SDK (`pnpm add ai @ai-sdk/openai`)
  - [x] 2.2 Crear colección `Conversations` en PayloadCMS con campos necesarios
  - [x] 2.3 Crear colección `Messages` en PayloadCMS con campos necesarios
  - [x] 2.4 Regenerar tipos de PayloadCMS (`pnpm payload generate:types`)
  - [x] 2.5 Crear estructura de carpetas para server actions de chat (`src/actions/chat/`)
  - [x] 2.6 Crear estructura de carpetas para servicios de IA (`src/lib/ai/`)
  - [x] 2.7 Configurar variables de entorno necesarias para Vercel AI SDK

- [ ] 3.0 Implementar Interfaz Básica de Chat
  - [x] 3.1 Crear página principal `/playground` con Suspense wrapper
  - [x] 3.2 Implementar `PlaygroundSkeleton` para estado de carga
  - [x] 3.3 Crear `PlaygroundContent` con lógica principal del chat
  - [x] 3.4 Implementar `ChatInterface` como contenedor principal del chat
  - [x] 3.5 Crear `MessageList` con scroll automático y manejo de mensajes largos
  - [x] 3.6 Implementar `MessageInput` con validación y envío
  - [x] 3.7 Añadir indicador de "typing" cuando la IA está procesando
  - [x] 3.8 Implementar manejo de estados de carga y error en chat
  - [ ] 3.9 Añadir breadcrumbs y navegación en página playground
  - [ ] 3.10 Asegurar diseño responsive (mobile-first) usando Tailwind

- [ ] 4.0 Integrar Sistema RAG con Embeddings
  - [ ] 4.1 Crear servicio `rag-service.ts` para búsqueda en Pinecone
  - [ ] 4.2 Implementar función de búsqueda de documentos relevantes
  - [ ] 4.3 Crear server action `sendMessage` con integración OpenAI + RAG
  - [ ] 4.4 Configurar streaming de respuestas usando Vercel AI SDK
  - [ ] 4.5 Implementar lógica para incluir contexto de documentos en prompt
  - [ ] 4.6 Añadir referencias a fuentes en respuestas cuando sea relevante
  - [ ] 4.7 Implementar fallback para preguntas generales sin RAG
  - [ ] 4.8 Añadir manejo de errores para APIs de OpenAI y Pinecone
  - [ ] 4.9 Optimizar consultas RAG para performance (límites de contexto)

- [ ] 5.0 Implementar Persistencia de Conversaciones
  - [ ] 5.1 Crear server action `createConversation` para nuevas conversaciones
  - [ ] 5.2 Crear server action `getConversations` para listar conversaciones del usuario
  - [ ] 5.3 Crear server action `getConversationMessages` para cargar historial
  - [ ] 5.4 Integrar guardado automático de mensajes en tiempo real
  - [ ] 5.5 Implementar carga de historial al acceder al playground
  - [ ] 5.6 Crear `ConfigPanel` con controles básicos (temperatura, toggle RAG)
  - [ ] 5.7 Añadir selector de conversación (nueva/existente)
  - [ ] 5.8 Implementar paginación para conversaciones largas
  - [ ] 5.9 Añadir funcionalidad para titulado automático de conversaciones
  - [ ] 5.10 Verificar asociación correcta de conversaciones con usuarios autenticados 