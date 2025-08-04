# PRD: Playground API Key - Gestión Automática de Autenticación para Chatbot

## Introducción/Overview

Esta funcionalidad añade un campo booleano `playgroundKey` a la colección `api-keys` que permite a los administradores marcar una API key específica como la clave automática que utilizará el chatbot de playground para autenticarse con el sistema MCP. Esta implementación elimina la dependencia del `process.env.TEST_MCP_KEY` y proporciona una gestión más granular y segura de la autenticación del chatbot por usuario.

**Problema que resuelve:** Actualmente el chatbot de playground utiliza una API key global (`TEST_MCP_KEY`) para todas las interacciones MCP, lo que no permite personalización por usuario y presenta limitaciones de seguridad y escalabilidad.

**Objetivo:** Implementar un sistema donde cada usuario tenga su propia API key dedicada para el playground, gestionada automáticamente y invisible en su interfaz normal de API keys.

## Goals

1. **Autenticación personalizada**: Cada usuario tendrá su propia API key para el playground
2. **Gestión invisible**: Los usuarios no verán ni podrán modificar su playground key
3. **Control administrativo**: Solo los admins pueden gestionar las playground keys
4. **Transición automática**: Eliminar la dependencia de `TEST_MCP_KEY`
5. **Seguridad mejorada**: Las playground keys solo tendrán acceso a todos los proyectos del usuario
6. **Experiencia fluida**: Manejo elegante de errores cuando no existe playground key

## User Stories

### Historia 1: Admin gestiona playground keys
**Como** administrador del sistema  
**Quiero** marcar cualquier API key como "playground key" desde el admin de PayloadCMS  
**Para que** el chatbot de playground use automáticamente esa key para las interacciones MCP del usuario propietario

### Historia 2: Usuario usa playground sin configuración
**Como** usuario final  
**Quiero** que el chatbot de playground funcione automáticamente con mi API key asignada  
**Para que** no tenga que configurar manualmente la autenticación del chatbot

### Historia 3: Manejo de errores transparente
**Como** usuario sin playground key asignada  
**Quiero** recibir un mensaje de error claro en el chatbot  
**Para que** entienda que hay un problema de configuración sin exponer detalles técnicos

### Historia 4: Unicidad de playground keys
**Como** administrador  
**Quiero** que solo una API key por usuario pueda ser marcada como playground key  
**Para que** no haya conflictos ni ambigüedad en la autenticación

## Functional Requirements

### RF1: Campo playground key en colección API Keys
- **RF1.1**: Añadir campo booleano `playgroundKey` a la colección `api-keys`
- **RF1.2**: El campo debe tener valor por defecto `false`
- **RF1.3**: El campo debe ser visible solo para administradores en el admin de PayloadCMS
- **RF1.4**: Los usuarios normales no deben ver este campo en ninguna interfaz

### RF2: Unicidad de playground keys por usuario
- **RF2.1**: Solo una API key por usuario puede tener `playgroundKey = true`
- **RF2.2**: Al marcar una key como playground key, desmarcar automáticamente cualquier otra del mismo usuario
- **RF2.3**: Implementar validación en hooks de PayloadCMS para garantizar unicidad

### RF3: Validación de requisitos para playground keys
- **RF3.1**: Una API key solo puede ser marcada como playground key si `hasAllProjects = true`
- **RF3.2**: Mostrar error de validación si se intenta marcar una key sin acceso completo

### RF4: Filtrado en interfaz de usuario
- **RF4.1**: Las API keys marcadas como `playgroundKey = true` NO deben aparecer en la tabla de API keys del usuario
- **RF4.2**: El conteo de API keys del usuario debe excluir las playground keys
- **RF4.3**: Las playground keys no deben ser modificables ni eliminables por usuarios normales

### RF5: Integración con chatbot de playground
- **RF5.1**: El chatbot debe buscar la API key del usuario con `playgroundKey = true`
- **RF5.2**: Si encuentra múltiples (caso edge), usar la primera de la lista
- **RF5.3**: Si no encuentra ninguna, mostrar mensaje de error en el chatbot
- **RF5.4**: Eliminar completamente el uso de `process.env.TEST_MCP_KEY`

### RF6: Manejo de errores
- **RF6.1**: Mostrar mensaje de error cuando no existe playground key: "El chatbot no tiene ninguna API key asignada"
- **RF6.2**: El error debe aparecer como una barra de notificación en la interfaz del chatbot
- **RF6.3**: No incluir call-to-action ni instrucciones adicionales en el mensaje de error

### RF7: Control de acceso
- **RF7.1**: Solo usuarios con rol `admin` pueden modificar el campo `playgroundKey`
- **RF7.2**: Los usuarios propietarios de la API key no pueden ver ni modificar el estado de playground key
- **RF7.3**: Las playground keys siguen las mismas reglas de acceso para lectura que las API keys normales

## Non-Goals (Out of Scope)

1. **No incluir** interfaz para que usuarios gestionen sus playground keys
2. **No implementar** sistema de rotación automática de playground keys
3. **No añadir** notificaciones cuando se asigna/desasigna playground key
4. **No crear** métricas específicas de uso de playground keys
5. **No implementar** migración automática de keys existentes
6. **No añadir** configuración granular de permisos para playground keys más allá de `hasAllProjects`

## Design Considerations

### UI/UX en Admin de PayloadCMS
- Añadir campo checkbox "Playground Key" en la vista de edición de API keys
- El campo debe aparecer en la sidebar con descripción clara
- Usar styling consistente con otros campos administrativos

### UI/UX en Frontend de Usuario
- La tabla de API keys debe funcionar sin cambios aparentes
- El error en playground debe usar el componente de Alert existente de Shadcn
- Mantener diseño responsive en mensaje de error

## Technical Considerations

### PayloadCMS Hooks
- Implementar `beforeValidate` hook para validación de unicidad
- Implementar `beforeChange` hook para desmarcar playground keys existentes
- Usar `afterChange` hook si se necesita logging adicional

### Frontend Integration
- Modificar el hook `usePlaygroundContext` para obtener playground key del usuario
- Actualizar el servicio de autenticación MCP para usar la nueva key
- Añadir validación en el componente de chatbot para manejo de errores

### Database Queries
- Optimizar consultas para filtrar playground keys en listados de usuario
- Añadir índices si es necesario para consultas de playground key por usuario

## Success Metrics

1. **Eliminación completa**: 0 referencias a `TEST_MCP_KEY` en el código de playground
2. **Funcionalidad transparente**: El chatbot funciona igual para usuarios con playground key asignada
3. **Seguridad mejorada**: Cada usuario usa su propia API key para playground
4. **Experiencia de admin**: Los admins pueden gestionar playground keys sin problemas

## Open Questions

1. ¿Se necesita logging específico cuando se cambia el estado de playground key?
2. ¿Hay algún requisito de auditoría para cambios en playground keys?
3. ¿Se debe notificar de alguna forma al usuario cuando su playground key es revocada? 