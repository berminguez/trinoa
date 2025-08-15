### PRD: Splitter (División de PDFs con múltiples facturas)

#### 1) Introducción / Overview
Usuarios suben PDFs que pueden contener varias facturas en un único archivo. La funcionalidad “Splitter” permitirá, antes de subir, marcar un archivo como “Documento con varias facturas”. Cuando está activo, el PDF seguirá un flujo especial: se creará un registro temporal en `pre-resources`, se llamará a un endpoint externo de “Splitter” que devolverá las páginas de inicio de cada factura y, con esa información, se dividirá el PDF en fragmentos para crear `resources` independientes por factura.

Objetivo: mejorar la ingestión de documentos multi‑factura y convertirlos en `resources` procesables individualmente sin tener que subirlos manualmente por separado.

#### 2) Goals
- **Marcado por archivo**: permitir marcar cada archivo individual como multi‑factura, por defecto desactivado.
- **Colección `pre-resources`**: almacenar temporalmente PDFs marcados como multi‑factura y su estado de procesamiento.
- **Integración con Splitter Endpoint**: enviar URL presignada S3 y recibir `{ pages: number[] }` (1‑based) para determinar los cortes.
- **División en servidor (Node)**: dividir el PDF en memoria/streaming y crear `resources` independientes por cada rango de páginas.
- **Trazabilidad**: mantener relación entre `pre-resource` y `resources` creados; conservar `pre-resource` para auditoría.
- **UX clara**: feedback “Procesando división” tras subir con el switch activo.

#### 3) User Stories
- Como usuario autenticado de un proyecto, quiero marcar un PDF como multi‑factura para que el sistema lo divida automáticamente y cree un `resource` por factura.
- Como usuario, quiero ver un estado de “Procesando división” cuando subo un PDF multi‑factura para entender que no aparecerá de inmediato como `resource` único.
- Como administrador (Payload admin), quiero poder ver y reintentar el procesamiento de un `pre-resource` en error.

#### 4) Requisitos funcionales
1. **Listado previo y switch por archivo**: En el uploader se listan los archivos añadidos. Cada archivo muestra un switch “Documento con varias facturas” (off por defecto). No hay switch global.
2. **Comportamiento estándar (switch off)**: Si el switch está off, el PDF se sube y procesa como un `resource` normal (flujo actual).
3. **Flujo multi‑factura (switch on)**:
   - Al pulsar “Subir”, en UI se muestra estado “Procesando división” y el archivo deja de mostrarse como pendiente normal.
   - El backend crea un registro en la colección `pre-resources` con: proyecto, usuario, archivo PDF, estado (`pending` | `processing` | `error` | `done`), respuesta del splitter (`pages`), errores, `derivedResourceIds`, `lastUpdatedBy`, timestamps.
   - Se genera una URL presignada S3 pública temporal (presigned URL) para el PDF y se llama al **Splitter Endpoint** configurado en `Globals` (método POST, auth Bearer existente en configuración).
   - El cuerpo de la request incluirá la URL presignada del PDF (JSON). La respuesta esperada es `{ pages: number[] }` con índices 1‑based.
4. **Validación de `pages`**: Si `pages` es inválido (fuera de rango, duplicados, desordenados), se rechaza el proceso y se marca `pre-resource` en estado `error` con detalles.
5. **Cálculo de cortes**: Dado `pages = [1, 3, 4, 7]` y total P páginas, se generan rangos: 1–2, 3–3, 4–6, 7–P.
6. **División y creación de `resources`**:
   - Se divide el PDF en fragmentos siguiendo los rangos calculados usando una librería Node (ver sección técnica).
   - Por cada fragmento, se crea un `resource` nuevo dentro del mismo proyecto con metadatos que referencien el `pre-resource` origen.
   - Si la división produce 1 solo fragmento, igualmente se crea un único `resource` (no se sube el original entero como un único `resource` aparte).
   - Tras éxito, `pre-resource` pasa a `done` y se conserva para auditoría (no se elimina).
7. **Errores**:
   - Si falla el endpoint del Splitter, el `pre-resource` pasa a `error`. Debe existir acción de “Reintentar” manual en el admin de Payload.
   - Si falla la división, el `pre-resource` pasa a `error` con log del fallo.
8. **Visibilidad**: Los `pre-resources` existen únicamente en el admin de Payload y no se listan en el frontend.
9. **Límites**: Se aplican los límites actuales de `Media` para tamaño y validaciones. No se introduce un límite de páginas adicional.
10. **UX adicional en lista previa**: Mostrar nombre, tamaño y, si es posible, páginas estimadas antes de subir; mostrar un badge “Multi‑factura” cuando el switch esté activo.

#### 5) No objetivos (Out of Scope)
- Notificaciones (toasts/email) tras la creación de `resources` multi‑factura.
- Telemetría, métricas o timeline detallado por ahora.
- Previsualización y edición manual de cortes antes de crear `resources`.

#### 6) Consideraciones de Diseño (UI/UX)
- Uploader reutilizable con vista en lista y switch por archivo, manteniendo separación clara de responsabilidades.
- Stack UI: Shadcn + Tailwind 4 + Tabler icons, coherente con el proyecto.
- Copys:
  - Switch: “Documento con varias facturas”.
  - Estado tras subir con switch on: “Procesando división…”.

#### 7) Consideraciones Técnicas
- **Arquitectura y stack**: NextJS + Payload (Node). Preferir server actions para orquestar, alojadas en `src/actions/` agrupadas por funcionalidad.
- **Colección nueva**: `pre-resources` (plural). Campos: `project`, `user`, `file` (PDF), `status`, `splitterResponse.pages`, `error`, `derivedResourceIds`, `lastUpdatedBy`, timestamps.
- **Global de configuración**: Añadir campo “Splitter Endpoint” en `Globals` (debajo de URL del webhook de N8n) y reutilizar el Bearer token ya existente en configuración. Timeout y reintentos no configurables en esta fase.
- **Llamada al Splitter**: Método POST, Header `Authorization: Bearer <token>`, body JSON con la presigned URL del PDF. Respuesta `{ pages: number[] }` con índices 1‑based.
- **Presigned URL (S3)**: Generar URL presignada temporal con permisos de lectura pública para el servicio Splitter.
- **Librería de división (Node)**: Usar `pdf-lib` para leer el PDF, contar páginas y construir documentos por rangos de páginas. Evitar dependencias nativas y servicios externos.
- **Normalización y validación**: Validar `pages` y coherencia con el número total de páginas antes de dividir.
- **Persistencia de relación**: Guardar en el `pre-resource` la lista de `derivedResourceIds` generados.
- **Seguridad y permisos**: Solo usuarios autenticados con acceso al proyecto pueden crear `pre-resources`. `pre-resources` visibles/gestionables únicamente desde el admin de Payload.
- **Procesamiento**: Ejecución en background tras crear el `pre-resource` (cola/trabajo) o inline si el coste computacional es bajo; si se usa cola, reutilizar infraestructura existente.

#### 8) Métricas de éxito
- % de procesos de división exitosos por PDFs multi‑factura.

#### 9) Criterios de aceptación
- Subir un PDF marcado como multi‑factura crea N `resources` correctos según los rangos derivados de `pages` devueltos por el Splitter.
- Si el Splitter devuelve `pages` inválidos, el `pre-resource` queda en `error` y es reintentable desde el admin.

#### 10) Edge Cases
- PDFs escaneados sin texto (no afecta si el Splitter se basa en visión/heurística externa; el sistema debe tolerar la respuesta del endpoint igualmente).
- PDFs protegidos/dañados: detectar y marcar `error` con mensaje claro.
- `pages` vacío o `[1]`: crear un único `resource` del documento completo.
- `pages` fuera de rango/duplicados/desordenados: rechazar y marcar `error` (no intentar normalizar en esta fase).

#### 11) Preguntas abiertas
- Formato exacto del body para el Splitter: `{ url: string }` ¿Se requiere incluir metadatos como `projectId`, `fileName`?
- ¿Procesamiento inline vs background/cola? Si hay picos de volumen, conviene encolar.
- ¿Límites de expiración de la presigned URL? Validar que cubre el tiempo de procesamiento esperado.


