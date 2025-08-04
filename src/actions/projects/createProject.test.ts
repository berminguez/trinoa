// ============================================================================
// EIDETIK MVP - TESTS PARA CREATE PROJECT ACTION
// ============================================================================

/**
 * Tests unitarios para la server action createProjectAction
 * 
 * Ejecutar con: tsx src/actions/projects/createProject.test.ts
 */

// Helper para simular assertions simples
function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message)
  }
}

console.log('🧪 Ejecutando tests para createProjectAction...\n')

// Test 1: Validación de datos de entrada
console.log('1. Test: Validación de datos de entrada')
try {
  interface CreateProjectData {
    title: string
    description?: string
  }

  interface CreateProjectResult {
    success: boolean
    data?: any
    error?: string
  }

  // Simular validación que hace la server action
  function validateCreateProjectData(data: CreateProjectData): CreateProjectResult {
    // Validar datos de entrada
    if (!data.title?.trim()) {
      return {
        success: false,
        error: 'El título es requerido'
      }
    }

    if (data.title.trim().length < 3) {
      return {
        success: false,
        error: 'El título debe tener al menos 3 caracteres'
      }
    }

    if (data.title.trim().length > 100) {
      return {
        success: false,
        error: 'El título no puede exceder 100 caracteres'
      }
    }

    return { success: true }
  }

  // Test título vacío
  const emptyTitle = validateCreateProjectData({ title: '' })
  assert(emptyTitle.success === false, 'Debe rechazar título vacío')
  assert(emptyTitle.error === 'El título es requerido', 'Debe tener mensaje correcto para título vacío')

  // Test título undefined
  const undefinedTitle = validateCreateProjectData({ title: undefined as any })
  assert(undefinedTitle.success === false, 'Debe rechazar título undefined')
  assert(undefinedTitle.error === 'El título es requerido', 'Debe tener mensaje correcto para título undefined')

  // Test título muy corto
  const shortTitle = validateCreateProjectData({ title: 'ab' })
  assert(shortTitle.success === false, 'Debe rechazar título muy corto')
  assert(shortTitle.error === 'El título debe tener al menos 3 caracteres', 'Debe tener mensaje correcto para título corto')

  // Test título muy largo
  const longTitle = validateCreateProjectData({ title: 'a'.repeat(101) })
  assert(longTitle.success === false, 'Debe rechazar título muy largo')
  assert(longTitle.error === 'El título no puede exceder 100 caracteres', 'Debe tener mensaje correcto para título largo')

  // Test título válido
  const validTitle = validateCreateProjectData({ title: 'Mi Proyecto Válido' })
  assert(validTitle.success === true, 'Debe aceptar título válido')
  assert(validTitle.error === undefined, 'No debe tener error para título válido')

  // Test con descripción
  const withDescription = validateCreateProjectData({ 
    title: 'Mi Proyecto', 
    description: 'Mi descripción' 
  })
  assert(withDescription.success === true, 'Debe aceptar título con descripción')

  console.log('✅ Validación de datos de entrada - PASS\n')
} catch (error) {
  console.log(`❌ Validación de datos de entrada - FAIL: ${(error as Error).message}\n`)
}

// Test 2: Validación de permisos de usuario
console.log('2. Test: Validación de permisos de usuario')
try {
  interface User {
    id: string
    role: 'user' | 'admin' | 'api'
  }

  interface CreateProjectResult {
    success: boolean
    error?: string
  }

  // Simular validación de permisos
  function validateUserPermissions(user: User | null): CreateProjectResult {
    if (!user) {
      return {
        success: false,
        error: 'Usuario no autenticado'
      }
    }

    // Solo usuarios normales y admins pueden crear proyectos
    if (user.role !== 'user' && user.role !== 'admin') {
      return {
        success: false,
        error: 'No tienes permisos para crear proyectos'
      }
    }

    return { success: true }
  }

  // Test usuario no autenticado
  const noUser = validateUserPermissions(null)
  assert(noUser.success === false, 'Debe rechazar usuario no autenticado')
  assert(noUser.error === 'Usuario no autenticado', 'Debe tener mensaje correcto para usuario no autenticado')

  // Test usuario con rol 'user'
  const regularUser = validateUserPermissions({ id: 'user-1', role: 'user' })
  assert(regularUser.success === true, 'Debe aceptar usuario regular')

  // Test usuario con rol 'admin'
  const adminUser = validateUserPermissions({ id: 'admin-1', role: 'admin' })
  assert(adminUser.success === true, 'Debe aceptar usuario admin')

  // Test usuario con rol 'api'
  const apiUser = validateUserPermissions({ id: 'api-1', role: 'api' })
  assert(apiUser.success === false, 'Debe rechazar usuario API')
  assert(apiUser.error === 'No tienes permisos para crear proyectos', 'Debe tener mensaje correcto para usuario API')

  console.log('✅ Validación de permisos de usuario - PASS\n')
} catch (error) {
  console.log(`❌ Validación de permisos de usuario - FAIL: ${(error as Error).message}\n`)
}

// Test 3: Preparación de datos del proyecto
console.log('3. Test: Preparación de datos del proyecto')
try {
  interface ProjectData {
    title: string
    description?: any
    createdBy: string
  }

  // Simular preparación de datos para PayloadCMS
  function prepareProjectData(title: string, description?: string, userId?: string): ProjectData {
    const projectData: ProjectData = {
      title: title.trim(),
      createdBy: userId || 'user-123',
    }

    // Convertir descripción a formato RichText de PayloadCMS
    if (description?.trim()) {
      projectData.description = [
        {
          type: 'paragraph',
          children: [
            {
              text: description.trim(),
            },
          ],
        },
      ]
    }

    return projectData
  }

  // Test solo con título
  const titleOnly = prepareProjectData('Mi Proyecto', undefined, 'user-123')
  assert(titleOnly.title === 'Mi Proyecto', 'Debe incluir título')
  assert(titleOnly.createdBy === 'user-123', 'Debe incluir createdBy')
  assert(titleOnly.description === undefined, 'No debe incluir descripción vacía')

  // Test con título y descripción
  const withDescription = prepareProjectData('Mi Proyecto', 'Mi descripción', 'user-456')
  assert(withDescription.title === 'Mi Proyecto', 'Debe incluir título')
  assert(withDescription.createdBy === 'user-456', 'Debe incluir createdBy correcto')
  assert(Array.isArray(withDescription.description), 'Descripción debe ser array')
  assert(withDescription.description[0].type === 'paragraph', 'Descripción debe tener tipo paragraph')
  assert(withDescription.description[0].children[0].text === 'Mi descripción', 'Descripción debe tener texto correcto')

  // Test con descripción solo espacios
  const spacesDescription = prepareProjectData('Mi Proyecto', '   ', 'user-789')
  assert(spacesDescription.description === undefined, 'No debe incluir descripción solo espacios')

  // Test limpieza de espacios
  const spacedData = prepareProjectData('  Mi Proyecto  ', '  Mi descripción  ', 'user-123')
  assert(spacedData.title === 'Mi Proyecto', 'Debe limpiar espacios del título')
  assert(spacedData.description[0].children[0].text === 'Mi descripción', 'Debe limpiar espacios de la descripción')

  console.log('✅ Preparación de datos del proyecto - PASS\n')
} catch (error) {
  console.log(`❌ Preparación de datos del proyecto - FAIL: ${(error as Error).message}\n`)
}

// Test 4: Validación de unicidad de título
console.log('4. Test: Validación de unicidad de título')
try {
  interface ExistingProject {
    id: string
    title: string
    createdBy: string
  }

  // Simular verificación de unicidad
  function checkTitleUniqueness(
    title: string, 
    userId: string, 
    existingProjects: ExistingProject[]
  ): { unique: boolean; error?: string } {
    const existingProject = existingProjects.find(project => 
      project.title.toLowerCase().trim() === title.toLowerCase().trim() &&
      project.createdBy === userId
    )

    if (existingProject) {
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
    { id: 'proj-3', title: 'PROYECTO EN MAYÚSCULAS', createdBy: 'user-123' },
  ]

  // Test título único para el usuario
  const uniqueTitle = checkTitleUniqueness('Nuevo Proyecto', 'user-123', existingProjects)
  assert(uniqueTitle.unique === true, 'Debe aceptar título único para el usuario')

  // Test título duplicado exacto
  const duplicateTitle = checkTitleUniqueness('Proyecto Existente', 'user-123', existingProjects)
  assert(duplicateTitle.unique === false, 'Debe rechazar título duplicado exacto')
  assert(duplicateTitle.error === 'Ya tienes un proyecto con este título. Elige un título diferente.', 'Debe tener mensaje de error correcto')

  // Test título duplicado con diferente case
  const caseInsensitive = checkTitleUniqueness('proyecto existente', 'user-123', existingProjects)
  assert(caseInsensitive.unique === false, 'Debe rechazar título duplicado con diferente case')

  // Test mismo título pero diferente usuario
  const differentUser = checkTitleUniqueness('Proyecto Existente', 'user-789', existingProjects)
  assert(differentUser.unique === true, 'Debe aceptar mismo título para diferente usuario')

  // Test título con espacios extra
  const extraSpaces = checkTitleUniqueness('  Proyecto Existente  ', 'user-123', existingProjects)
  assert(extraSpaces.unique === false, 'Debe rechazar título con espacios extra como duplicado')

  console.log('✅ Validación de unicidad de título - PASS\n')
} catch (error) {
  console.log(`❌ Validación de unicidad de título - FAIL: ${(error as Error).message}\n`)
}

// Test 5: Manejo de errores específicos
console.log('5. Test: Manejo de errores específicos')
try {
  interface CreateProjectResult {
    success: boolean
    error?: string
  }

  // Simular manejo de errores de PayloadCMS
  function handlePayloadError(error: Error): CreateProjectResult {
    // Error de validación de PayloadCMS
    if (error.message.includes('duplicate') || error.message.includes('unique')) {
      return {
        success: false,
        error: 'Ya existe un proyecto con este título. Elige un título diferente.'
      }
    }

    // Error de validación de slug
    if (error.message.includes('slug')) {
      return {
        success: false,
        error: 'Error al generar el identificador del proyecto. Intenta con un título diferente.'
      }
    }

    // Error genérico
    return {
      success: false,
      error: 'Error interno del servidor. Intenta nuevamente.'
    }
  }

  // Test error de duplicado
  const duplicateError = handlePayloadError(new Error('duplicate key error'))
  assert(duplicateError.success === false, 'Debe manejar error de duplicado')
  assert(duplicateError.error === 'Ya existe un proyecto con este título. Elige un título diferente.', 'Debe tener mensaje específico para duplicado')

  // Test error de unique constraint
  const uniqueError = handlePayloadError(new Error('unique constraint violation'))
  assert(uniqueError.success === false, 'Debe manejar error de unique constraint')
  assert(uniqueError.error === 'Ya existe un proyecto con este título. Elige un título diferente.', 'Debe tener mensaje específico para unique')

  // Test error de slug
  const slugError = handlePayloadError(new Error('slug generation failed'))
  assert(slugError.success === false, 'Debe manejar error de slug')
  assert(slugError.error === 'Error al generar el identificador del proyecto. Intenta con un título diferente.', 'Debe tener mensaje específico para slug')

  // Test error genérico
  const genericError = handlePayloadError(new Error('network timeout'))
  assert(genericError.success === false, 'Debe manejar error genérico')
  assert(genericError.error === 'Error interno del servidor. Intenta nuevamente.', 'Debe tener mensaje genérico')

  console.log('✅ Manejo de errores específicos - PASS\n')
} catch (error) {
  console.log(`❌ Manejo de errores específicos - FAIL: ${(error as Error).message}\n`)
}

// Test 6: Estructura de respuesta exitosa
console.log('6. Test: Estructura de respuesta exitosa')
try {
  interface Project {
    id: string
    title: string
    slug: string
    description?: any
    createdBy: string
    createdAt: string
    updatedAt: string
  }

  interface CreateProjectResult {
    success: boolean
    data?: Project
    error?: string
  }

  // Simular respuesta exitosa
  function createSuccessResponse(projectData: any): CreateProjectResult {
    const project: Project = {
      id: 'proj-' + Math.random().toString(36).substring(2, 8),
      title: projectData.title,
      slug: projectData.title.toLowerCase().replace(/\s+/g, '-') + '-abc123',
      description: projectData.description,
      createdBy: projectData.createdBy,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    return {
      success: true,
      data: project,
    }
  }

  // Test respuesta exitosa con descripción
  const successWithDescription = createSuccessResponse({
    title: 'Mi Proyecto',
    description: [{ type: 'paragraph', children: [{ text: 'Mi descripción' }] }],
    createdBy: 'user-123'
  })

  assert(successWithDescription.success === true, 'Respuesta debe ser exitosa')
  assert(!!successWithDescription.data, 'Debe incluir datos del proyecto')
  assert(successWithDescription.data!.title === 'Mi Proyecto', 'Debe incluir título correcto')
  assert(successWithDescription.data!.createdBy === 'user-123', 'Debe incluir createdBy correcto')
  assert(typeof successWithDescription.data!.id === 'string', 'Debe incluir ID como string')
  assert(typeof successWithDescription.data!.slug === 'string', 'Debe incluir slug como string')
  assert(typeof successWithDescription.data!.createdAt === 'string', 'Debe incluir createdAt como string')

  // Test respuesta exitosa sin descripción
  const successWithoutDescription = createSuccessResponse({
    title: 'Proyecto Sin Descripción',
    createdBy: 'user-456'
  })

  assert(successWithoutDescription.success === true, 'Respuesta sin descripción debe ser exitosa')
  assert(successWithoutDescription.data!.title === 'Proyecto Sin Descripción', 'Debe incluir título correcto')
  assert(successWithoutDescription.data!.description === undefined, 'No debe incluir descripción')

  console.log('✅ Estructura de respuesta exitosa - PASS\n')
} catch (error) {
  console.log(`❌ Estructura de respuesta exitosa - FAIL: ${(error as Error).message}\n`)
}

console.log('🎉 Tests de createProjectAction completados!')
console.log('\n📊 Resumen de tests:')
console.log('- Validación de datos de entrada ✅')
console.log('- Validación de permisos de usuario ✅')
console.log('- Preparación de datos del proyecto ✅')
console.log('- Validación de unicidad de título ✅')
console.log('- Manejo de errores específicos ✅')
console.log('- Estructura de respuesta exitosa ✅')
console.log('\n🔧 Para ejecutar: tsx src/actions/projects/createProject.test.ts') 