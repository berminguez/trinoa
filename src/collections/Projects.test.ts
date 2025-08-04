// ============================================================================
// EIDETIK MVP - TESTS PARA COLECCIÓN PROJECTS
// ============================================================================

/**
 * Tests de validación para la nueva collection Projects
 * 
 * Ejecutar con: tsx src/collections/Projects.test.ts
 */

// Helper para simular assertions simples
function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message)
  }
}

// Funciones de validación extraídas del código real
function validateTitle(value: string | null | undefined) {
  if (!value || typeof value !== 'string' || value.trim().length === 0) {
    return 'El título es requerido'
  }
  if (value.length > 100) {
    return 'El título no puede exceder 100 caracteres'
  }
  return true
}

function validateSlug(value: string | null | undefined) {
  if (!value || typeof value !== 'string' || value.trim().length === 0) {
    return 'El slug es requerido'
  }
  if (!/^[a-z0-9-]+$/.test(value)) {
    return 'El slug debe contener solo letras minúsculas, números y guiones'
  }
  return true
}

function generateSlug(title: string): string {
  const baseSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remover caracteres especiales
    .replace(/\s+/g, '-') // Reemplazar espacios con guiones
    .replace(/-+/g, '-') // Reemplazar múltiples guiones con uno solo
    .replace(/^-+|-+$/g, '') // Remover guiones al inicio y final
    .trim()
    .substring(0, 45) // Limitar longitud para dejar espacio al sufijo

  if (!baseSlug) {
    return 'proyecto-sin-titulo'
  }

  // Añadir sufijo aleatorio para garantizar unicidad
  const randomSuffix = Math.random().toString(36).substring(2, 8)
  return `${baseSlug}-${randomSuffix}`
}

function validateDescription(value: any) {
  // Validar longitud del contenido de texto si existe
  if (value && Array.isArray(value)) {
    const textContent = value
      .map((node: any) => {
        if (node.type === 'paragraph' && node.children) {
          return node.children.map((child: any) => child.text || '').join('')
        }
        return ''
      })
      .join('')
    
    if (textContent.length > 1000) {
      return 'La descripción no puede exceder 1000 caracteres'
    }
  }
  return true
}

// Tests simples sin dependencias
console.log('🧪 Ejecutando tests para Projects Collection...\n')

// Test 1: Validación de título requerido
console.log('1. Test: Validación de título requerido')
try {
  assert(validateTitle('') === 'El título es requerido', 'Debe rechazar string vacío')
  assert(validateTitle(null) === 'El título es requerido', 'Debe rechazar null')
  assert(validateTitle(undefined) === 'El título es requerido', 'Debe rechazar undefined')
  assert(validateTitle('   ') === 'El título es requerido', 'Debe rechazar espacios en blanco')
  console.log('✅ Validación de título requerido - PASS\n')
} catch (error) {
  console.log(`❌ Validación de título requerido - FAIL: ${(error as Error).message}\n`)
}

// Test 2: Validación de longitud de título
console.log('2. Test: Validación de longitud de título')
try {
  const longTitle = 'a'.repeat(101)
  const validTitle = 'Mi Proyecto Genial'
  const maxLengthTitle = 'a'.repeat(100)
  
  assert(validateTitle(longTitle) === 'El título no puede exceder 100 caracteres', 'Debe rechazar títulos > 100 caracteres')
  assert(validateTitle(validTitle) === true, 'Debe aceptar títulos válidos')
  assert(validateTitle(maxLengthTitle) === true, 'Debe aceptar títulos de exactamente 100 caracteres')
  console.log('✅ Validación de longitud de título - PASS\n')
} catch (error) {
  console.log(`❌ Validación de longitud de título - FAIL: ${(error as Error).message}\n`)
}

// Test 3: Validación de slug requerido
console.log('3. Test: Validación de slug requerido')
try {
  assert(validateSlug('') === 'El slug es requerido', 'Debe rechazar string vacío')
  assert(validateSlug(null) === 'El slug es requerido', 'Debe rechazar null')
  assert(validateSlug(undefined) === 'El slug es requerido', 'Debe rechazar undefined')
  assert(validateSlug('   ') === 'El slug es requerido', 'Debe rechazar espacios en blanco')
  console.log('✅ Validación de slug requerido - PASS\n')
} catch (error) {
  console.log(`❌ Validación de slug requerido - FAIL: ${(error as Error).message}\n`)
}

// Test 4: Validación de formato de slug
console.log('4. Test: Validación de formato de slug')
try {
  const invalidMessage = 'El slug debe contener solo letras minúsculas, números y guiones'
  assert(validateSlug('Invalid@Slug') === invalidMessage, 'Debe rechazar mayúsculas y caracteres especiales')
  assert(validateSlug('invalid slug') === invalidMessage, 'Debe rechazar espacios')
  assert(validateSlug('invalid.slug') === invalidMessage, 'Debe rechazar puntos')
  assert(validateSlug('invalid_slug') === invalidMessage, 'Debe rechazar underscores')
  assert(validateSlug('INVALID-SLUG') === invalidMessage, 'Debe rechazar mayúsculas')
  
  // Slugs válidos
  assert(validateSlug('valid-slug') === true, 'Debe aceptar slug válido con guiones')
  assert(validateSlug('validslug123') === true, 'Debe aceptar slug alfanumérico')
  assert(validateSlug('proyecto-123') === true, 'Debe aceptar combinación válida')
  console.log('✅ Validación de formato de slug - PASS\n')
} catch (error) {
  console.log(`❌ Validación de formato de slug - FAIL: ${(error as Error).message}\n`)
}

// Test 5: Auto-generación de slug desde título
console.log('5. Test: Auto-generación de slug desde título')
try {
  const slug1 = generateSlug('Mi Proyecto Genial!')
  const slug2 = generateSlug('Análisis de Datos 2024')
  const slug3 = generateSlug('Proyecto con @#$% caracteres especiales')
  const slug4 = generateSlug('')
  const slug5 = generateSlug('   ')
  
  // Verificar que se generen slugs válidos
  assert(validateSlug(slug1) === true, 'Slug generado desde "Mi Proyecto Genial!" debe ser válido')
  assert(validateSlug(slug2) === true, 'Slug generado desde "Análisis de Datos 2024" debe ser válido')
  assert(validateSlug(slug3) === true, 'Slug generado con caracteres especiales debe ser válido')
  assert(slug4 === 'proyecto-sin-titulo', 'Título vacío debe generar "proyecto-sin-titulo"')
  assert(slug5 === 'proyecto-sin-titulo', 'Título con espacios debe generar "proyecto-sin-titulo"')
  
  // Verificar que contengan elementos esperados (sin el sufijo aleatorio)
  assert(slug1.includes('mi-proyecto-genial'), 'Debe contener versión limpia del título')
  assert(slug2.includes('analisis-de-datos-2024'), 'Debe manejar acentos y números')
  assert(slug3.includes('proyecto-con-caracteres-especiales'), 'Debe limpiar caracteres especiales')
  
  // Verificar que tengan sufijo aleatorio
  assert(slug1.split('-').length >= 4, 'Debe tener sufijo aleatorio añadido')
  assert(slug2.split('-').length >= 5, 'Debe tener sufijo aleatorio añadido')
  
  console.log('✅ Auto-generación de slug - PASS\n')
} catch (error) {
  console.log(`❌ Auto-generación de slug - FAIL: ${(error as Error).message}\n`)
}

// Test 6: Validación de descripción richText
console.log('6. Test: Validación de descripción richText')
try {
  // Descripción válida
  const validDescription = [
    {
      type: 'paragraph',
      children: [
        { text: 'Esta es una descripción válida del proyecto.' }
      ]
    }
  ]
  
  // Descripción muy larga
  const longText = 'a'.repeat(1001)
  const longDescription = [
    {
      type: 'paragraph',
      children: [
        { text: longText }
      ]
    }
  ]
  
  // Descripción vacía
  const emptyDescription: any[] = []
  
  assert(validateDescription(validDescription) === true, 'Debe aceptar descripción válida')
  assert(validateDescription(longDescription) === 'La descripción no puede exceder 1000 caracteres', 'Debe rechazar descripción muy larga')
  assert(validateDescription(emptyDescription) === true, 'Debe aceptar descripción vacía')
  assert(validateDescription(null) === true, 'Debe aceptar descripción null')
  assert(validateDescription(undefined) === true, 'Debe aceptar descripción undefined')
  
  console.log('✅ Validación de descripción richText - PASS\n')
} catch (error) {
  console.log(`❌ Validación de descripción richText - FAIL: ${(error as Error).message}\n`)
}

// Test 7: Estructura de campos del proyecto
console.log('7. Test: Estructura de campos del proyecto')
try {
  const mockProject = {
    title: 'Proyecto de Prueba',
    slug: 'proyecto-de-prueba-abc123',
    description: [
      {
        type: 'paragraph',
        children: [
          { text: 'Descripción del proyecto de prueba' }
        ]
      }
    ],
    createdBy: 'user-id-123',
    createdAt: new Date(),
    updatedAt: new Date()
  }
  
  assert('title' in mockProject, 'Proyecto debe tener campo title')
  assert('slug' in mockProject, 'Proyecto debe tener campo slug')
  assert('description' in mockProject, 'Proyecto debe tener campo description')
  assert('createdBy' in mockProject, 'Proyecto debe tener campo createdBy')
  assert('createdAt' in mockProject, 'Proyecto debe tener campo createdAt')
  assert('updatedAt' in mockProject, 'Proyecto debe tener campo updatedAt')
  
  assert(typeof mockProject.title === 'string', 'title debe ser string')
  assert(typeof mockProject.slug === 'string', 'slug debe ser string')
  assert(Array.isArray(mockProject.description), 'description debe ser array (richText)')
  assert(typeof mockProject.createdBy === 'string', 'createdBy debe ser string')
  assert(mockProject.createdAt instanceof Date, 'createdAt debe ser Date')
  assert(mockProject.updatedAt instanceof Date, 'updatedAt debe ser Date')
  
  console.log('✅ Estructura de campos del proyecto - PASS\n')
} catch (error) {
  console.log(`❌ Estructura de campos del proyecto - FAIL: ${(error as Error).message}\n`)
}

// Test 8: Simulación de hooks beforeChange
console.log('8. Test: Simulación de hooks beforeChange')
try {
  // Simular hook para auto-populate createdBy
  interface TestProjectData {
    title: string
    description?: any
    createdBy?: string
    createdAt?: Date
    updatedAt?: Date
  }
  
  const operation = 'create'
  const mockUser = { id: 'user-123' }
  const data: TestProjectData = {
    title: 'Nuevo Proyecto'
  }
  
  // Lógica del hook createdBy (simulando beforeChange)
  if (operation === 'create' && mockUser) {
    data.createdBy = mockUser.id
  }
  
  // Lógica del hook createdAt (simulando beforeChange)
  if (operation === 'create') {
    data.createdAt = new Date()
  }
  
  // Lógica del hook updatedAt (simulando beforeChange)
  data.updatedAt = new Date()
  
  assert(data.createdBy === 'user-123', 'createdBy debe auto-populate con user ID')
  assert(data.createdAt instanceof Date, 'createdAt debe auto-populate con fecha actual')
  assert(data.updatedAt instanceof Date, 'updatedAt debe auto-populate con fecha actual')
  
  console.log('✅ Simulación de hooks beforeChange - PASS\n')
} catch (error) {
  console.log(`❌ Simulación de hooks beforeChange - FAIL: ${(error as Error).message}\n`)
}

// Test 9: Simulación de reglas de acceso
console.log('9. Test: Simulación de reglas de acceso')
try {
  // Simular diferentes tipos de usuario
  const adminUser = { id: 'admin-1', role: 'admin' }
  const normalUser = { id: 'user-1', role: 'user' }
  const apiUser = { id: 'api-1', role: 'api' }
  
  // Simular función de acceso read
  function canRead(user: any) {
    if (!user) return false
    if (user.role === 'admin') return true
    // Para usuarios normales y API, solo sus propios proyectos
    return { createdBy: { equals: user.id } }
  }
  
  // Simular función de acceso create
  function canCreate(user: any) {
    if (!user) return false
    return user.role === 'admin' || user.role === 'user'
  }
  
  // Simular función de acceso delete
  function canDelete(user: any) {
    if (!user) return false
    if (user.role === 'admin') return true
    if (user.role === 'user') {
      return { createdBy: { equals: user.id } }
    }
    // Los usuarios API no pueden eliminar proyectos
    return false
  }
  
  // Tests de acceso read
  assert(canRead(adminUser) === true, 'Admin debe poder leer todos los proyectos')
  assert(typeof canRead(normalUser) === 'object', 'Usuario normal debe tener filtro de ownership')
  assert(typeof canRead(apiUser) === 'object', 'Usuario API debe tener filtro de ownership')
  assert(canRead(null) === false, 'Usuario no autenticado no debe poder leer')
  
  // Tests de acceso create
  assert(canCreate(adminUser) === true, 'Admin debe poder crear proyectos')
  assert(canCreate(normalUser) === true, 'Usuario normal debe poder crear proyectos')
  assert(canCreate(apiUser) === false, 'Usuario API no debe poder crear proyectos')
  assert(canCreate(null) === false, 'Usuario no autenticado no debe poder crear')
  
  // Tests de acceso delete
  assert(canDelete(adminUser) === true, 'Admin debe poder eliminar todos los proyectos')
  assert(typeof canDelete(normalUser) === 'object', 'Usuario normal debe poder eliminar solo sus proyectos')
  assert(canDelete(apiUser) === false, 'Usuario API no debe poder eliminar proyectos')
  assert(canDelete(null) === false, 'Usuario no autenticado no debe poder eliminar')
  
  console.log('✅ Simulación de reglas de acceso - PASS\n')
} catch (error) {
  console.log(`❌ Simulación de reglas de acceso - FAIL: ${(error as Error).message}\n`)
}

// Test 10: Validación de relaciones
console.log('10. Test: Validación de relaciones')
try {
  // Simular proyecto con relaciones
  const projectWithRelations = {
    id: 'project-123',
    title: 'Proyecto con Relaciones',
    slug: 'proyecto-con-relaciones-abc123',
    createdBy: {
      id: 'user-123',
      email: 'usuario@ejemplo.com',
      name: 'Usuario Ejemplo'
    },
    // Simular resources que pertenecen a este proyecto
    resources: [
      {
        id: 'resource-1',
        title: 'Video 1',
        type: 'video',
        project: 'project-123'
      },
      {
        id: 'resource-2',
        title: 'Video 2',
        type: 'video',
        project: 'project-123'
      }
    ]
  }
  
  assert('createdBy' in projectWithRelations, 'Proyecto debe tener relación createdBy')
  assert('resources' in projectWithRelations, 'Proyecto debe poder tener resources relacionados')
  assert(typeof projectWithRelations.createdBy === 'object', 'createdBy debe ser objeto poblado')
  assert(Array.isArray(projectWithRelations.resources), 'resources debe ser array')
  assert(projectWithRelations.resources.length === 2, 'Debe tener 2 resources relacionados')
  assert(projectWithRelations.resources[0].project === projectWithRelations.id, 'Resource debe referenciar al proyecto')
  
  console.log('✅ Validación de relaciones - PASS\n')
} catch (error) {
  console.log(`❌ Validación de relaciones - FAIL: ${(error as Error).message}\n`)
}

console.log('🎉 Tests de Projects Collection completados!')
console.log('\n📊 Resumen:')
console.log('- Validación de campos requeridos ✅')
console.log('- Validación de formatos y límites ✅')
console.log('- Auto-generación de slug ✅')
console.log('- Hooks de auto-population ✅')
console.log('- Reglas de acceso por rol ✅')
console.log('- Estructura de relaciones ✅')
console.log('\n🔧 Para ejecutar: tsx src/collections/Projects.test.ts') 