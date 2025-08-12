## Relevant Files

- `src/app/(frontend)/(private)/projects/[id]/resource/[resourceId]/page.tsx` - Wrapper con Suspense y carga inicial.
- `src/app/(frontend)/(private)/projects/[id]/resource/[resourceId]/components/PageContent.tsx` - Lógica principal de datos, permisos y renderizado.
- `src/app/(frontend)/(private)/projects/[id]/resource/[resourceId]/components/PageSkeleton.tsx` - Skeleton de carga.
- `src/app/(frontend)/(private)/projects/[id]/resource/[resourceId]/components/PDFViewer.tsx` - Visor de PDF con zoom/paginación/descarga.
- `src/app/(frontend)/(private)/projects/[id]/resource/[resourceId]/components/ImageViewer.tsx` - Visor de imágenes con zoom/fit/descarga.
- `src/app/(frontend)/(private)/projects/[id]/resource/[resourceId]/components/ResizableSplit.tsx` - Contenedor de pantalla partida redimensionable.
- `src/app/(frontend)/(private)/projects/[id]/resource/[resourceId]/components/ResourceForm.tsx` - Formulario Formik + Yup con componentes Shadcn (globales + campos por caso).
- `src/actions/resources/updateResource.ts` - Server action para persistir los cambios y `revalidatePath`.
- `src/stores/visualizador-store.ts` - Estado temporal (cambios sin guardar, configuración del split, navegación).
- `src/collections/Resources.ts` - Añadido campo `lastUpdatedBy` (auditoría) y definiciones de campos globales/casos.
- `src/payload-types.ts` - Tipos de Payload utilizados en tipado estricto.
- `src/lib/utils/` (o `src/lib/`) - Utilidades para detección de tipo de archivo y helpers de validación.
- `src/lib/utils/fileUtils.test.ts` - Tests unitarios para `getSafeMediaUrl` y `getFileKind`.
- `tests/e2e/frontend.e2e.spec.ts` - Pruebas E2E (ampliaciones específicas del flujo del visualizador).

### Notes

- Usar los tipos de `src/payload-types.ts`; no crear duplicados de colecciones.
- Instalar dependencias necesarias: `pnpm add formik yup react-pdf pdfjs-dist react-resizable-panels @tabler/icons-react`.
- Mantener el patrón de 3 niveles (Suspense + Skeleton + Content) y las verificaciones de seguridad obligatorias.
- Por decisión del usuario, la sub‑tarea 7.2 se omite en esta iteración.

## Tasks

- [ ] 1.0 Configuración y dependencias del feature
  - [x] 1.1 Crear estructura de rutas: `src/app/(frontend)/(private)/projects/[id]/resource/[resourceId]/` con `page.tsx` y `components/`.
  - [x] 1.2 Instalar dependencias: `pnpm add formik yup react-pdf pdfjs-dist react-resizable-panels @tabler/icons-react`.
  - [x] 1.3 Verificar `src/payload-types.ts` actualizado; si es necesario, regenerar tipos.
  - [x] 1.4 Añadir util para obtener URL segura del archivo de `Resource.file`.
  - [x] 1.5 Configurar worker de `react-pdf` en el componente PDF o util común.

- [ ] 2.0 Seguridad, datos y server actions
  - [x] 2.1 Implementar `src/actions/resources/updateResource.ts` (Server Action): `getUser`, validación de asiento, verificación de pertenencia `Resource -> Project` y cuenta.
  - [x] 2.2 Actualizar campos: `nombre_cliente`, `nombre_documento`, `caso`, `tipo` y campos dinámicos del caso. Devolver `{ success, data | error }`.
  - [x] 2.3 Registrar `lastUpdatedBy` con el `user.id` y `updatedAt` (si `lastUpdatedBy` no existe, añadirlo en colección y tipos).
  - [x] 2.4 `revalidatePath('/projects/{idProject}/resource/{idResource}')` tras éxito; loguear errores en el logger de seguridad.
  - [x] 2.5 Función de carga de datos en `PageContent`: traer `Project` y `Resource` con `depth: 2` y abortar con redirect/notFound/403 según corresponda.

- [ ] 3.0 Estructura de página (patrón de 3 niveles) y layout de pantalla partida
  - [x] 3.1 `page.tsx`: Suspense con `PageSkeleton` y render de `PageContent`.
  - [ ] 3.2 `components/PageSkeleton.tsx`: replicar layout con visor y formulario placeholders.
  - [x] 3.2 `components/PageSkeleton.tsx`: replicar layout con visor y formulario placeholders.
  - [ ] 3.3 `components/PageContent.tsx`: server component que prepara datos/props para componentes cliente.
  - [x] 3.3 `components/PageContent.tsx`: server component que prepara datos/props para componentes cliente.
  - [ ] 3.4 `components/ResizableSplit.tsx`: pantalla partida 50/50 inicial, redimensionable (react-resizable-panels), responsive.
  - [x] 3.4 `components/ResizableSplit.tsx`: pantalla partida 50/50 inicial, redimensionable (react-resizable-panels), responsive.
  - [ ] 3.5 Cabecera sticky con breadcrumbs, título, botón Guardar y controles de navegación.
  - [x] 3.5 Cabecera sticky con breadcrumbs, título, botón Guardar y controles de navegación.

- [ ] 4.0 Componentes de visor (PDF/imagen) y detección de tipo de archivo
  - [ ] 4.1 `PDFViewer.tsx`: usar `react-pdf` con paginación, zoom y descarga; estados de carga/error; control de tamaño.
  - [x] 4.1 `PDFViewer.tsx`: usar `react-pdf` con paginación, zoom y descarga; estados de carga/error; control de tamaño.
  - [ ] 4.2 `ImageViewer.tsx`: usar `next/image` con zoom/fit y descarga; estados de carga/error.
  - [x] 4.2 `ImageViewer.tsx`: usar `next/image` con zoom/fit y descarga; estados de carga/error.
  - [ ] 4.3 Utilidad `getFileKind(url|mime)` para decidir PDF vs imagen y fallback de no soportado.
  - [x] 4.3 Utilidad `getFileKind(url|mime)` para decidir PDF vs imagen y fallback de no soportado.

- [ ] 5.0 Formulario (Formik + Yup + Shadcn) para globales y campos dinámicos por caso
  - [ ] 5.1 `ResourceForm.tsx` como client component con Formik; valores iniciales desde `Resource`.
  - [x] 5.1 `ResourceForm.tsx` como client component con Formik; valores iniciales desde `Resource`.
  - [ ] 5.2 Campos globales: `nombre_cliente`, `nombre_documento`, `caso`, `tipo` (select/inputs Shadcn).
  - [x] 5.2 Campos globales: `nombre_cliente`, `nombre_documento`, `caso`, `tipo` (select/inputs Shadcn).
  - [ ] 5.3 Render dinámico de campos por `caso` mapeando la estructura existente en `Resources` (texto, textarea, número, fecha, select, multiselect, checkbox, toggle, archivo, lista, relación).
  - [x] 5.3 Render dinámico de campos por `caso` mapeando la estructura existente en `Resources` (versión inicial placeholder; ampliación posterior).
  - [ ] 5.4 Validación mínima con Yup (placeholder) preparada para extender.
  - [x] 5.4 Validación mínima con Yup (placeholder) preparada para extender.
  - [ ] 5.5 Cambio de `caso`: ocultar campos no aplicables sin borrar valores; refrescar UI.
  - [x] 5.5 Cambio de `caso`: ocultar campos no aplicables sin borrar valores; refrescar UI.
  - [ ] 5.6 Submit: llamar a `updateResource` y mostrar toasts de éxito/error; deshabilitar Guardar mientras guarda.
  - [x] 5.6 Submit: llamar a `updateResource` y mostrar toasts de éxito/error; deshabilitar Guardar mientras guarda.

- [ ] 6.0 Navegación anterior/siguiente, toasts, confirmación de salida y estado con Zustand
  - [ ] 6.1 `src/stores/visualizador-store.ts`: flags de cambios sin guardar, tamaño del split y estado de navegación.
  - [x] 6.1 `src/stores/visualizador-store.ts`: flags de cambios sin guardar, tamaño del split y estado de navegación.
  - [ ] 6.2 Botones Anterior/Siguiente: resolver ids por orden (por defecto `createdAt`) y navegar dentro del proyecto.
  - [x] 6.2 Botones Anterior/Siguiente: resolver ids por orden (por defecto `createdAt`) y navegar dentro del proyecto.
  - [ ] 6.3 Confirmación al salir si hay cambios sin guardar (beforeunload + intercept de rutas del router).
  - [x] 6.3 Confirmación al salir si hay cambios sin guardar (beforeunload + intercept de rutas del router).
  - [ ] 6.4 Integrar toasts usando `components/ui/sonner.tsx`.
  - [x] 6.4 Integrar toasts usando `components/ui/sonner.tsx`.

- [ ] 7.0 Pruebas (unitarias, integración y E2E) y logging de seguridad
  - [x] 7.1 Unit: util de tipo de archivo y helpers de form (Yup mappers).
  - [ ] 7.2 Integración: `updateResource` (validaciones, pertenencia y auditoría `lastUpdatedBy`).
  - [ ] 7.3 E2E: flujo básico — ver visor, editar globales, cambiar caso, guardar y ver toast; bloqueo por cambios sin guardar.
  - [ ] 7.4 Revisar linter y tipos; asegurar tipado estricto con `src/payload-types.ts`.

- [ ] 8.0 Documentación breve de uso y revisión final
  - [x] 8.1 Añadir README corto de la ruta y componentes (instalación deps, how-to).
  - [x] 8.2 Revisar accesibilidad básica y responsive; checklist de PR.



