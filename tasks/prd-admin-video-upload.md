# PRD: Funcionalidad de Subida de Vídeos en Panel de Administración

## Introducción/Overview

Esta funcionalidad implementa un sistema completo de gestión y subida de vídeos en el panel de administración de Eidetik. El sistema introduce el concepto de "Projects" para organizar vídeos, proporcionando una interfaz intuitiva para crear proyectos, navegar por sus vídeos y subir nuevos contenidos a través de un modal drag-and-drop que se conecta con el endpoint backend existente.

**Problema que resuelve:** Actualmente no existe una forma estructurada de organizar y gestionar vídeos en el admin. Los usuarios necesitan poder agrupar sus vídeos en proyectos temáticos y tener una interfaz moderna para subirlos.

## Goals

1. **Organización de contenido**: Permitir a los usuarios organizar sus vídeos en proyectos temáticos
2. **Experiencia de subida mejorada**: Implementar una interfaz drag-and-drop moderna y responsive
3. **Gestión eficiente**: Proporcionar herramientas de filtrado, búsqueda y organización de contenido
4. **Escalabilidad**: Preparar la base para futuras funcionalidades como límites por plan y teams
5. **Consistencia de diseño**: Mantener coherencia con el design system existente de Eidetik

## User Stories

### Historia Principal
**Como usuario de Eidetik**, quiero poder organizar mis vídeos en proyectos temáticos para mantener mi contenido estructurado y accesible.

### Historias Específicas
1. **Como usuario nuevo**, quiero que se cree automáticamente un proyecto "Default" al registrarme para poder empezar a subir vídeos inmediatamente.

2. **Como usuario existente**, quiero poder crear nuevos proyectos con títulos descriptivos para organizar mi contenido por temas.

3. **Como usuario**, quiero poder subir múltiples vídeos de forma simultánea con una interfaz drag-and-drop intuitiva.

4. **Como usuario**, quiero ver el progreso de subida de cada archivo y poder cancelar subidas si es necesario.

5. **Como usuario**, quiero poder filtrar y buscar mis vídeos dentro de cada proyecto para encontrar contenido específico rápidamente.

6. **Como usuario**, quiero ver información relevante de cada vídeo (duración, fecha de subida, thumbnail) en una tabla organizada.

## Functional Requirements

### R1. Modelo de Datos (PayloadCMS)

**R1.1** Crear nueva collection `projects` con los siguientes campos:
- `title` (texto, requerido, único por usuario)
- `slug` (texto, autogenerado desde title, único globalmente)
- `description` (richText, opcional)
- `createdBy` (relationship → users, auto-populate al crear)
- `createdAt` (date, automático)

**R1.2** Modificar collection `resources/videos` existente:
- Añadir campo `project` (relationship → projects, requerido, hasMany: false)

**R1.3** Implementar reglas de acceso:
- Usuarios solo pueden ver sus propios proyectos y vídeos
- Admin puede ver todos los proyectos y vídeos

**R1.4** Al crear nueva cuenta de usuario:
- Generar automáticamente un proyecto "Default" para el usuario

### R2. API/Backend

**R2.1** Mantener endpoint existente `POST /api/resources/upload`:
- Añadir parámetro opcional `projectId` en el request
- Validar que el proyecto existe y pertenece al usuario autenticado
- Asignar automáticamente la relación project al vídeo creado
- Devolver documento de vídeo completo con relaciones populadas

**R2.2** Validaciones server-side:
- Verificar ownership del proyecto antes de asignar vídeo
- Mantener validaciones existentes de formato, tamaño y duración
- Whitelist MIME types: `video/*`
- Límite máximo de tamaño: 2GB por archivo

### R3. Admin UI - Página Projects (`/projects`)

**R3.1** Grid de tarjetas responsive:
- Tarjeta "Create Project" con borde dashed y ícono plus (tabler)
- Una tarjeta por proyecto existente mostrando:
  - Thumbnail del primer vídeo (o placeholder si está vacío)
  - Título del proyecto
  - Número de vídeos contenidos
  - Fecha de creación

**R3.2** Controles de navegación:
- Dropdown "Sort by" (default: Recent upload)
- Campo de búsqueda/filtro por nombre de proyecto
- Responsive design: 1 columna en móvil, 2-3 en tablet/desktop

### R4. Admin UI - Página Project Detail (`/projects/[id]`)

**R4.1** Header de proyecto:
- Título del proyecto editable inline
- IndexID copiable al clipboard
- Badges de modelos (Pegasus 1.2, Marengo 2.7)

**R4.2** Toolbar de acciones:
- Botón "Upload Videos" (primary)
- Dropdown "Select Action" para acciones en lote
- Toggle grid/list view (default: list)
- Filtro "Filter by video title"
- Dropdown "Sort by" (Recent upload, Name, Duration)

**R4.3** Tabla de vídeos (usando TanStack React Table):
- Columnas: checkbox, thumbnail, filename, duration, uploadedAt
- Paginación: 12 elementos por página
- Responsive: colapsar columnas menos importantes en móvil

### R5. Upload Modal

**R5.1** Interfaz de subida:
- Modal overlay que se abre desde botón "Upload Videos"
- Área drag-and-drop con borde dashed
- Texto: "Drop videos or browse files"
- Botón "Browse" para selección manual
- Información de límites: "4sec-1hr | Resolution 360p-4k | File size ≤2GB per video"
- Subtítulo: "To upload videos up to 2hrs, create an index with Marengo only"

**R5.2** Estados del modal:
- Vacío: Botón "Upload" deshabilitado
- Con archivos: Lista de archivos con opciones de remove individual
- Subiendo: Barras de progreso por archivo + botón "Cancel" por archivo
- Botón "Upload" habilitado solo cuando hay ≥1 archivo válido

**R5.3** Validaciones cliente:
- Verificar formato de archivo (video/*)
- Verificar duración máxima (2 horas)
- Verificar tamaño máximo (2GB)
- Mostrar errores específicos por archivo inválido

### R6. Comportamiento Frontend

**R6.1** Subida de archivos:
- Usar react-dropzone para drag-and-drop
- Subida simultánea con axios + FormData
- Incluir projectId en cada request
- Mostrar progreso individual por archivo
- Permitir cancelación individual de archivos

**R6.2** Manejo de estados:
- Update optimista: añadir vídeo a tabla inmediatamente tras subida exitosa
- Toast success al completar cada subida
- Toast error con mensaje específico si falla
- Mantener archivos fallidos en lista con botón "Retry"

**R6.3** Navegación:
- Añadir nueva sección "Projects" en sidebar del admin
- Breadcrumbs: Admin > Projects > [Project Name]
- Enlaces entre vistas manteniendo contexto

### R7. State Management

**R7.1** Usar Redux Toolkit existente:
- Extender slice `resources` para incluir projects
- Nuevo slice `projects`: list, detailCache, loading flags
- Mantener compatibilidad con state management existente

**R7.2** Optimistic updates:
- Actualizar state local inmediatamente tras acciones exitosas
- Rollback en caso de error con notificación apropiada

### R8. Preparación para Límites por Plan

**R8.1** Estructura de datos preparatoria:
- Campos en user model para límites futuros (sin implementar lógica)
- Hooks/utils preparados para validaciones de límites
- UI preparada para mostrar uso/límites (componentes sin datos)

**R8.2** Puntos de integración identificados:
- Validación antes de crear proyecto
- Validación antes de subir vídeo
- Mostrar progreso de uso en UI

## Non-Goals (Out of Scope)

1. **Sistema de equipos/colaboración**: No se implementará invitación de usuarios o permisos compartidos
2. **Gestión activa de límites**: Se prepara la estructura pero no se implementa la lógica de validación
3. **Edición de vídeos**: Solo subida y organización, no funcionalidades de edición
4. **Analytics de vídeos**: No se incluyen métricas de visualización o engagement
5. **Versionado de vídeos**: No se permite subir múltiples versiones del mismo vídeo
6. **Comentarios o anotaciones**: No se incluye sistema de feedback sobre vídeos
7. **Migración de vídeos existentes**: Se eliminarán los vídeos actuales sin proyecto

## Design Considerations

### Visual Design
- **Components**: Usar exclusivamente Shadcn UI components
- **Icons**: Tabler icons para toda la iconografía
- **Tables**: TanStack React Table para todas las tablas
- **Color scheme**: Mantener tokens de Eidetik (grey-100 bg, rounded-2xl cards)
- **Typography**: font-sans del design system

### UX Patterns
- **Responsive first**: Mobile-first approach con breakpoints de Tailwind
- **Loading states**: Skeleton loaders usando animate-pulse de Tailwind
- **Error handling**: Toast notifications + inline validation feedback
- **Progressive disclosure**: Mostrar información relevante según contexto

### Reference Visual
Seguir exactamente el diseño mostrado en las capturas proporcionadas:
- Grid layout con tarjetas redondeadas
- Modal centrado con drag-and-drop area
- Tabla limpia con alternancia de colores
- Iconografía consistente y spacing uniforme

## Technical Considerations

### Dependencies
- `react-dropzone`: Para funcionalidad drag-and-drop
- `axios`: Para requests de subida con progress tracking
- `@tanstack/react-table`: Para tablas avanzadas
- Shadcn components: Button, Card, Modal, Input, etc.
- Tabler icons: Plus, Upload, Video, etc.

### Performance
- **Lazy loading**: Componentes de páginas con code splitting
- **Image optimization**: Thumbnails optimizados con Next.js Image
- **Request batching**: Agrupar requests relacionados cuando sea posible
- **Caching**: Aprovechar cache de PayloadCMS para listas de proyectos

### Security
- **File validation**: Double validation (client + server)
- **CSRF protection**: Tokens en todos los forms
- **Rate limiting**: Protección contra abuse en endpoints de subida
- **Access control**: Verificación de ownership en cada operación

## Success Metrics

### Métricas Primarias
1. **Adoption rate**: % de usuarios que crean al menos un proyecto en primera semana
2. **Upload success rate**: % de subidas completadas exitosamente vs. iniciadas
3. **User engagement**: Tiempo promedio en páginas de gestión de vídeos

### Métricas Secundarias
1. **Error reduction**: Reducción de tickets de soporte relacionados con subida de vídeos
2. **Performance**: Tiempo promedio de carga de páginas < 2 segundos
3. **User satisfaction**: Net Promoter Score sobre funcionalidad de gestión

### Métricas Técnicas
1. **API response time**: < 500ms para operaciones CRUD de proyectos
2. **Upload throughput**: Capacidad de subidas concurrentes sin degradación
3. **Error rate**: < 1% de errores en operaciones normales

## Open Questions

1. **Migración de usuarios existentes**: ¿Cómo comunicar a usuarios actuales que deben recrear sus vídeos?
2. **Nomenclatura**: ¿"Projects" o "Índices" como término en la UI?
3. **Backup strategy**: ¿Necesitamos backup de vídeos antes de eliminar contenido actual?
4. **Analytics tracking**: ¿Qué eventos específicos queremos trackear para product analytics?
5. **Mobile experience**: ¿Prioridad de funcionalidad completa en mobile o versión simplificada?

## Implementation Notes

### Fases de Desarrollo Sugeridas

**Fase 1**: Backend + Modelos de datos
- Collection projects + modificación resources
- Endpoint upload con projectId
- Creación automática de proyecto default

**Fase 2**: UI Básico
- Página projects con grid básico
- Página project detail con tabla
- Navegación entre vistas

**Fase 3**: Upload Flow
- Modal de subida
- Drag-and-drop functionality
- Progress tracking y error handling

**Fase 4**: Polish + Optimización
- Loading states y skeleton loaders
- Responsive design final
- Performance optimizations

### Testing Strategy

**Unit Tests**:
- PayloadCMS schema validation
- Upload endpoint logic
- React components isolation

**Integration Tests**:
- Upload flow end-to-end
- Project creation + video assignment
- Access control validation

**E2E Tests (Playwright)**:
- User journey: login → create project → upload video → verify in table
- Error scenarios: failed uploads, invalid files
- Responsive behavior across devices 