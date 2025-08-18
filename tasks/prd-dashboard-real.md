# PRD: Dashboard Real de la Aplicación

## Información del Producto
- **Producto**: Trinoa - Dashboard Principal
- **Versión**: 1.0.0
- **Fecha**: Enero 2025
- **Autor**: Claude

## Resumen Ejecutivo

El dashboard actual es una demo con datos estáticos. Necesitamos crear un dashboard real que proporcione diferentes vistas según el rol del usuario (administrador vs usuario normal), con accesos directos, estadísticas en tiempo real y gestión eficiente de proyectos y recursos.

## Problema a Resolver

### Problemas Actuales
1. **Dashboard demo no funcional**: Muestra datos estáticos sin utilidad real
2. **Falta de diferenciación por roles**: No hay vistas específicas para admin vs usuarios
3. **Sin accesos directos**: Los usuarios deben navegar manualmente a sus proyectos
4. **Falta de métricas**: No hay visibilidad del estado global del sistema
5. **Sin gestión centralizada**: Los admins no pueden gestionar eficientemente todos los recursos

### Impacto del Problema
- Baja eficiencia en la gestión de proyectos
- Admins sin visibilidad global del sistema
- Usuarios sin acceso rápido a sus datos más importantes
- Falta de insights sobre el uso y estado del sistema

## Objetivos del Producto

### Objetivos Primarios
1. **Crear dashboard diferenciado por roles** con vistas específicas para admin y usuarios
2. **Implementar accesos directos** a proyectos, recursos y funcionalidades clave
3. **Mostrar estadísticas en tiempo real** del estado de recursos y sistema
4. **Proporcionar gestión centralizada** para administradores
5. **Mejorar la experiencia de usuario** con navegación intuitiva

### Objetivos Secundarios
- Reducir clics necesarios para acceder a funcionalidades comunes
- Aumentar la visibilidad del estado del sistema
- Facilitar la gestión y monitoreo para administradores

## Alcance del Producto

### Incluido en Esta Versión
- Dashboard para usuarios administradores con vista global
- Dashboard para usuarios normales con vista personal
- Métricas en tiempo real de recursos por estado de confianza
- Accesos directos a proyectos recientes y más utilizados
- Vista de usuarios/clientes para administradores
- Estadísticas de uso y actividad del sistema
- Navegación rápida a funcionalidades clave

### Excluido de Esta Versión
- Dashboard para usuarios API (solo admin y user)
- Configuración personalizable del dashboard
- Exportación de métricas y reportes
- Notificaciones en tiempo real
- Dashboard móvil específico (será responsive)

## Requisitos Funcionales

### RF001: Dashboard de Administrador

#### RF001.1: Vista Global de Recursos
- **Descripción**: Los administradores deben ver estadísticas globales de todos los recursos del sistema
- **Métricas a mostrar**:
  - Total de recursos por estado de confianza (trusted, verified, needs-review)
  - Distribución de recursos por tipo de documento
  - Recursos procesados en las últimas 24h/7d/30d
  - Estado de procesos de análisis en curso

#### RF001.2: Gestión de Usuarios/Clientes
- **Descripción**: Vista de todos los usuarios del sistema con accesos directos
- **Información a mostrar**:
  - Lista de usuarios con roles
  - Cantidad de proyectos por usuario
  - Última actividad
  - Acceso directo a proyectos de cada usuario

#### RF001.3: Vista de Proyectos Globales
- **Descripción**: Acceso a todos los proyectos del sistema
- **Funcionalidades**:
  - Lista de proyectos más recientes
  - Proyectos con más actividad
  - Búsqueda rápida de proyectos
  - Acceso directo a gestión de recursos

#### RF001.4: Métricas del Sistema
- **Descripción**: Estadísticas operativas del sistema
- **Métricas incluidas**:
  - Uso de storage
  - Procesos fallidos/exitosos
  - Performance de análisis de documentos
  - Crecimiento de usuarios y proyectos

### RF002: Dashboard de Usuario Normal

#### RF002.1: Vista Personal de Proyectos
- **Descripción**: Los usuarios ven solo sus propios proyectos y recursos
- **Información a mostrar**:
  - Proyectos recientes del usuario
  - Total de recursos del usuario por estado
  - Proyectos más utilizados
  - Accesos directos a subir nuevos documentos

#### RF002.2: Estado de Recursos Personales
- **Descripción**: Métricas específicas de los recursos del usuario
- **Métricas incluidas**:
  - Recursos trusted vs pending review
  - Progreso de análisis en curso
  - Recursos subidos recientemente
  - Alertas de recursos que necesitan atención

#### RF002.3: Accesos Directos Personalizados
- **Descripción**: Enlaces rápidos a funcionalidades más usadas
- **Accesos incluidos**:
  - Subir nuevo documento
  - Proyecto por defecto
  - Playground/Chat
  - Gestión de API Keys

### RF003: Componentes Comunes

#### RF003.1: Navegación Contextual
- **Descripción**: Breadcrumbs y navegación adaptada al rol
- **Comportamiento**:
  - Breadcrumbs dinámicos según la página actual
  - Menú lateral con opciones específicas por rol
  - Búsqueda global (admin) vs búsqueda personal (user)

#### RF003.2: Métricas en Tiempo Real
- **Descripción**: Actualización automática de estadísticas
- **Implementación**:
  - Refresh automático cada 30 segundos
  - Indicadores de última actualización
  - Skeleton loaders durante carga

## Requisitos Técnicos

### RT001: Arquitectura y Rendimiento
- **Framework**: Next.js con Server Components y Server Actions
- **UI**: Shadcn/ui components con Tailwind CSS
- **Iconografía**: Tabler Icons exclusivamente
- **Estado**: Zustand con persist para preferencias de usuario

### RT002: Estructura de Componentes
```
/dashboard/
├── page.tsx (Wrapper con Suspense)
├── components/
│   ├── DashboardContent.tsx (Lógica principal con rol detection)
│   ├── DashboardSkeleton.tsx (Loading state)
│   ├── admin/
│   │   ├── AdminDashboard.tsx
│   │   ├── GlobalMetrics.tsx
│   │   ├── UsersOverview.tsx
│   │   └── SystemStats.tsx
│   └── user/
│       ├── UserDashboard.tsx
│       ├── PersonalProjects.tsx
│       ├── ResourcesOverview.tsx
│       └── QuickActions.tsx
```

### RT003: Server Actions Requeridos
- `getDashboardMetrics()` - Métricas específicas por rol
- `getRecentProjects()` - Proyectos recientes del usuario/global
- `getResourceStats()` - Estadísticas de recursos
- `getUsersOverview()` - Vista de usuarios (solo admin)

### RT004: Tipos y Validación
```typescript
interface DashboardMetrics {
  resources: {
    total: number
    trusted: number
    verified: number
    needsReview: number
    processing: number
  }
  projects: {
    total: number
    recent: Project[]
    mostActive: Project[]
  }
  users?: { // Solo para admin
    total: number
    active: number
    recentActivity: UserActivity[]
  }
}
```

## Criterios de Aceptación

### CA001: Dashboard de Administrador
- [ ] Al acceder como admin, se muestra vista global con métricas de todos los recursos
- [ ] Se pueden ver estadísticas de todos los usuarios del sistema
- [ ] Hay accesos directos a gestión de cualquier proyecto
- [ ] Las métricas se actualizan en tiempo real
- [ ] Se puede navegar directamente a recursos de cualquier usuario

### CA002: Dashboard de Usuario
- [ ] Al acceder como user, se muestran solo datos propios
- [ ] Se ven proyectos personales con accesos directos
- [ ] Hay estadísticas de recursos propios por estado de confianza
- [ ] Se incluyen accesos directos a funciones más usadas
- [ ] No se pueden ver datos de otros usuarios

### CA003: Experiencia de Usuario
- [ ] Carga inicial en menos de 2 segundos
- [ ] Responsive design funcional en móvil, tablet y desktop
- [ ] Skeleton loading durante cargas
- [ ] Navegación intuitiva con breadcrumbs
- [ ] Iconografía consistente usando Tabler Icons

### CA004: Seguridad y Accesos
- [ ] Verificación de roles en server-side
- [ ] Usuarios no pueden acceder a datos de otros usuarios
- [ ] Redirect a /login si no está autenticado
- [ ] Server Actions con validación de permisos

## Mockups y Diseño

### Dashboard de Administrador
```
┌─────────────────────────────────────────────────┐
│ [📊] Dashboard Admin                            │
├─────────────────────────────────────────────────┤
│                                                 │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐│
│ │ 1,234   │ │ 856     │ │ 245     │ │ 133     ││
│ │Resources│ │Trusted  │ │Verified │ │Pending  ││
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘│
│                                                 │
│ ┌─────────────────────┐ ┌─────────────────────┐│
│ │ Usuarios Activos    │ │ Proyectos Recientes ││
│ │ 👤 Ana (5 proyects) │ │ 📁 Análisis Facturas││
│ │ 👤 Juan (3 projects)│ │ 📁 Documentos Legal ││
│ │ 👤 María (8 project)│ │ 📁 Contratos 2024   ││
│ └─────────────────────┘ └─────────────────────┘│
│                                                 │
│ ┌─────────────────────────────────────────────┐│
│ │ Actividad del Sistema (Gráfico)            ││
│ │ [Gráfico de líneas con procesos/día]       ││
│ └─────────────────────────────────────────────┘│
└─────────────────────────────────────────────────┘
```

### Dashboard de Usuario
```
┌─────────────────────────────────────────────────┐
│ [👤] Mi Dashboard                               │
├─────────────────────────────────────────────────┤
│                                                 │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐│
│ │ 45      │ │ 32      │ │ 8       │ │ 5       ││
│ │Recursos │ │Trusted  │ │Verified │ │Pending  ││
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘│
│                                                 │
│ ┌─────────────────────┐ ┌─────────────────────┐│
│ │ Mis Proyectos       │ │ Acciones Rápidas    ││
│ │ 📁 Default (25 doc) │ │ ⬆️ Subir Documento   ││
│ │ 📁 Facturas (15 doc)│ │ 💬 Ir a Playground   ││
│ │ 📁 Contratos (5 doc)│ │ 🔑 Gestionar APIs    ││
│ └─────────────────────┘ └─────────────────────┘│
│                                                 │
│ ┌─────────────────────────────────────────────┐│
│ │ Actividad Reciente                          ││
│ │ • Documento procesado - Hace 2h             ││
│ │ • Nuevo recurso trusted - Hace 5h           ││
│ │ • Upload completado - Ayer                  ││
│ └─────────────────────────────────────────────┘│
└─────────────────────────────────────────────────┘
```

## Implementación

### Fase 1: Estructura Base (Sprint 1)
1. Crear estructura de componentes según arquitectura
2. Implementar detección de roles y routing
3. Crear skeleton components
4. Server actions básicos para métricas

### Fase 2: Dashboard Admin (Sprint 2)
1. Métricas globales de recursos
2. Vista de usuarios del sistema
3. Gestión de proyectos globales
4. Estadísticas del sistema

### Fase 3: Dashboard Usuario (Sprint 3)
1. Vista personal de proyectos
2. Métricas de recursos propios
3. Accesos directos personalizados
4. Actividad reciente

### Fase 4: Optimización (Sprint 4)
1. Actualizaciones en tiempo real
2. Performance optimization
3. Testing exhaustivo
4. Responsive design refinement

## Métricas de Éxito

### Métricas de Usabilidad
- **Tiempo de acceso a proyecto**: Reducir de 4+ clics a 1-2 clics
- **Tiempo de carga inicial**: < 2 segundos
- **Satisfacción del usuario**: Feedback positivo en pruebas

### Métricas de Adopción
- **Uso del dashboard**: 90%+ de usuarios acceden al dashboard diariamente
- **Funciones más usadas**: Identificar accesos directos más utilizados
- **Reducción de support**: Menos consultas sobre "cómo acceder a X"

### Métricas Técnicas
- **Performance**: Core Web Vitals en verde
- **Error rate**: < 1% de errores en carga
- **Disponibilidad**: 99.9% uptime

## Anexos

### A1: Estados de Recursos
- **trusted**: Recurso verificado y confiable
- **verified**: Recurso revisado y aprobado
- **needs-review**: Requiere revisión manual
- **processing**: En proceso de análisis
- **failed**: Proceso fallido, requiere atención

### A2: Roles del Sistema
- **admin**: Acceso completo, vista global
- **user**: Acceso a datos propios únicamente
- **api**: Similar a user, para acceso programático

### A3: Consideraciones de Seguridad
- Todas las métricas filtradas server-side según rol
- Server Actions con validación de permisos
- No exposición de datos sensibles en client-side
- Auditoría de accesos en logs del sistema
