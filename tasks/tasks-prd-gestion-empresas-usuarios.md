# Tasks: Gestión de Empresas y Usuarios

## Relevant Files

- `src/collections/Companies.ts` - Nueva colección de PayloadCMS para empresas con validaciones y permisos
- `src/collections/Companies.test.ts` - Tests unitarios para la colección Companies
- `src/collections/Users.ts` - Modificación de colección existente para incluir relación con empresas y campo filial
- `src/actions/companies/createCompanyAction.ts` - Server action para crear empresas con validaciones de duplicados
- `src/actions/companies/getCompaniesAction.ts` - Server action para obtener lista de empresas
- `src/actions/companies/validateCompanyAction.ts` - Server action para validar empresas antes de crear/editar
- `src/actions/companies/index.ts` - Exportaciones de actions de empresas
- `src/actions/companies/createCompanyAction.test.ts` - Tests para server action de creación
- `src/actions/companies/getCompaniesAction.test.ts` - Tests para server action de obtención
- `src/app/(frontend)/(private)/account/components/UserProfileForm.tsx` - Formulario de perfil con campos limitados para usuarios
- `src/app/(frontend)/(private)/account/components/UserProfileForm.test.tsx` - Tests para formulario de perfil
- `src/app/(frontend)/(private)/clients/components/UserForm.tsx` - Formulario completo de usuarios para administradores
- `src/app/(frontend)/(private)/clients/components/CompanySelector.tsx` - Componente selector de empresas con autocompletado
- `src/app/(frontend)/(private)/clients/components/CreateCompanyDialog.tsx` - Modal para crear nueva empresa desde formulario de usuario
- `src/app/(frontend)/(private)/clients/components/UserForm.test.tsx` - Tests para formulario de usuario administrativo
- `src/app/(frontend)/(private)/clients/components/CompanySelector.test.tsx` - Tests para selector de empresas
- `src/payload-types.ts` - Tipos TypeScript generados automáticamente (regenerar después de cambios)

### Notes

- Usar `pnpm payload generate:types` para regenerar tipos después de modificar colecciones
- Tests unitarios se ejecutan con `pnpm test` 
- Server actions deben seguir patrón establecido en `/src/actions/` agrupados por funcionalidad
- Componentes Shadcn a instalar: `pnpm add shadcn@latest` para Select, Dialog, Alert según necesidad

## Tasks

- [x] 1.0 Crear colección Companies en PayloadCMS
  - [x] 1.1 Crear archivo `src/collections/Companies.ts` con campos name y cif requeridos
  - [x] 1.2 Implementar hook beforeValidate para prevenir duplicados de nombre y CIF
  - [x] 1.3 Configurar permisos de acceso solo para administradores (create, update, delete)
  - [x] 1.4 Añadir validación de formato básica para campo CIF (no vacío, alfanumérico)
  - [x] 1.5 Registrar colección en `src/payload.config.ts`
  - [x] 1.6 Crear tests unitarios para validaciones de duplicados y permisos

- [x] 2.0 Modificar colección Users para nueva estructura empresarial
  - [x] 2.1 Cambiar campo `empresa` de String a relationship con colección Companies
  - [x] 2.2 Añadir campo `filial` como String opcional para departamento/filial
  - [x] 2.3 Configurar campo empresa como requerido para todos los usuarios
  - [x] 2.4 Actualizar permisos para que usuarios solo puedan editar campo `name`
  - [x] 2.5 Regenerar tipos TypeScript con `pnpm payload generate:types`

- [x] 3.0 Implementar server actions para gestión de empresas
  - [x] 3.1 Crear `createCompanyAction.ts` con validación de duplicados y permisos de admin
  - [x] 3.2 Crear `getCompaniesAction.ts` para obtener lista de empresas disponibles
  - [x] 3.3 Crear `validateCompanyAction.ts` para validaciones pre-envío en frontend
  - [x] 3.4 Implementar manejo de errores y respuestas estructuradas en todas las actions
  - [x] 3.5 Añadir revalidatePath apropiado después de operaciones de modificación
  - [x] 3.6 Crear tests unitarios para todas las server actions

- [x] 4.0 Actualizar interfaz /account para usuarios finales
  - [x] 4.1 Modificar `UserProfileForm.tsx` para mostrar todos los campos (nombre, email, empresa, filial, rol)
  - [x] 4.2 Implementar campo nombre como único editable para usuarios no-admin
  - [x] 4.3 Mostrar empresa y filial como badges de solo lectura usando componente Badge de Shadcn
  - [x] 4.4 Añadir indicaciones visuales claras de qué campos son editables vs solo lectura
  - [x] 4.5 Implementar validaciones y manejo de errores en formulario
  - [x] 4.6 Crear tests para verificar permisos correctos según rol de usuario

- [ ] 5.0 Actualizar interfaz /clients para administradores
  - [x] 5.1 Crear componente `CompanySelector.tsx` con Select de Shadcn y autocompletado
  - [x] 5.2 Crear componente `CreateCompanyDialog.tsx` con Dialog de Shadcn para crear empresas
  - [ ] 5.3 Integrar selector de empresa y campo filial en formulario existente de `UserForm.tsx`
  - [x] 5.4 Implementar funcionalidad "Crear nueva empresa" accesible desde formulario de usuario
  - [ ] 5.5 Actualizar validaciones para incluir empresa requerida y filial opcional
  - [ ] 5.6 Asegurar que administradores pueden modificar todos los campos de cualquier usuario
  - [x] 5.7 Crear tests para componentes nuevos y funcionalidad de administrador
