# Patrones de Validación Administrativa

Este documento describe los patrones estándar para implementar validación de permisos de administrador en todas las rutas `/clients/*`.

## Patrones Obligatorios

### 1. Server Components (Páginas)

**Patrón estándar para páginas administrativas:**

```typescript
// src/app/(frontend)/(private)/clients/[ruta]/page.tsx
import { requireAdminAccess } from '@/actions/auth/getUser'

export default async function AdminPage() {
  // ✅ OBLIGATORIO: Validación admin al inicio
  const adminUser = await requireAdminAccess()
  
  // Si llegamos aquí, el usuario es admin autenticado
  return (
    <div>
      {/* Contenido administrativo */}
    </div>
  )
}
```

**Beneficios:**
- ✅ Redirección automática si no es admin
- ✅ Ejecuta en el servidor (más seguro)
- ✅ Retorna objeto User completo para uso en la página

### 2. Server Components con Wrapper

**Para componentes que necesitan estructura más compleja:**

```typescript
import { AdminAccessGuard } from '@/components/admin-access-guard'
import { Suspense } from 'react'

export default async function AdminPage() {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <AdminAccessGuard>
        {(adminUser) => (
          <AdminContent adminUser={adminUser} />
        )}
      </AdminAccessGuard>
    </Suspense>
  )
}
```

**Cuándo usar:**
- Páginas con múltiples componentes
- Necesitas pasar el adminUser a componentes hijos
- Quieres separar la lógica de validación del contenido

### 3. Client Components

**Para componentes que ejecutan en el cliente:**

```typescript
'use client'
import { useAdminAccess } from '@/hooks/useAdminAccess'

function ClientAdminComponent() {
  const { isAdmin, isLoading } = useAdminAccess()
  
  if (isLoading) {
    return <AdminLoadingSpinner />
  }
  
  if (!isAdmin) {
    return <AccessDeniedMessage />
  }
  
  return (
    <div>
      {/* Contenido administrativo */}
    </div>
  )
}
```

**Cuándo usar:**
- Componentes con interactividad compleja
- Estados que requieren hooks del cliente
- Actualizaciones en tiempo real

## Estructura de Archivos Administrativos

```
src/app/(frontend)/(private)/clients/
├── page.tsx                    # Lista de clientes
├── layout.tsx                  # Layout admin (opcional)
├── [idclient]/
│   ├── page.tsx                # Redirección a proyectos  
│   └── projects/
│       ├── page.tsx            # Proyectos del cliente
│       └── [idproject]/
│           ├── page.tsx        # Detalle del proyecto
│           └── resource/
│               └── [idresource]/
│                   └── page.tsx # Recurso específico
└── components/
    ├── ClientsContent.tsx      # Contenido principal
    ├── ClientsGrid.tsx         # Grid de clientes
    ├── ClientGridItem.tsx      # Item individual
    └── ClientsSkeleton.tsx     # Estado de carga
```

## Validaciones por Nivel

### Nivel 1: Middleware (Implementado)
- ✅ Valida rutas `/clients/*` automáticamente
- ✅ Redirige usuarios no autenticados
- ✅ Redirige usuarios no-admin

### Nivel 2: Server Components (Obligatorio)
- ✅ `requireAdminAccess()` en todas las páginas admin
- ✅ Validación robusta con logging
- ✅ Manejo de errores con redirecciones

### Nivel 3: Client Components (Opcional)
- ✅ `useAdminAccess()` para componentes interactivos
- ✅ Estados de loading y error
- ✅ Redirecciones automáticas

## Mensajes de Error Estándar

Los sistemas de redirección usan URLs con parámetros descriptivos:

### Login Requerido
```
/login?reason=admin_auth_required&message=Inicia%20sesión%20para%20acceder%20al%20panel%20de%20administración
```

### Acceso Denegado
```
/dashboard?error=access_denied&message=admin_required&reason=Necesitas%20permisos%20de%20administrador...
```

### Obtener Mensajes en Componentes
```typescript
import { getAdminErrorMessage } from '@/lib/auth'

function ErrorDisplay({ searchParams }) {
  const errorMessage = getAdminErrorMessage(searchParams)
  
  if (errorMessage) {
    return <Alert>{errorMessage}</Alert>
  }
  
  return null
}
```

## Checklist de Implementación

Para cada nueva página administrativa, verificar:

- [ ] ✅ `requireAdminAccess()` llamado al inicio del server component
- [ ] ✅ Manejo de errores implementado (automático con requireAdminAccess)
- [ ] ✅ Logging de acceso configurado (automático)
- [ ] ✅ Redirecciones apropiadas (automático)
- [ ] ✅ Metadatos de página configurados
- [ ] ✅ Estructura de Suspense si es necesario
- [ ] ✅ Tests de acceso para usuarios no-admin

## Seguridad

### Principios Aplicados

1. **Defensa en Profundidad**
   - Middleware → Server Component → Client Component

2. **Redirección Automática**
   - Sin mostrar contenido a usuarios no autorizados
   - Mensajes descriptivos pero seguros

3. **Logging de Seguridad**
   - Intentos de acceso registrados
   - Información para auditoría

4. **Fail-Safe**
   - En caso de error, redirigir a login
   - Nunca mostrar contenido admin sin verificación

### Vulnerabilidades Prevenidas

- ✅ **Bypass de middleware**: Server components validan independientemente
- ✅ **Manipulación de estado**: Server-side validation autoritativa
- ✅ **Race conditions**: Validación síncrona en server
- ✅ **Client-side bypass**: Múltiples capas de validación

## Ejemplos Completos

Ver archivos de referencia:
- `src/components/admin-access-guard.tsx`
- `src/hooks/useAdminAccess.ts`
- `src/app/(frontend)/(private)/clients/page.tsx`
- `src/actions/auth/getUser.ts` (requireAdminAccess)
