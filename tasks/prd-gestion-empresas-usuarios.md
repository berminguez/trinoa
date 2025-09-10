# PRD: Gestión de Empresas y Usuarios

## Introducción/Overview

El sistema actual de usuarios maneja la información de empresa como un campo de texto libre, lo que genera inconsistencias y dificulta la gestión administrativa. Esta funcionalidad implementará una nueva colección de Empresas en PayloadCMS y modificará la estructura de usuarios para incluir referencias a empresas y campos de filial, mejorando la organización y control administrativo.

**Problema que resuelve:** Elimina la inconsistencia en datos de empresa, facilita la gestión administrativa de usuarios por empresa/filial, y mejora el control de acceso a la información empresarial.

**Objetivo:** Crear un sistema estructurado de gestión de empresas y usuarios que permita mejor organización, control administrativo y reportes.

## Goals

1. **Estructurar datos empresariales:** Convertir el campo empresa de texto libre a una relación con colección dedicada
2. **Mejorar control administrativo:** Solo administradores pueden crear empresas y modificar asignaciones de usuarios
3. **Facilitar gestión de usuarios:** Permitir organización por empresa y filial de manera consistente
4. **Mantener autonomía del usuario:** Los usuarios pueden editar su información personal básica pero no sus asignaciones empresariales
5. **Reducir tiempo de gestión:** Simplificar procesos administrativos de asignación y organización de usuarios

## User Stories

### Como Administrador del Sistema:
- **US1:** Como administrador, quiero crear nuevas empresas con nombre y CIF para tener un catálogo estructurado de organizaciones
- **US2:** Como administrador, quiero asignar usuarios a empresas específicas para mantener la organización correcta
- **US3:** Como administrador, quiero modificar la filial de cualquier usuario para reorganizar la estructura interna
- **US4:** Como administrador, quiero ver un selector de empresas al crear/editar usuarios para asignarlos correctamente
- **US5:** Como administrador, quiero que el sistema evite duplicados de empresas para mantener la integridad de datos

### Como Usuario del Sistema:
- **US6:** Como usuario, quiero editar mi nombre en /account para mantener mi información personal actualizada
- **US7:** Como usuario, quiero ver mi empresa y filial asignadas pero no poder modificarlas para mantener la estructura organizacional
- **US8:** Como usuario, quiero que el proceso de edición de perfil sea intuitivo y claro sobre qué puedo y no puedo cambiar

## Functional Requirements

### Colección de Empresas (PayloadCMS)

1. **REQ-EMP-001:** El sistema debe crear una nueva colección "Companies" en PayloadCMS con los siguientes campos:
   - `name`: String requerido para el nombre de la empresa
   - `cif`: String requerido para el CIF de la empresa
   - Campos automáticos: `id`, `createdAt`, `updatedAt`

2. **REQ-EMP-002:** El sistema debe validar que no existan empresas duplicadas por nombre o CIF
3. **REQ-EMP-003:** Solo usuarios con rol "admin" pueden crear, editar o eliminar empresas
4. **REQ-EMP-004:** El campo CIF debe tener validación de formato básica (no vacío, alpanumérico)

### Modificación de Usuarios

5. **REQ-USR-001:** El sistema debe modificar la colección Users para cambiar:
   - Campo `empresa` de String a relación con colección Companies
   - Añadir campo `filial`: String opcional para departamento/filial

6. **REQ-USR-002:** El campo empresa debe ser requerido para todos los usuarios
7. **REQ-USR-003:** El campo filial debe ser opcional y de texto libre
8. **REQ-USR-004:** Los usuarios solo pueden modificar su campo `name`, no empresa ni filial

### Interfaz de Usuario - /account

9. **REQ-ACC-001:** La página /account debe mostrar todos los campos del usuario (nombre, email, empresa, filial, rol)
10. **REQ-ACC-002:** Solo el campo "nombre" debe ser editable para usuarios no-admin
11. **REQ-ACC-003:** Los campos empresa y filial deben mostrarse como información de solo lectura
12. **REQ-ACC-004:** Debe existir indicación visual clara de qué campos son editables y cuáles no

### Interfaz de Usuario - /clients (Administradores)

13. **REQ-CLI-001:** El formulario de creación/edición de usuarios debe incluir selector de empresa
14. **REQ-CLI-002:** El selector de empresa debe mostrar solo el nombre de la empresa
15. **REQ-CLI-003:** El campo filial debe ser un input de texto libre
16. **REQ-CLI-004:** Debe existir funcionalidad para crear nueva empresa desde el formulario de usuario
17. **REQ-CLI-005:** Los administradores pueden modificar todos los campos de cualquier usuario

### Gestión de Empresas

18. **REQ-ADM-001:** Debe existir una sección administrativa para gestionar empresas
19. **REQ-ADM-002:** Los administradores pueden crear empresas con nombre y CIF
20. **REQ-ADM-003:** El sistema debe prevenir la creación de empresas con CIF o nombre duplicado
21. **REQ-ADM-004:** Debe existir validación de campos requeridos en formulario de empresa

## Non-Goals (Out of Scope)

1. **Migración automática de datos existentes:** No se implementará migración automática del campo empresa existente
2. **Gestión de filiales predefinidas:** Las filiales permanecerán como texto libre, no como catálogo
3. **Roles por empresa:** El sistema de roles actual (admin/user) no se modificará ni se vinculará a empresas
4. **Eliminación de empresas:** No se implementará funcionalidad de eliminación de empresas en esta fase
5. **Reportes avanzados:** No se incluyen dashboards o reportes específicos por empresa/filial
6. **Notificaciones:** No se implementarán notificaciones de cambios en asignaciones empresariales

## Design Considerations

### UI/UX Requirements:
- **Selector de empresa:** Dropdown con autocompletado mostrando nombre de empresa
- **Formulario de empresa:** Modal o página dedicada con campos nombre y CIF
- **Página /account:** Diseño claro distinguiendo campos editables de solo lectura
- **Página /clients:** Integrar selector de empresa en formulario existente sin romper flujo actual

### Componentes Shadcn a utilizar:
- `Select` para selector de empresas
- `Input` para campos de texto
- `Button` para acciones de formularios
- `Dialog` para modal de creación de empresa
- `Alert` para mensajes de validación
- `Badge` para mostrar información de solo lectura

## Technical Considerations

### PayloadCMS:
- Crear nueva colección `Companies` con campos apropiados
- Modificar colección `Users` para incluir relación y nuevo campo
- Implementar hooks de validación para prevenir duplicados
- Configurar permisos de acceso por rol

### Frontend (NextJS):
- Actualizar tipos TypeScript con nuevos campos
- Modificar formularios existentes en /account y /clients
- Implementar server actions para gestión de empresas
- Actualizar componentes de usuario para manejar nueva estructura

### Validaciones:
- Validación de duplicados en backend
- Validación de permisos por rol
- Validación de campos requeridos
- Manejo de errores en formularios

## Success Metrics

**Métrica principal:** Reducción del tiempo de gestión de usuarios
- **Baseline:** Tiempo actual promedio para asignar/reorganizar usuarios
- **Target:** Reducción del 50% en tiempo de gestión administrativa
- **Medición:** Tiempo desde búsqueda de usuario hasta completar asignación empresarial

**Métricas secundarias:**
- Reducción de errores en asignación de usuarios (errores de empresa duplicada/inconsistente)
- Satisfacción del administrador en proceso de gestión de usuarios
- Tiempo de adopción de nueva funcionalidad por parte de administradores

## Open Questions

1. **¿Qué hacer con usuarios sin empresa asignada?** ¿Debe existir una empresa "por defecto" o pueden quedar sin asignar temporalmente?

2. **¿Limite de empresas?** ¿Existe algún límite técnico o de negocio en número de empresas que se pueden crear?

3. **¿Eliminación suave de empresas?** ¿Se necesitará en el futuro poder "desactivar" empresas sin eliminarlas?

4. **¿Búsqueda y filtros?** ¿Se necesitará búsqueda de usuarios por empresa/filial en interfaces administrativas?

5. **¿Exportación de datos?** ¿Los administradores necesitarán exportar listas de usuarios por empresa?
