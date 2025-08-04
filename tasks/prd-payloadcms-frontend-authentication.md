# PRD: Sistema de Autenticación Frontend con PayloadCMS

## Introducción/Overview

Implementar un sistema de autenticación completo en el frontend NextJS que utilice la autenticación nativa de PayloadCMS mediante HTTP-only cookies. Esto permitirá que los usuarios (incluidos administradores) puedan acceder tanto al panel de administración de PayloadCMS como a la aplicación frontend con las mismas credenciales, manteniendo una experiencia unificada y segura.

**Problema que resuelve:** Actualmente el frontend no tiene autenticación, permitiendo acceso libre a páginas que deberían ser privadas. Necesitamos proteger el dashboard y futuras páginas, integrando con el sistema de usuarios existente de PayloadCMS.

**Goal:** Crear un sistema de autenticación seguro, seamless y unificado entre PayloadCMS admin y frontend de la aplicación.

## Goals

1. **Seguridad:** Proteger todas las páginas del dashboard y futuras páginas privadas
2. **Experiencia unificada:** Mismo login para admin PayloadCMS y frontend
3. **Usabilidad:** Sesiones que se renuevan automáticamente durante uso activo
4. **Performance:** Estados de carga apropiados y feedback inmediato al usuario
5. **Mantenimiento:** Aprovechar la infraestructura existente de PayloadCMS

## User Stories

**Como administrador del sistema:**
- Quiero poder usar mis credenciales de PayloadCMS para acceder al frontend
- Quiero que mi sesión persista mientras trabajo activamente
- Quiero acceder tanto al admin como al frontend sin múltiples logins

**Como usuario autenticado:**
- Quiero ver mi información personal (nombre, email) en la interfaz
- Quiero poder cerrar sesión de forma segura
- Quiero que se recuerde la página a la que intentaba acceder antes del login

**Como usuario no autenticado:**
- Quiero ser redirigido al login cuando trate de acceder a páginas protegidas
- Quiero recibir feedback claro sobre errores de autenticación
- Quiero ser redirigido automáticamente después de un login exitoso

## Functional Requirements

### 1. Autenticación con PayloadCMS
1.1. El sistema debe utilizar la autenticación nativa de PayloadCMS con HTTP-only cookies
1.2. Debe seguir la documentación oficial: https://payloadcms.com/docs/authentication/overview
1.3. Las sesiones deben durar 1 hora con renovación automática durante actividad
1.4. Debe permitir acceso compartido entre admin PayloadCMS y frontend

### 2. Protección de Páginas
2.1. El dashboard (`/dashboard`) debe estar protegido y requerir autenticación
2.2. Todas las futuras páginas en el área `(frontend)` deben ser protegibles
2.3. Los usuarios no autenticados deben ser redirigidos inmediatamente al login
2.4. Debe implementarse a nivel de middleware o layout para eficiencia

### 3. Formulario de Login
3.1. Debe aceptar email y contraseña como campos de entrada
3.2. Debe realizar validación básica (email válido, campos requeridos)
3.3. Debe mostrar estados de carga durante el proceso de autenticación
3.4. Debe mostrar mensajes de error genéricos de seguridad ("Credenciales inválidas")
3.5. Debe usar componentes Shadcn para consistencia visual

### 4. Redirecciones Inteligentes
4.1. Por defecto, debe redirigir al dashboard después del login exitoso
4.2. Debe soportar parámetro URL `redirect` para redirigir a página específica
4.3. Debe capturar la URL original cuando se redirige desde página protegida
4.4. Debe validar URLs de redirección para prevenir ataques

### 5. Componente NavUser
5.1. Debe mostrar nombre y email del usuario autenticado
5.2. Debe obtener datos del usuario desde PayloadCMS
5.3. Debe incluir skeleton loader mientras carga datos
5.4. Debe mantener la estructura visual actual del componente

### 6. Funcionalidad de Logout
6.1. El botón "Log out" debe cerrar la sesión de PayloadCMS
6.2. Debe limpiar todas las cookies de autenticación
6.3. Debe redirigir al login después del logout
6.4. Debe mostrar estado de carga durante el proceso

### 7. Gestión de Sesiones
7.1. Las sesiones deben renovarse automáticamente cada actividad del usuario
7.2. Debe detectar sesiones expiradas y redirigir al login
7.3. Debe manejar múltiples pestañas/ventanas de forma consistente
7.4. Debe mantener estado de autenticación en tiempo real

### 8. Estados de Carga y Feedback
8.1. Loading spinners en botones durante operaciones
8.2. Skeleton loaders para datos del usuario
8.3. Toast notifications para feedback de acciones
8.4. Estados de error apropiados en formularios

## Non-Goals (Out of Scope)

- **Registro de nuevos usuarios:** Se usarán solo usuarios existentes en PayloadCMS
- **Recuperación de contraseñas:** Se manejará desde el admin de PayloadCMS
- **Autenticación con terceros:** Solo email/contraseña por ahora
- **Permisos granulares:** Todos los usuarios autenticados tendrán acceso igual
- **Multi-factor authentication:** No se implementará en esta fase
- **Remember me checkbox:** La renovación automática cubre este caso de uso

## Design Considerations

### Componentes a Utilizar
- **Formulario de login:** Shadcn Form, Input, Button components
- **Estados de carga:** Shadcn Skeleton, Loading spinners
- **Feedback:** Shadcn Toast para notificaciones
- **Iconos:** Tabler icons para consistencia

### Layout y Estructura
- Mantener el diseño actual del formulario de login
- Preservar la estructura visual de NavUser
- Usar el sistema de grid responsivo existente
- Aplicar patrones de Tailwind CSS establecidos

### User Experience
- Transiciones suaves entre estados de carga
- Feedback inmediato en interacciones
- Mensajes de error claros pero seguros
- Navegación intuitiva post-autenticación

## Technical Considerations

### Dependencias Requeridas
- Integración con PayloadCMS auth API
- NextJS middleware para protección de rutas
- Zustand store para estado de autenticación (con persist si necesario)
- Server actions para operaciones auth

### Estructura de Archivos Sugerida
```
src/
├── actions/auth/
│   ├── login.ts
│   ├── logout.ts
│   └── getUser.ts
├── middleware.ts (protección de rutas)
├── stores/
│   └── auth-store.ts (si se necesita estado global)
└── components/
    ├── login-form.tsx (actualizar existente)
    └── nav-user.tsx (actualizar existente)
```

### Integración con PayloadCMS
- Usar endpoints de auth de PayloadCMS: `/api/users/login`, `/api/users/logout`, `/api/users/me`
- Aprovechar cookies HTTP-only automáticas de PayloadCMS
- Seguir patrones de error handling de PayloadCMS

### Seguridad
- Validar todas las redirecciones para prevenir open redirects
- Sanitizar inputs del formulario
- Manejar CSP headers apropiadamente
- Logs de seguridad para intentos de acceso

## Success Metrics

1. **Funcionalidad:** 100% de páginas protegidas requieren autenticación
2. **Usabilidad:** Tiempo de login < 2 segundos en condiciones normales
3. **Seguridad:** 0 accesos no autorizados a páginas protegidas
4. **UX:** Feedback visual en < 200ms para todas las interacciones
5. **Integración:** Login único funciona para admin y frontend
6. **Sesiones:** Renovación automática sin interrupciones durante uso activo

## Open Questions

1. **Manejo de roles:** ¿Necesitaremos restringir acceso basado en roles de PayloadCMS en el futuro?
2. **Analytics:** ¿Debemos trackear eventos de login/logout para analytics?
3. **Rate limiting:** ¿Implementar límites de intentos de login?
4. **Logging:** ¿Qué nivel de logging necesitamos para auditoría de seguridad?
5. **Error monitoring:** ¿Integrar con servicio de monitoring para errores de auth?
6. **Cache:** ¿Cómo manejar cache de datos de usuario en múltiples componentes?

---

**Prioridad:** Alta
**Estimación:** 2-3 sprints para implementación completa
**Dependencias:** PayloadCMS funcionando correctamente, Shadcn components instalados 