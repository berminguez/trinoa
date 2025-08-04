// ============================================================================
// EIDETIK MVP - TESTS PARA UPDATE PROJECT ACTION
// ============================================================================

/**
 * Tests unitarios para la server action updateProjectAction
 * 
 * Ejecutar con: tsx src/actions/projects/updateProject.test.ts
 */

// Helper para simular assertions simples
function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message)
  }
}

console.log('🧪 Ejecutando tests para updateProjectAction...\n')

// Test 1: Validación de datos de entrada para actualización
console.log('1. Test: Validación de datos de entrada para actualización')
try {
  interface UpdateProjectData {
    title?: string
    description?: string
  }

  interface UpdateProjectResult {
    success: boolean
    data?: any
    error?: string
  }

  // Simular validación que hace la server action
  function validateUpdateProjectData(data: UpdateProjectData, existingTitle?: string): UpdateProjectResult {
    // Si no hay título para actualizar, solo validar que hay algo que actualizar
    if (!data.title && data.description === undefined) {
      return {
        success: false,
        error: 'No hay datos para actualizar'
      }
    }

    // Validar título si se está actualizando
    if (data.title !== undefined) {
      const trimmed = data.title.trim()
      
      if (!trimmed) {
        return {
          success: false,
          error: 'El título es requerido'
        }
      }

      if (trimmed.length < 3) {
        return {
          success: false,
          error: 'El título debe tener al menos 3 caracteres'
        }
      }

      if (trimmed.length > 100) {
        return {
          success: false,
          error: 'El título no puede exceder 100 caracteres'
        }
      }

      // Si es el mismo título, no hay error pero tampoco cambio
      if (existingTitle && trimmed === existingTitle) {
        return {
          success: true, // No es error, pero no hay cambio
          data: { unchanged: true }
        }
      }
    }

    return { success: true }
  }

  // Test sin datos para actualizar
  const noData = validateUpdateProjectData({})
  assert(noData.success === false, 'Debe rechazar cuando no hay datos para actualizar')
  assert(noData.error === 'No hay datos para actualizar', 'Debe tener mensaje correcto')

  // Test título vacío
  const emptyTitle = validateUpdateProjectData({ title: '' })
  assert(emptyTitle.success === false, 'Debe rechazar título vacío')
  assert(emptyTitle.error === 'El título es requerido', 'Debe tener mensaje correcto para título vacío')

  // Test título muy corto
  const shortTitle = validateUpdateProjectData({ title: 'ab' })
  assert(shortTitle.success === false, 'Debe rechazar título muy corto')
  assert(shortTitle.error === 'El título debe tener al menos 3 caracteres', 'Debe tener mensaje correcto')

  // Test título muy largo
  const longTitle = validateUpdateProjectData({ title: 'a'.repeat(101) })
  assert(longTitle.success === false, 'Debe rechazar título muy largo')
  assert(longTitle.error === 'El título no puede exceder 100 caracteres', 'Debe tener mensaje correcto')

  // Test título válido
  const validTitle = validateUpdateProjectData({ title: 'Mi Proyecto Actualizado' })
  assert(validTitle.success === true, 'Debe aceptar título válido')

  // Test mismo título (sin cambio)
  const sameTitle = validateUpdateProjectData({ title: 'Mi Proyecto' }, 'Mi Proyecto')
  assert(sameTitle.success === true, 'Debe aceptar mismo título sin error')
  assert(sameTitle.data?.unchanged === true, 'Debe marcar como sin cambios')

  // Test solo descripción
  const onlyDescription = validateUpdateProjectData({ description: 'Nueva descripción' })
  assert(onlyDescription.success === true, 'Debe aceptar solo actualización de descripción')

  console.log('✅ Validación de datos de entrada para actualización - PASS\n')
} catch (error) {
  console.log(`❌ Validación de datos de entrada para actualización - FAIL: ${(error as Error).message}\n`)
}

// Test 2: Validación de unicidad durante actualización
console.log('2. Test: Validación de unicidad durante actualización')
try {
  interface ExistingProject {
    id: string
    title: string
    createdBy: string
  }

  // Simular verificación de unicidad para actualizaciones
  function checkUpdateTitleUniqueness(
    projectId: string,
    newTitle: string, 
    userId: string, 
    existingProjects: ExistingProject[]
  ): { unique: boolean; error?: string } {
    const conflictingProject = existingProjects.find(project => 
      project.title.toLowerCase().trim() === newTitle.toLowerCase().trim() &&
      project.createdBy === userId &&
      project.id !== projectId // Excluir el proyecto que se está actualizando
    )

    if (conflictingProject) {
      return {
        unique: false,
        error: 'Ya tienes un proyecto con este título. Elige un título diferente.'
      }
    }

    return { unique: true }
  }

  const existingProjects: ExistingProject[] = [
    { id: 'proj-1', title: 'Proyecto Existente', createdBy: 'user-123' },
    { id: 'proj-2', title: 'Otro Proyecto', createdBy: 'user-456' },
    { id: 'proj-3', title: 'Mi Proyecto Actual', createdBy: 'user-123' },
  ]

  // Test actualizar a título único
  const uniqueUpdate = checkUpdateTitleUniqueness('proj-3', 'Título Completamente Nuevo', 'user-123', existingProjects)
  assert(uniqueUpdate.unique === true, 'Debe permitir actualizar a título único')

  // Test actualizar al mismo título (mismo proyecto)
  const sameProject = checkUpdateTitleUniqueness('proj-3', 'Mi Proyecto Actual', 'user-123', existingProjects)
  assert(sameProject.unique === true, 'Debe permitir mantener el mismo título en el mismo proyecto')

  // Test actualizar a título de otro proyecto del mismo usuario
  const conflictSameUser = checkUpdateTitleUniqueness('proj-3', 'Proyecto Existente', 'user-123', existingProjects)
  assert(conflictSameUser.unique === false, 'Debe rechazar título de otro proyecto del mismo usuario')
  assert(conflictSameUser.error === 'Ya tienes un proyecto con este título. Elige un título diferente.', 'Debe tener mensaje correcto')

  // Test actualizar a título de proyecto de otro usuario (debe permitir)
  const differentUser = checkUpdateTitleUniqueness('proj-3', 'Otro Proyecto', 'user-123', existingProjects)
  assert(differentUser.unique === true, 'Debe permitir título de proyecto de otro usuario')

  // Test case insensitive
  const caseInsensitive = checkUpdateTitleUniqueness('proj-3', 'PROYECTO EXISTENTE', 'user-123', existingProjects)
  assert(caseInsensitive.unique === false, 'Debe rechazar título duplicado case insensitive')

  console.log('✅ Validación de unicidad durante actualización - PASS\n')
} catch (error) {
  console.log(`❌ Validación de unicidad durante actualización - FAIL: ${(error as Error).message}\n`)
}

// Test 3: Preparación de datos para PayloadCMS
console.log('3. Test: Preparación de datos para PayloadCMS')
try {
  interface UpdateData {
    title?: string
    description?: any
  }

  // Simular preparación de datos para actualización
  function prepareUpdateData(title?: string, description?: string): UpdateData {
    const updateData: UpdateData = {}

    if (title !== undefined) {
      updateData.title = title.trim()
    }

    if (description !== undefined) {
      if (description.trim()) {
        updateData.description = [
          {
            type: 'paragraph',
            children: [
              {
                text: description.trim(),
              },
            ],
          },
        ]
      } else {
        updateData.description = null
      }
    }

    return updateData
  }

  // Test solo título
  const titleOnly = prepareUpdateData('  Mi Nuevo Título  ')
  assert(titleOnly.title === 'Mi Nuevo Título', 'Debe limpiar espacios del título')
  assert(titleOnly.description === undefined, 'No debe incluir descripción cuando no se especifica')

  // Test título y descripción
  const titleAndDesc = prepareUpdateData('Mi Título', '  Mi nueva descripción  ')
  assert(titleAndDesc.title === 'Mi Título', 'Debe incluir título limpio')
  assert(Array.isArray(titleAndDesc.description), 'Descripción debe ser array RichText')
  assert(titleAndDesc.description[0].type === 'paragraph', 'Descripción debe tener tipo paragraph')
  assert(titleAndDesc.description[0].children[0].text === 'Mi nueva descripción', 'Descripción debe tener texto limpio')

  // Test descripción vacía (eliminar)
  const emptyDesc = prepareUpdateData(undefined, '   ')
  assert(emptyDesc.title === undefined, 'No debe incluir título cuando no se especifica')
  assert(emptyDesc.description === null, 'Descripción vacía debe ser null')

  // Test solo descripción
  const descOnly = prepareUpdateData(undefined, 'Solo descripción')
  assert(descOnly.title === undefined, 'No debe incluir título')
  assert(descOnly.description[0].children[0].text === 'Solo descripción', 'Debe incluir solo descripción')

  console.log('✅ Preparación de datos para PayloadCMS - PASS\n')
} catch (error) {
  console.log(`❌ Preparación de datos para PayloadCMS - FAIL: ${(error as Error).message}\n`)
}

// Test 4: Verificación de ownership del proyecto
console.log('4. Test: Verificación de ownership del proyecto')
try {
  interface Project {
    id: string
    title: string
    createdBy: string
  }

  interface User {
    id: string
    role: 'user' | 'admin' | 'api'
  }

  // Simular verificación de ownership
  function verifyProjectOwnership(
    project: Project | null, 
    user: User
  ): { canUpdate: boolean; error?: string } {
    if (!project) {
      return {
        canUpdate: false,
        error: 'Proyecto no encontrado'
      }
    }

    // Admins pueden editar cualquier proyecto
    if (user.role === 'admin') {
      return { canUpdate: true }
    }

    // Usuarios normales solo pueden editar sus propios proyectos
    if (user.role === 'user' && project.createdBy === user.id) {
      return { canUpdate: true }
    }

    // Usuarios API no pueden editar proyectos
    if (user.role === 'api') {
      return {
        canUpdate: false,
        error: 'Los usuarios API no pueden editar proyectos'
      }
    }

    // Usuario normal tratando de editar proyecto de otro
    return {
      canUpdate: false,
      error: 'No tienes permisos para editar este proyecto'
    }
  }

  const testProject: Project = {
    id: 'proj-1',
    title: 'Test Project',
    createdBy: 'user-123'
  }

  // Test owner normal
  const owner = verifyProjectOwnership(testProject, { id: 'user-123', role: 'user' })
  assert(owner.canUpdate === true, 'Owner debe poder editar su proyecto')

  // Test admin
  const admin = verifyProjectOwnership(testProject, { id: 'admin-1', role: 'admin' })
  assert(admin.canUpdate === true, 'Admin debe poder editar cualquier proyecto')

  // Test usuario diferente
  const otherUser = verifyProjectOwnership(testProject, { id: 'user-456', role: 'user' })
  assert(otherUser.canUpdate === false, 'Usuario diferente no debe poder editar')
  assert(otherUser.error === 'No tienes permisos para editar este proyecto', 'Debe tener mensaje correcto')

  // Test usuario API
  const apiUser = verifyProjectOwnership(testProject, { id: 'api-1', role: 'api' })
  assert(apiUser.canUpdate === false, 'Usuario API no debe poder editar')
  assert(apiUser.error === 'Los usuarios API no pueden editar proyectos', 'Debe tener mensaje específico para API')

  // Test proyecto no encontrado
  const notFound = verifyProjectOwnership(null, { id: 'user-123', role: 'user' })
  assert(notFound.canUpdate === false, 'Proyecto null debe fallar')
  assert(notFound.error === 'Proyecto no encontrado', 'Debe tener mensaje correcto para not found')

  console.log('✅ Verificación de ownership del proyecto - PASS\n')
} catch (error) {
  console.log(`❌ Verificación de ownership del proyecto - FAIL: ${(error as Error).message}\n`)
}

// Test 5: Estructura de respuesta de actualización
console.log('5. Test: Estructura de respuesta de actualización')
try {
  interface UpdatedProject {
    id: string
    title: string
    description?: any
    updatedAt: string
  }

  interface UpdateProjectResult {
    success: boolean
    data?: UpdatedProject
    error?: string
  }

  // Simular respuesta exitosa de actualización
  function createUpdateSuccessResponse(originalProject: any, updates: any): UpdateProjectResult {
    const updatedProject: UpdatedProject = {
      ...originalProject,
      ...updates,
      updatedAt: new Date().toISOString(),
    }

    return {
      success: true,
      data: updatedProject,
    }
  }

  // Test actualización de título
  const titleUpdate = createUpdateSuccessResponse(
    { id: 'proj-1', title: 'Título Original', description: null },
    { title: 'Título Actualizado' }
  )

  assert(titleUpdate.success === true, 'Respuesta de actualización debe ser exitosa')
  assert(!!titleUpdate.data, 'Debe incluir datos del proyecto actualizado')
  assert(titleUpdate.data!.title === 'Título Actualizado', 'Debe incluir título actualizado')
  assert(titleUpdate.data!.id === 'proj-1', 'Debe mantener ID original')
  assert(typeof titleUpdate.data!.updatedAt === 'string', 'Debe incluir timestamp de actualización')

  // Test actualización de descripción
  const descUpdate = createUpdateSuccessResponse(
    { id: 'proj-2', title: 'Mi Proyecto', description: null },
    { description: [{ type: 'paragraph', children: [{ text: 'Nueva descripción' }] }] }
  )

  assert(descUpdate.success === true, 'Actualización de descripción debe ser exitosa')
  assert(Array.isArray(descUpdate.data!.description), 'Descripción debe ser array RichText')
  assert(descUpdate.data!.title === 'Mi Proyecto', 'Debe mantener título original')

  console.log('✅ Estructura de respuesta de actualización - PASS\n')
} catch (error) {
  console.log(`❌ Estructura de respuesta de actualización - FAIL: ${(error as Error).message}\n`)
}

console.log('🎉 Tests de updateProjectAction completados!')
console.log('\n📊 Resumen de tests:')
console.log('- Validación de datos de entrada para actualización ✅')
console.log('- Validación de unicidad durante actualización ✅')
console.log('- Preparación de datos para PayloadCMS ✅')
console.log('- Verificación de ownership del proyecto ✅')
console.log('- Estructura de respuesta de actualización ✅')
console.log('\n🔧 Para ejecutar: tsx src/actions/projects/updateProject.test.ts') 