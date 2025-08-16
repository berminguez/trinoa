# PRD: Sistema de Administración de Clientes

## 1. Introducción/Overview

### Problema
Actualmente, la plataforma permite que los usuarios gestionen únicamente sus propios proyectos y recursos a través de rutas como `/projects/{idproject}` y `/projects/{idproject}/resource/{idresource}`. Los administradores no tienen una forma de visualizar, gestionar o crear proyectos para otros usuarios (clientes) de la plataforma.

### Solución
Implementar un sistema de administración que permita a usuarios con rol `admin` acceder a rutas especiales donde puedan visualizar todos los usuarios de la plataforma como "clientes", navegar por sus proyectos, y realizar todas las acciones de gestión (crear, editar, eliminar, subir recursos) en nombre de cualquier cliente.

### Meta Principal
Proporcionar a los administradores herramientas completas para gestionar proyectos y recursos de todos los usuarios de la plataforma a través de rutas administrativas dedicadas.

## 2. Goals

1. **Visibilidad Total**: Los administradores pueden ver todos los usuarios de la plataforma y sus proyectos
2. **Gestión Completa**: Los administradores pueden realizar todas las acciones (CRUD) en proyectos y recursos de cualquier cliente
3. **Separación de Contextos**: Las rutas administrativas están separadas de las rutas personales del administrador
4. **Experiencia Familiar**: Las interfaces administrativas replican la experiencia actual de gestión de proyectos
5. **Control de Acceso**: Solo usuarios con rol `admin` pueden acceder a estas funcionalidades

## 3. User Stories

### Historia Principal: Administrador gestiona clientes
**Como** administrador de la plataforma  
**Quiero** poder ver todos los usuarios registrados y gestionar sus proyectos  
**Para** brindar soporte técnico, supervisar contenido y ayudar a los clientes con sus recursos

### Historia 1: Visualizar lista de clientes
**Como** administrador  
**Quiero** acceder a `/clients` y ver una lista de todos los usuarios  
**Para** poder seleccionar a qué cliente quiero brindar soporte

### Historia 2: Gestionar proyectos de un cliente específico
**Como** administrador  
**Quiero** acceder a `/clients/{idclient}/projects` y ver todos los proyectos de ese cliente  
**Para** poder revisar, editar o crear nuevos proyectos en su nombre

### Historia 3: Gestionar recursos de un proyecto cliente
**Como** administrador  
**Quiero** acceder a `/clients/{idclient}/projects/{idproject}` y `/clients/{idclient}/projects/{idproject}/resource/{idresource}`  
**Para** poder gestionar completamente los recursos del cliente como si fuera mi propio proyecto

### Historia 4: Alternar entre contextos
**Como** administrador que también usa la plataforma personalmente  
**Quiero** poder acceder fácilmente a mis propios proyectos en `/projects` y a la administración en `/clients`  
**Para** separar claramente mi trabajo personal del administrativo

### Historia 5: Feedback visual de modo administrador
**Como** administrador  
**Quiero** ver un icono que indique que tengo permisos administrativos  
**Para** estar consciente de mis capacidades especiales en la plataforma

## 4. Functional Requirements

### 4.1 Sistema de Autorización
1. **FR-001**: El sistema DEBE verificar que el usuario tenga rol `admin` antes de permitir acceso a cualquier ruta `/clients/*`
2. **FR-002**: El sistema DEBE redirigir a usuarios no-admin que intenten acceder a rutas administrativas
3. **FR-003**: El sistema DEBE mostrar un icono de administrador en el UserMenu para usuarios con rol `admin`

### 4.2 Página de Lista de Clientes (`/clients`)
4. **FR-004**: El sistema DEBE mostrar una lista paginada de todos los usuarios de la plataforma
5. **FR-005**: Cada cliente DEBE mostrar: nombre, email, fecha de registro, número de proyectos
6. **FR-006**: El sistema DEBE incluir funcionalidad de búsqueda por nombre o email de cliente
7. **FR-007**: El sistema DEBE incluir filtros por fecha de registro y estado de cuenta
8. **FR-008**: El sistema DEBE incluir ordenamiento por nombre, fecha de registro, y número de proyectos
9. **FR-009**: El sistema DEBE implementar paginación para manejar grandes cantidades de usuarios
10. **FR-010**: Cada fila de cliente DEBE ser clickeable y navegar a `/clients/{idclient}/projects`

### 4.3 Página de Proyectos de Cliente (`/clients/{idclient}/projects`)
11. **FR-011**: El sistema DEBE replicar exactamente la funcionalidad de `/projects` pero para el cliente específico
12. **FR-012**: El sistema DEBE mostrar un breadcrumb indicando: Clients > [Nombre del Cliente] > Projects
13. **FR-013**: El administrador DEBE poder crear nuevos proyectos para el cliente
14. **FR-014**: El sistema DEBE incluir las mismas funcionalidades de búsqueda, filtros y ordenamiento que `/projects`
15. **FR-015**: El sistema DEBE mostrar información del cliente en el header de la página

### 4.4 Página de Detalle de Proyecto Cliente (`/clients/{idclient}/projects/{idproject}`)
16. **FR-016**: El sistema DEBE replicar exactamente la funcionalidad de `/projects/{idproject}` pero para el proyecto del cliente
17. **FR-017**: El administrador DEBE poder subir, editar y eliminar recursos del proyecto
18. **FR-018**: El sistema DEBE mostrar un breadcrumb completo: Clients > [Cliente] > Projects > [Proyecto]
19. **FR-019**: El sistema DEBE permitir editar metadatos del proyecto (título, descripción)

### 4.5 Página de Recurso Cliente (`/clients/{idclient}/projects/{idproject}/resource/{idresource}`)
20. **FR-020**: El sistema DEBE replicar exactamente la funcionalidad de `/projects/{idproject}/resource/{idresource}`
21. **FR-021**: El administrador DEBE poder realizar todas las acciones disponibles en recursos
22. **FR-022**: El sistema DEBE mostrar breadcrumb completo incluyendo el nombre del recurso

### 4.6 Navegación y UX
23. **FR-023**: El menú principal DEBE incluir un enlace "Clients" visible solo para administradores
24. **FR-024**: El UserMenu DEBE mostrar un icono indicando permisos de administrador
25. **FR-025**: Todas las páginas administrativas DEBEN incluir navegación clara entre contextos
26. **FR-026**: El sistema DEBE mantener el mismo diseño y componentes que las páginas regulares

### 4.7 Reutilización de Componentes
27. **FR-027**: El sistema DEBE reutilizar componentes existentes (ProjectsGrid, ProjectGridItem, etc.)
28. **FR-028**: Los componentes DEBEN ser adaptados para funcionar tanto en contexto personal como administrativo
29. **FR-029**: Los server actions existentes DEBEN ser extendidos para soportar contexto administrativo

## 5. Non-Goals (Out of Scope)

1. **NG-001**: No se implementarán diferentes niveles de administrador (todos los admin tienen los mismos permisos)
2. **NG-002**: No se modificará el sistema de roles existente en PayloadCMS
3. **NG-003**: No se crearán nuevas colecciones en PayloadCMS para esta funcionalidad
4. **NG-004**: No se implementará un sistema de auditoría o logs de acciones administrativas
5. **NG-005**: No se incluirán funcionalidades de gestión de usuarios (activar/desactivar cuentas)
6. **NG-006**: No se implementará notificación a clientes cuando un admin accede a sus proyectos
7. **NG-007**: No se creará una interfaz administrativa separada (se integra en la interfaz existente)

## 6. Design Considerations

### 6.1 Consistencia Visual
- Utilizar los mismos componentes Shadcn existentes
- Mantener el mismo sistema de iconos de Tabler
- Aplicar la misma paleta de colores y espaciado (Tailwind)
- Usar las mismas cards, grids y layouts responsive

### 6.2 Navegación Intuitiva
- Breadcrumbs claros en todas las páginas administrativas
- Enlace "Clients" en el menú principal (solo para admins)
- Icono de admin en UserMenu para feedback visual
- Mantener la misma estructura de navegación que las rutas personales

### 6.3 Componentes Específicos
- Reutilizar `ProjectsGrid`, `ProjectGridItem`, `ProjectDetailContent`
- Crear nuevos componentes: `ClientsGrid`, `ClientGridItem`, `AdminBreadcrumb`
- Adaptar skeletons existentes para las nuevas páginas

## 7. Technical Considerations

### 7.1 Arquitectura de Rutas
```
/clients                           -> Lista de todos los usuarios
/clients/{idclient}               -> Redirigir a /clients/{idclient}/projects
/clients/{idclient}/projects      -> Proyectos del cliente
/clients/{idclient}/projects/{idproject} -> Detalle del proyecto
/clients/{idclient}/projects/{idproject}/resource/{idresource} -> Recurso específico
```

### 7.2 Modificaciones en Server Actions
- Extender actions existentes en `src/actions/projects/` para soportar contexto administrativo
- Modificar verificaciones de permisos para incluir rol admin
- Crear nuevos actions en `src/actions/clients/` para gestión de usuarios

### 7.3 Componentes a Crear/Modificar
**Nuevos componentes:**
- `src/app/(frontend)/(private)/clients/components/ClientsContent.tsx`
- `src/app/(frontend)/(private)/clients/components/ClientsGrid.tsx`
- `src/app/(frontend)/(private)/clients/components/ClientGridItem.tsx`
- `src/app/(frontend)/(private)/clients/components/ClientsSkeleton.tsx`

**Componentes a adaptar:**
- `ProjectsContent.tsx` -> crear versión para admin context
- `ProjectDetailContent.tsx` -> añadir soporte para client context
- Breadcrumb component -> crear version administrativa

### 7.4 Middleware y Autenticación
- Extender middleware existente para validar rutas `/clients/*`
- Reutilizar sistema de autenticación de PayloadCMS
- Usar verificaciones de rol existentes

### 7.5 Estado y Stores (Zustand)
- Extender stores existentes para manejar contexto administrativo
- Considerar store separado para gestión de clientes si es necesario
- Mantener persistencia local para filtros y preferencias de admin

## 8. Success Metrics

### 8.1 Métricas de Funcionalidad
1. **Acceso Exitoso**: 100% de usuarios admin pueden acceder a todas las rutas administrativas
2. **Operaciones CRUD**: 100% de operaciones funcionan correctamente en contexto administrativo
3. **Rendimiento**: Tiempo de carga de páginas administrativas ≤ tiempo de carga de páginas personales
4. **Compatibilidad**: 0 errores de regresión en funcionalidad existente

### 8.2 Métricas de Usabilidad
1. **Navegación Intuitiva**: Usuarios admin pueden completar tareas de gestión sin consultar documentación
2. **Consistencia Visual**: Interfaz administrativa mantiene 100% consistencia con interfaz personal
3. **Feedback Claro**: Usuarios admin siempre saben en qué contexto están trabajando (personal vs administrativo)

### 8.3 Métricas de Seguridad
1. **Control de Acceso**: 0 accesos no autorizados a rutas administrativas
2. **Verificación de Permisos**: 100% de acciones validan permisos correctamente
3. **Aislamiento**: Las acciones administrativas no afectan la experiencia de usuarios regulares

## 9. Open Questions

1. **Q-001**: ¿Se debe implementar un sistema de notificaciones cuando un admin crea/modifica recursos de un cliente?
   - **Decisión pendiente**: Evaluar en fase de testing

2. **Q-002**: ¿Se necesita un dashboard específico para administradores con estadísticas globales?
   - **Sugerencia**: Considerar para una fase posterior

3. **Q-003**: ¿Los administradores deben poder eliminar usuarios de la plataforma?
   - **Decisión**: No incluir en esta fase (está en Non-Goals)

4. **Q-004**: ¿Se debe implementar búsqueda global que funcione across todos los proyectos y recursos?
   - **Sugerencia**: Evaluar complejidad técnica antes de decidir

5. **Q-005**: ¿Cómo manejar el caso donde un cliente elimina un proyecto mientras un admin lo está editando?
   - **Decisión pendiente**: Implementar manejo de errores estándar por ahora

## 10. Implementation Priority

### Fase 1 (Core Functionality) - ALTA PRIORIDAD
- Sistema de autorización para rutas `/clients/*`
- Página de lista de clientes (`/clients`)
- Navegación básica y breadcrumbs
- Icono de admin en UserMenu

### Fase 2 (Project Management) - ALTA PRIORIDAD  
- Página de proyectos de cliente (`/clients/{idclient}/projects`)
- Adaptación de componentes existentes
- Funcionalidades de búsqueda y filtros

### Fase 3 (Resource Management) - MEDIA PRIORIDAD
- Página de detalle de proyecto (`/clients/{idclient}/projects/{idproject}`)
- Página de recurso (`/clients/{idclient}/projects/{idproject}/resource/{idresource}`)
- Upload y gestión completa de recursos

### Fase 4 (Polish & Testing) - MEDIA PRIORIDAD
- Optimizaciones de rendimiento
- Testing exhaustivo
- Refinamiento de UX

---

**Fecha de creación**: $(date)  
**Versión**: 1.0  
**Estado**: Draft para revisión técnica
