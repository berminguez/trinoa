## Relevant Files

- `src/components/DocumentUploader.tsx` - Uploader reutilizable con vista en lista y switch por archivo.
- `src/app/(frontend)/(private)/projects/[id]/components/DocumentUploadModal.tsx` - Integra el uploader en flujo de proyecto.
- `src/collections/PreResources.ts` - Nueva colección `pre-resources` en Payload.
- `src/globals/Configuracion.ts` - Añadir campo Global "Splitter Endpoint" y reutilizar Bearer.
- `src/actions/splitter/createPreResource.ts` - Server action para crear `pre-resource` y disparar procesamiento.
- `src/actions/splitter/processPreResource.ts` - Server action para llamar endpoint Splitter y orquestar estados.
- `src/actions/splitter/createDerivedResources.ts` - Server action para crear `resources` desde fragmentos.
- `src/lib/pdf/splitter.ts` - Utilidad Node con `pdf-lib` para dividir PDFs por rangos.
- `src/lib/storage.ts` - Generación de presigned URL S3 de lectura.
- `src/payload.config.ts` - Registrar la nueva colección y el global actualizado.
- `src/payload-types.ts` - Tipos generados (regenerar tras añadir colección/campos).
- `tests/int/splitter.int.spec.ts` - Test de integración del flujo completo (happy path y errores).
- `src/lib/pdf/splitter.test.ts` - Unit tests de la utilidad de división.
- `src/actions/splitter/processPreResource.test.ts` - Unit tests de orquestación y validación de `pages`.

### Notes

- Ejecutar `pnpm payload generate:types` tras crear la colección y campos Global.
- Preferir server actions en `src/actions/` agrupadas por funcionalidad.
- Mantener `pre-resources` solo en admin de Payload; sin UI en frontend.

## Tasks

- [ ] 1.0 Actualizar uploader con listado previo y switch por archivo
  - [x] 1.1 Añadir vista en lista al componente `DocumentUploader` mostrando nombre, tamaño y (si es posible) páginas estimadas.
  - [x] 1.2 Incorporar switch por archivo con copy “Documento con varias facturas” (off por defecto) y badge "Multi‑factura" cuando esté activo.
  - [x] 1.3 Ajustar `DocumentUploadModal.tsx` para usar el uploader actualizado sin romper el flujo estándar.
  - [x] 1.4 Estado UI “Procesando división…” cuando se sube con switch activo.

- [ ] 2.0 Definir colección `pre-resources` y configuración Global "Splitter Endpoint" en Payload
  - [x] 2.1 Crear `src/collections/PreResources.ts` con campos: `project`, `user`, `file`, `status` (`pending|processing|error|done`), `splitterResponse.pages`, `error`, `derivedResourceIds`, `lastUpdatedBy`, timestamps.
  - [x] 2.2 Registrar la colección en `src/payload.config.ts`.
  - [x] 2.3 Añadir en `src/globals/Configuracion.ts` el campo string "Splitter Endpoint" (debajo de URL webhook N8n) y reutilizar Bearer token existente.
  - [x] 2.4 Regenerar tipos de Payload.

- [ ] 3.0 Implementar generación de presigned URL S3 (lectura temporal) para el PDF
  - [x] 3.1 Añadir helper en `src/lib/storage.ts` para generar presigned URL de lectura.
  - [ ] 3.2 Validar expiración suficiente para el procesamiento esperado.

- [ ] 4.0 Orquestación del flujo Splitter (server actions)
  - [x] 4.1 `createPreResource`: al recibir un archivo con switch activo, crear registro en `pre-resources` con `status=pending` y datos básicos.
  - [x] 4.2 Subir el PDF a almacenamiento y obtener presigned URL de lectura.
  - [x] 4.3 `processPreResource`: cambiar a `processing`, llamar al Splitter Endpoint (POST, Authorization Bearer desde Globals) enviando `{ url: string }`.
  - [x] 4.4 Validar respuesta `{ pages: number[] }` (1‑based). Si inválido, marcar `error` con detalles.
  - [ ] 4.5 Calcular rangos a partir de `pages` y total de páginas del PDF.

- [ ] 5.0 Utilidad de división PDF en Node con `pdf-lib` y validación de `pages`
  - [x] 5.1 Implementar `src/lib/pdf/splitter.ts` que acepte buffer y rangos, y devuelva buffers de fragmentos.
  - [x] 5.2 Verificar soporte de PDFs grandes y memoria (streaming si aplica o chunking razonable).
  - [x] 5.3 Unit tests para rangos: ejemplos `[1,3,4,7]` y casos límite (`[1]`, vacío, fuera de rango).

- [ ] 6.0 Crear `resources` derivados y registrar trazabilidad en `pre-resource`
  - [x] 6.1 Para cada fragmento, crear un `resource` en el mismo proyecto con metadatos que referencien el `pre-resource` origen.
  - [x] 6.2 Si solo hay 1 fragmento, igualmente crear un único `resource` (no usar el archivo original entero).
  - [x] 6.3 Guardar `derivedResourceIds` en el `pre-resource` y marcar `done` al finalizar.

- [ ] 7.0 Permisos y visibilidad
  - [x] 7.1 Asegurar que solo usuarios autenticados con acceso al proyecto puedan crear `pre-resources`.
  - [x] 7.2 Ocultar `pre-resources` en frontend (no exponer endpoints/listados); visible solo en admin Payload.
  - [x] 7.3 Añadir acción de “Reintentar” manual en admin para `pre-resources` con `status=error`.

- [ ] 8.0 Pruebas y aceptación
  - [ ] 8.1 Test unitario de `src/lib/pdf/splitter.ts` (rango correcto y casos de error).
  - [ ] 8.2 Test unitario de `processPreResource` (validación de `pages`, cambio de estados, manejo de errores del endpoint).
  - [ ] 8.3 Test de integración `tests/int/splitter.int.spec.ts`: flujo completo happy path creando N `resources` según `pages`.
  - [ ] 8.4 Verificar criterios de aceptación del PRD: creación de `resources` correctos y manejo de `pages` inválidos (error + reintento manual).


