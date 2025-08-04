# PRD: Selectores de Contexto para Playground Chat

## Introducción/Overview

Esta funcionalidad mejorará la experiencia del usuario en el playground de chat al permitir la selección específica de proyectos y videos sobre los cuales la IA debe enfocar su búsqueda y respuestas. Los usuarios podrán contextualizar sus consultas seleccionando el alcance de información relevante, mejorando la precisión y relevancia de las respuestas de la IA.

**Problema que resuelve:** Actualmente, cuando un usuario hace preguntas en el playground, la IA no tiene contexto específico sobre qué proyectos o videos son relevantes para la consulta, lo que puede resultar en respuestas menos precisas o búsquedas en contenido no relacionado.

**Goal:** Implementar selectores de contexto que permitan al usuario especificar el alcance de proyectos y videos para cada conversación, mejorando la precisión de las respuestas de la IA.

## Goals

1. **Mejorar la precisión de respuestas**: La IA tendrá contexto específico sobre qué contenido es relevante para cada consulta
2. **Facilitar la navegación de contenido**: Los usuarios podrán filtrar y seleccionar fácilmente entre sus proyectos y videos
3. **Mantener el estado de selección**: Las preferencias de contexto se preservarán entre sesiones para mejorar la UX
4. **Proporcionar feedback visual**: El usuario siempre sabrá qué contexto está activo en su conversación
5. **Escalabilidad**: El sistema debe funcionar eficientemente independientemente del número de proyectos/videos del usuario

## User Stories

**Como usuario con múltiples proyectos:**
- Quiero seleccionar un proyecto específico para que la IA solo busque información en ese proyecto
- Quiero poder cambiar entre "todos los proyectos" y un proyecto específico fácilmente
- Quiero que mis selecciones se mantengan cuando vuelvo al playground

**Como usuario con muchos videos:**
- Quiero seleccionar videos específicos dentro de un proyecto para enfocar la búsqueda
- Quiero poder marcar/desmarcar todos los videos de una vez
- Quiero que los videos se filtren automáticamente cuando cambio de proyecto

**Como usuario nuevo sin contenido:**
- Quiero recibir orientación clara sobre cómo crear proyectos para usar esta funcionalidad
- Quiero un acceso directo para crear mi primer proyecto

**Como usuario activo del chat:**
- Quiero saber qué contexto está activo en cada conversación
- Quiero cambiar el contexto sin perder mi conversación actual

## Functional Requirements

### FR1: Selector de Proyectos
1.1. El sistema debe mostrar un dropdown/select con las opciones:
   - "Todos los proyectos" (opción por defecto)
   - Lista de proyectos del usuario (nombre del proyecto)

1.2. El selector debe ubicarse encima de la lista de conversaciones anteriores, justo encima del botón "Nueva conversación"

1.3. Al cambiar la selección de proyecto, el sistema debe:
   - Resetear la selección de videos a "Todos los videos"
   - Actualizar la lista de videos disponibles en el segundo selector
   - Guardar la selección en localStorage

### FR2: Selector de Videos
2.1. El sistema debe mostrar un dropdown con checkboxes múltiples que incluya:
   - "Todos los videos" (opción por defecto)
   - Lista de videos filtrados según el proyecto seleccionado

2.2. El dropdown debe mostrar el nombre de cada video con su checkbox correspondiente

2.3. Debe incluir botones de "Marcar todos" y "Desmarcar todos" en la parte superior del dropdown

2.4. Al seleccionar videos específicos, "Todos los videos" debe desmarcarse automáticamente

2.5. Al marcar "Todos los videos", todos los checkboxes individuales deben desmarcarse

### FR3: Filtrado Dinámico de Videos
3.1. Cuando se selecciona "Todos los proyectos":
   - Mostrar todos los videos de todos los proyectos del usuario
   - Agrupar visualmente por proyecto si es necesario

3.2. Cuando se selecciona un proyecto específico:
   - Mostrar solo los videos que pertenecen a ese proyecto
   - Resetear cualquier selección previa de videos

### FR4: Contexto para la IA
4.1. El sistema debe enviar con cada consulta:
   - IDs de los proyectos seleccionados
   - Nombres de los proyectos seleccionados  
   - IDs de los videos seleccionados
   - Nombres de los videos seleccionados

4.2. La información debe enviarse como metadatos en cada mensaje al endpoint de chat

4.3. El sistema debe incluir el contexto en el prompt del sistema para la IA

### FR5: Indicadores Visuales
5.1. Mostrar texto sutil en el área de input del chat indicando el contexto activo:
   - "Buscando en: Todos los proyectos"
   - "Buscando en: [Nombre del Proyecto]"
   - "Buscando en: [Nombre del Proyecto] - [X videos seleccionados]"

5.2. El texto debe ser discreto pero visible para el usuario

### FR6: Persistencia de Estado
6.1. Guardar en localStorage:
   - Último proyecto seleccionado
   - Últimos videos seleccionados (si aplica)

6.2. Restaurar las selecciones al cargar el playground

6.3. Validar que los proyectos/videos guardados aún existen antes de restaurar

### FR7: Estado Sin Contenido
7.1. Cuando el usuario no tiene proyectos:
   - Mostrar mensaje informativo: "No tienes proyectos creados"
   - Deshabilitar ambos selectores
   - Mostrar botón/enlace "Crear tu primer proyecto" que redirija a "/projects"

7.2. Cuando un proyecto no tiene videos:
   - Mostrar "No hay videos en este proyecto" en el selector de videos
   - Deshabilitar el selector de videos

### FR8: Manejo de Contenido Eliminado
8.1. Si un proyecto seleccionado es eliminado:
   - Mantener en la selección pero marcar como "No disponible"
   - Mostrar indicador visual de que el proyecto ya no existe
   - Permitir al usuario cambiar la selección

8.2. Si un video seleccionado es eliminado:
   - Mantener en la lista pero marcar como "No disponible"
   - No incluir en el contexto enviado a la IA
   - Mostrar indicador visual en el dropdown

## Non-Goals (Out of Scope)

- **Selección de recursos específicos dentro de videos** (frames, segmentos de tiempo)
- **Filtros avanzados** (por fecha, duración, tags)
- **Previsualización de contenido** en los selectores
- **Búsqueda/filtro por texto** dentro de las listas de proyectos/videos
- **Organización jerárquica** de proyectos (carpetas, categorías)
- **Selección múltiple de proyectos** (solo un proyecto a la vez o todos)
- **Configuración de contexto por conversación** (el contexto se aplica globalmente)

## Design Considerations

### Ubicación y Layout
- Los selectores se ubicarán en la barra lateral izquierda, encima de la lista de conversaciones
- Diseño responsive que se adapte a dispositivos móviles
- Usar componentes de Shadcn/UI para consistencia visual

### Componentes UI
- **Selector de proyectos**: Select component de Shadcn
- **Selector de videos**: Dropdown con checkboxes usando Checkbox y Command components
- **Indicador de contexto**: Texto sutil usando muted text styles de Tailwind
- **Estados vacíos**: Card component con Call-to-Action usando Button

### Interacciones
- Transiciones suaves al cambiar selecciones
- Loading states mientras se cargan proyectos/videos
- Debounce en búsquedas si se implementa filtrado futuro

## Technical Considerations

### Frontend (NextJS + Shadcn)
- Integrar con el store de Zustand existente para manejar estado global
- Usar React Query/SWR para cache de proyectos y videos
- Implementar localStorage con Zustand persist middleware

### Backend Integration
- Modificar el endpoint `/api/chat/route.ts` para recibir contexto adicional
- Asegurar que los IDs de proyecto/video se validen antes de usar
- Integrar con el sistema de autenticación existente

### Performance
- Lazy loading de videos cuando el proyecto tiene muchos videos
- Virtualización si la lista de videos es muy larga (>100 items)
- Cache inteligente de selecciones del usuario

### Security
- Validar que el usuario tiene permisos para acceder a los proyectos/videos seleccionados
- Sanitizar IDs antes de enviar al backend
- Rate limiting en las consultas de contexto

## Success Metrics

1. **Precisión de respuestas mejorada**: Medición cualitativa de relevancia de respuestas con contexto vs sin contexto
2. **Adopción de la funcionalidad**: % de usuarios que utilizan los selectores (target: >60%)
3. **Retención de configuración**: % de usuarios que mantienen selecciones personalizadas (target: >40%)
4. **Reducción de consultas irrelevantes**: Disminución en consultas que requieren clarificación de contexto
5. **Tiempo de respuesta**: Mantener tiempo de respuesta <3s incluso con contexto adicional

## Open Questions

1. **Límite de performance**: ¿A partir de cuántos videos necesitamos implementar virtualización?
2. **Granularidad de contexto**: ¿Deberíamos permitir seleccionar segmentos específicos de videos en el futuro?
3. **Sincronización**: ¿Cómo manejar cambios de contexto cuando el usuario tiene múltiples pestañas abiertas?
4. **Analytics**: ¿Qué métricas específicas queremos trackear sobre el uso de contexto?
5. **Escalabilidad**: ¿Cómo optimizar la carga de metadatos cuando un usuario tiene cientos de proyectos?

## Implementation Priority

### Fase 1 (MVP):
- Selectores básicos de proyecto y video
- Persistencia en localStorage
- Indicador visual de contexto
- Estado sin contenido

### Fase 2 (Enhancements):
- Botones marcar/desmarcar todos
- Manejo de contenido eliminado
- Optimizaciones de performance

### Fase 3 (Future):
- Búsqueda dentro de selectores
- Filtros avanzados
- Analytics detallados 