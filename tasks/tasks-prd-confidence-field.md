# Tasks: Campo "Confidence" en Resources

Basado en: `prd-confidence-field.md`

## Relevant Files

- `src/collections/Resources.ts` - Colección principal donde se añadirá el campo confidence
- `src/globals/Configuracion.ts` - Configuración global donde se añadirá confidenceThreshold
- `src/actions/resources/updateResourceConfidence.ts` - Nuevo server action para actualizar confidence
- `src/actions/resources/updateResourceConfidence.test.ts` - Tests del server action
- `src/actions/resources/index.ts` - Índice de exports de actions de resources
- `src/lib/utils/calculateResourceConfidence.ts` - Función utilitaria para calcular confidence ✅ CREADO
- `tests/unit/lib/utils/calculateResourceConfidence.test.ts` - Tests de la función de cálculo ✅ CREADO
- `src/components/ui/confidence-badge.tsx` - Componente Badge para mostrar confidence
- `src/components/ui/confidence-badge.test.tsx` - Tests del componente Badge
- `src/app/(frontend)/(private)/projects/[id]/components/VideoTable.tsx` - Tabla principal donde se mostrará confidence
- `src/app/(frontend)/(private)/clients/[idclient]/projects/components/ClientProjectsGrid.tsx` - Grid de proyectos cliente
- `src/app/(frontend)/(private)/clients/[idclient]/projects/[idproject]/resource/[idresource]/components/ClientResourceContent.tsx` - Vista detalle de recurso
- `src/payload-types.ts` - Tipos autogenerados (se actualizarán automáticamente)
- `scripts/migrate-confidence.ts` - Script de migración para recursos existentes

### Notes

- Los tipos en `src/payload-types.ts` se regeneran automáticamente al cambiar las colecciones
- Usar `pnpm payload generate:types` para regenerar tipos manualmente si es necesario
- Los tests se ejecutan con `pnpm test` para todos o `pnpm test [archivo]` para específicos
- La migración debe ejecutarse una sola vez después del deploy

## Tasks

- [x] 1.0 Configuración de Backend - Añadir campos y estructuras base
  - [x] 1.1 Añadir campo `confidence` tipo select a Resources.ts con opciones: empty, needs_revision, trusted, verified
  - [x] 1.2 Añadir `confidence` a defaultColumns en admin config de Resources.ts
  - [x] 1.3 Añadir campo `confidenceThreshold` tipo number a Configuracion.ts en pestaña "Analítica"
  - [x] 1.4 Configurar validación del threshold (0-100) y valor por defecto 70
  - [x] 1.5 Regenerar tipos con `pnpm payload generate:types`

- [x] 2.0 Lógica de Cálculo - Implementar función de evaluación automática
  - [x] 2.1 Crear función `calculateResourceConfidence(resource, threshold)` en `src/lib/utils/`
  - [x] 2.2 Implementar lógica para estado `empty` (sin analyzeResult.fields)
  - [x] 2.3 Implementar lógica para estado `needs_revision` (campos < threshold)
  - [x] 2.4 Implementar lógica para estado `trusted` (todos campos ≥ threshold)
  - [x] 2.5 Implementar lógica para estado `verified` (campos problemáticos con manual: true)
  - [x] 2.6 Añadir tests unitarios completos para todos los casos de la función
  - [x] 2.7 Crear función helper para obtener threshold de configuración con cache

- [ ] 3.0 Server Actions - Crear acciones para actualización de confidence
  - [ ] 3.1 Crear `updateResourceConfidence(resourceId)` en `src/actions/resources/`
  - [ ] 3.2 Implementar validaciones de acceso y permisos de usuario
  - [ ] 3.3 Integrar con función calculateResourceConfidence
  - [ ] 3.4 Añadir manejo de errores y logging apropiado
  - [ ] 3.5 Retornar nuevo estado calculado en response
  - [ ] 3.6 Exportar en `src/actions/resources/index.ts`
  - [ ] 3.7 Crear tests unitarios del server action

- [ ] 4.0 Integración con Webhooks - Conectar actualización automática con flujo existente
  - [ ] 4.1 Integrar cálculo automático en webhook de Resources (línea ~1085 aprox)
  - [ ] 4.2 Añadir hook `afterChange` a Resources.ts para detectar cambios en analyzeResult
  - [ ] 4.3 Crear script de migración `scripts/migrate-confidence.ts` para recursos existentes
  - [ ] 4.4 Implementar función `migrateExistingResourcesConfidence()` que procese todos los recursos
  - [ ] 4.5 Añadir logging detallado para monitorear migraciones y actualizaciones
  - [ ] 4.6 Configurar ejecución automática de migración en deploy (opcional)

- [ ] 5.0 Visualización Frontend - Implementar badges y tablas con confidence
  - [ ] 5.1 Crear componente `ConfidenceBadge` en `src/components/ui/` usando Shadcn Badge
  - [ ] 5.2 Implementar colores distintivos: empty (gris), needs_revision (naranja), trusted (verde), verified (azul)
  - [ ] 5.3 Añadir iconos de tabler y tooltips explicativos
  - [ ] 5.4 Integrar ConfidenceBadge en VideoTable de proyectos
  - [ ] 5.5 Integrar ConfidenceBadge en ClientProjectsGrid
  - [ ] 5.6 Integrar ConfidenceBadge en ClientResourceContent (vista detalle)
  - [ ] 5.7 Hacer campo filtrable y ordenable en las tablas que lo soporten
  - [ ] 5.8 Crear tests unitarios del componente ConfidenceBadge
  - [ ] 5.9 Verificar responsive design y accesibilidad del componente
