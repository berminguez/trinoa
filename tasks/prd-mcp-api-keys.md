# PRD: Sistema de MCP API Keys

## Introduction/Overview

Eidetik necesita implementar un sistema de API Keys para el protocolo MCP (Model Context Protocol) que permita a los usuarios autenticarse y acceder de forma segura a la información de sus proyectos a través de IAs externas. Actualmente, el MCP accede directamente a Pinecone sin validación, lo que representa un problema de seguridad. Este sistema será el primer paso hacia la arquitectura correcta: MCP → API → Pinecone.

**Problema que resuelve:** Establecer un control de acceso seguro y granular para que las IAs externas puedan acceder únicamente a los proyectos autorizados por cada usuario.

**Goal:** Crear una interfaz de gestión de API Keys que permita a los usuarios crear, visualizar y eliminar credenciales de acceso para el MCP, con control granular sobre qué proyectos pueden acceder las IAs externas.

## Goals

1. Implementar una colección PayloadCMS `McpKeys` para almacenar API Keys de forma segura
2. Crear una página `/mcp-keys` en el frontend para gestión de API Keys
3. Permitir selección granular de proyectos por API Key
4. Garantizar la seguridad en el almacenamiento y visualización de las keys
5. Establecer límites de uso (máximo 10 keys por usuario)
6. Preparar la base para futuros endpoints de autenticación MCP

## User Stories

**Como usuario autenticado de Eidetik:**
- Quiero poder crear API Keys para conectar IAs externas a mis proyectos
- Quiero poder seleccionar qué proyectos específicos puede acceder cada API Key
- Quiero poder ver todas mis API Keys activas con información relevante
- Quiero poder eliminar API Keys que ya no necesite
- Quiero que mis API Keys sean seguras y no se expongan completamente en la interfaz

**Como desarrollador que integra con el MCP:**
- Quiero recibir una API Key con formato estándar (`pcsk_xxxxx`) para autenticarme
- Quiero que la API Key me dé acceso únicamente a los proyectos autorizados

## Functional Requirements

### Backend (PayloadCMS Collection)

1. **Crear colección `McpKeys` con los siguientes campos:**
   - `id`: String (auto-generado)
   - `name`: String (required) - Nombre descriptivo de la key
   - `keyValue`: String (required) - La API Key generada con formato `pcsk_` + 32 caracteres aleatorios
   - `user`: Relationship con Users (required) - Usuario propietario
   - `projects`: Relationship array con Projects (optional) - Proyectos con acceso
   - `hasAllProjects`: Boolean (default: false) - Si tiene acceso a todos los proyectos
   - `createdAt`: Date (auto-generado)
   - `updatedAt`: Date (auto-generado)

2. **Implementar validaciones en la colección:**
   - Un usuario no puede tener más de 10 API Keys activas
   - El campo `name` debe ser único por usuario
   - El campo `keyValue` debe ser único globalmente
   - Validar que `projects` solo contenga proyectos del usuario propietario

3. **Implementar hooks de PayloadCMS:**
   - `beforeChange`: Generar `keyValue` automáticamente en creación
   - `beforeChange`: Hashear la API Key antes de guardarla en base de datos
   - `afterRead`: Mostrar solo los últimos 4 caracteres de la key (excepto recién creada)

### Frontend

4. **Crear página `/mcp-keys` con las siguientes funcionalidades:**
   - Header con título "API Keys" y botón "Create API key"
   - Tabla con columnas: Name, Created on, Created by, Value, Projects, Actions
   - Paginación si hay más de 10 keys

5. **Implementar modal de creación de API Key:**
   - Campo "Name" (text input, required)
   - Checkbox "All projects" 
   - Lista de checkboxes con todos los proyectos del usuario (deshabilitada si "All projects" está marcado)
   - Botones "Cancel" y "Create API key"

6. **Implementar tabla de gestión:**
   - Mostrar API Keys ordenadas por fecha de creación (más recientes primero)
   - En columna "Value": Mostrar key completa solo al crear, después `pcsk_****...****[últimos4]`
   - En columna "Projects": Mostrar "All projects" o lista de nombres de proyectos
   - En columna "Actions": Botón de eliminar con confirmación

7. **Implementar funcionalidad de eliminación:**
   - Modal de confirmación con mensaje "Are you sure you want to delete this API key? This action cannot be undone."
   - Eliminación inmediata sin opción de recuperación

### Security & Performance

8. **Implementar medidas de seguridad:**
   - Hashear API Keys en base de datos usando bcrypt o similar
   - Mostrar key completa solo una vez (al crearla)
   - Validar permisos: usuarios solo pueden gestionar sus propias keys

9. **Optimizar rendimiento:**
   - Cargar proyectos del usuario una sola vez al abrir la página
   - Implementar skeleton loading para la tabla
   - Usar server actions para operaciones CRUD

## Non-Goals (Out of Scope)

- Endpoints de API para autenticación MCP (será una funcionalidad futura)
- Rotación automática de API Keys
- Logs de uso de las API Keys
- Configuración de rate limiting por key
- Expiración automática de keys
- Compartir keys entre usuarios
- Edición de proyectos de keys existentes (solo eliminar y crear nueva)

## Design Considerations

- Seguir el patrón de diseño existente de Eidetik con Shadcn + Tailwind
- Usar iconos de Tabler para acciones (Key, Trash, Plus)
- Implementar skeleton loading coherente con otras páginas
- Mantener responsive design para móviles
- Usar componentes Shadcn: Table, Dialog, Button, Checkbox, Card

## Technical Considerations

- **PayloadCMS Collection**: Implementar en `src/collections/McpKeys.ts`
- **Frontend Components**: Crear en `src/app/(frontend)/(private)/mcp-keys/`
- **Server Actions**: Implementar en `src/actions/mcp-keys/`
- **Tipos**: Actualizar `src/payload-types.ts` automáticamente
- **Validación**: Usar zod para validar formularios
- **Estado**: Usar zustand si es necesario para estado complejo

## Success Metrics

- Usuarios pueden crear hasta 10 API Keys sin errores
- Keys se generan con formato correcto `pcsk_` + 32 caracteres
- Solo se muestra la key completa una vez (al crearla)
- Selección de proyectos funciona correctamente (todos vs específicos)
- Eliminación de keys funciona inmediatamente
- No hay vulnerabilidades de seguridad en el almacenamiento de keys
- La página carga en menos de 2 segundos

## Open Questions

- ¿Necesitamos notificaciones/alertas cuando se crea o elimina una API Key?
- ¿Debemos implementar algún tipo de logging para auditoría futura?
- ¿La página debe tener algún tipo de ayuda/documentación integrada sobre cómo usar las API Keys?
- ¿Necesitamos algún tipo de validación adicional en el nombre de la API Key (caracteres especiales, longitud máxima)? 