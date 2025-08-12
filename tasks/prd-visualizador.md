## PRD — Visualizador de Recurso de Proyecto

Ruta objetivo: `/projects/{idProject}/resource/{idResource}`

### 1. Introducción / Overview
Crear una página con pantalla partida donde:
- A la izquierda se visualiza el documento del recurso (PDF o imagen) con controles básicos (paginación, zoom y descarga).
- A la derecha se muestra un formulario de edición que incluye campos globales del recurso y el grupo de campos específico del "caso" seleccionado.

Al guardar, se deben persistir los campos globales y los campos del caso en el `Resource`, además de registrar quién realizó la última actualización. Debe permitir navegar al recurso anterior/siguiente dentro del proyecto.

### 2. Objetivos
- Visualizar correctamente PDFs e imágenes asociados al `Resource.file`.
- Editar y persistir: `nombre_cliente`, `nombre_documento`, `caso`, `tipo` y el grupo dinámico de campos del caso.
- Registrar el usuario que actualiza (auditoría básica).
- UI de pantalla partida con divisor redimensionable (50/50 por defecto), cabecera sticky y botón único de Guardar.
- Confirmar salida con cambios sin guardar.
- Cumplir con autenticación, verificación de asiento y pertenencia del recurso al proyecto.

### 3. User Stories
- Como usuario autenticado, quiero ver el documento del recurso a la izquierda y su formulario a la derecha para editarlo con contexto visual.
- Como operador, quiero cambiar el `caso` y ver automáticamente los campos específicos correspondientes.
- Como usuario, quiero guardar mis cambios y que se registre que fui yo quien realizó la actualización.
- Como usuario, quiero navegar al recurso anterior/siguiente del proyecto para revisar varios documentos rápidamente.
- Como usuario, si intento salir con cambios sin guardar, quiero una confirmación para no perder mi trabajo.

### 4. Requisitos Funcionales
1) Carga y permisos
   - RF-1.1: Requiere autenticación con flujo estándar (`getUser`) y verificación de asiento de cuenta.
   - RF-1.2: Validar que el `Resource` pertenece al `Project` (`idProject`) y a la cuenta del usuario; en caso contrario, redirigir o devolver 403.
   - RF-1.3: Cargar `Resource` con `depth: 2` para obtener relaciones necesarias.

2) Visor de documento (panel izquierdo)
   - RF-2.1: Si el `Resource.file` es PDF → renderizar con paginación, zoom y botón de descarga.
   - RF-2.2: Si es imagen → mostrar con zoom/fit y descarga.
   - RF-2.3: Manejar estados: cargando, error y archivo ausente/no soportado.

3) Formulario (panel derecho)
   - RF-3.1: Campos globales editables con los slugs exactos existentes en `Resources`: `nombre_cliente`, `nombre_documento`, `caso`, `tipo`.
   - RF-3.2: Campos del caso: al seleccionar un `caso`, renderizar su grupo de campos específicos (estructura ya existente en `Resources` por caso).
   - RF-3.3: Tipos de campo soportados para el caso: texto, textarea, número, fecha, select, multiselect, checkbox, toggle, archivo, lista/array, relación.
   - RF-3.4: Por ahora no se aplican validaciones adicionales a los campos del caso (más allá de las que existan en Payload); el formulario usará Formik + Yup preparados para futuras reglas.
   - RF-3.5: Al cambiar `caso`, ocultar los campos que no correspondan al nuevo caso sin resetear sus valores almacenados (persisten en backend, se ocultan en UI).

4) Guardado y auditoría
   - RF-4.1: Guardado manual único mediante botón "Guardar" en cabecera sticky.
   - RF-4.2: Al guardar, actualizar en el `Resource` todos los campos editados, tanto globales como del caso activo.
   - RF-4.3: Registrar el usuario que realizó la actualización (p. ej., `lastUpdatedBy: relation(User)` o registro equivalente de auditoría) y la hora de actualización.
   - RF-4.4: Tras guardar, mostrar toast de éxito/error y llamar a `revalidatePath` de la ruta actual.
   - RF-4.5: Al intentar abandonar la página con cambios locales sin guardar, mostrar diálogo de confirmación.

5) Navegación de recursos
   - RF-5.1: Controles para ir al recurso anterior/siguiente dentro del mismo proyecto, respetando filtros/orden por defecto (definir en implementación, p. ej., por `createdAt`).

6) UI/UX
   - RF-6.1: Layout de pantalla partida con divisor redimensionable, anchura inicial 50/50.
   - RF-6.2: Cabecera sticky con: breadcrumbs del proyecto, título del documento, botón Guardar y acciones de navegación.
   - RF-6.3: Skeleton de carga que replica la estructura final.
   - RF-6.4: Idioma fijo Español (sin i18n).

### 5. No objetivos (Out of Scope)
- Edición del contenido del PDF/imagen (anotaciones, OCR, firmas, etc.).
- Validaciones complejas específicas por caso (más allá de Payload) en esta primera versión.
- Multiidioma.
- Versionado avanzado/deshacer a nivel de campos (se usa lo que provea Payload por defecto).

### 6. Consideraciones de Diseño (UI)
- Stack: Shadcn UI + Tailwind CSS (v4) + iconos Tabler.
- Formulario con componentes de Shadcn integrados con Formik (inputs, select, textarea, checkbox, toggle, date, etc.).
- Visor de PDF en componente cliente (lazy) y visor de imagen con `next/image`.
- Mantener diseño responsive (mobile-first), con el panel del formulario en bloque bajo el visor en pantallas pequeñas.

### 7. Consideraciones Técnicas
- Plataforma: Next.js + PayloadCMS v3 (backend y frontend en Next).
- Patrón de páginas: 3 niveles obligatorios
  - `page.tsx` (solo Suspense + `PageSkeleton`)
  - `components/PageContent.tsx` (lógica principal de datos y render)
  - `components/PageSkeleton.tsx` (skeleton con `animate-pulse`)
- Seguridad: usar `getUser()` y validar asiento de cuenta; verificar que el `Resource` consultado pertenece al `Project` y a la cuenta del usuario.
- Datos:
  - El `Resource` referencia el archivo en el campo `file`.
  - Campos globales existentes con slugs: `nombre_cliente`, `nombre_documento`, `caso`, `tipo`.
  - Campos del caso: estructura ya existente dentro de `Resources` condicionada por `caso` (se deberá mapear para render dinámico).
- Server Actions (preferido sobre Local API):
  - Crear en `src/actions/resources/` (p. ej., `updateResource.ts`) para persistencia.
  - Usar `getPayload({ config })`, validaciones de seguridad y `revalidatePath('/projects/{idProject}/resource/{idResource}')` tras éxito.
  - Registrar en logger de seguridad errores relevantes.
- Estado cliente: Zustand para gestionar estados temporales (p. ej., cambios sin guardar, layout del divisor, navegación entre recursos).
- Formularios: Formik + Yup; Yup con esquema mínimo (placeholder) listo para ampliarse.
- Render del visor:
  - PDF: componente cliente (p. ej., `react-pdf`) con paginación/zoom/descarga.
  - Imagen: `next/image` con zoom/fit y descarga.
- Tipado: usar exclusivamente los tipos generados en `src/payload-types.ts`. Prohibido duplicar interfaces de colecciones.

### 8. Métricas de Éxito
- ≥ 95% de operaciones de guardado exitosas sin error.
- Tiempo de render inicial de la página (sin visor listo) ≤ 2s en entorno estándar.
- Tiempo de visualización del documento (archivo de hasta 5MB) ≤ 3s en red normal.
- 0 incidencias de acceso no autorizado detectadas por las validaciones de pertenencia.
- Tasa de abandono con cambios sin guardar < 5%.

### 9. Edge Cases a cubrir
- Archivo ausente o tipo no soportado (mostrar estado e instrucciones).
- Permiso denegado o recurso no perteneciente al proyecto/cuenta (redirigir o error controlado).
- Archivos grandes (degradar experiencia de visor, indicador de progreso/carga).
- Uso en móvil/tablet con layout responsive.
- Errores de red durante guardado (retry, feedback claro).
- Concurrencia de edición: mostrar último guardado; en conflicto, informar y permitir recargar.

### 10. Preguntas Abiertas
1) Lista completa de "casos" y los campos específicos de cada uno para la primera iteración.
2) Criterio exacto de orden para anterior/siguiente (¿`createdAt`/`nombre_documento`/otro?).
3) Confirmar si existe ya el campo `lastUpdatedBy` en `Resources`; si no existe, añadirlo como relación a `Users` y setearlo vía hook o en la server action.
4) ¿Se requiere historial de cambios más detallado (auditoría extendida) o basta con `updatedAt` + `lastUpdatedBy`?

### 11. Entregables y Ubicación de Código
- Página en `/projects/{idProject}/resource/{idResource}` con estructura de 3 niveles.
- Server action `src/actions/resources/updateResource.ts` con validaciones, persistencia y `revalidatePath`.
- Componentes cliente: `PDFViewer`, `ImageViewer`, `ResizableSplit` y `ResourceForm` (Formik + Shadcn).
- Estado global en `src/stores/` para cambios sin guardar y layout del divisor.


