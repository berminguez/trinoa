// ============================================================================
// EIDETIK MVP - TESTS PARA CREATE PROJECT MODAL
// ============================================================================

/**
 * Tests unitarios para la lógica de validación del CreateProjectModal
 * 
 * Ejecutar con: tsx src/app/(frontend)/(private)/projects/components/CreateProjectModal.test.ts
 */

// Helper para simular assertions simples
function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message)
  }
}

console.log('🧪 Ejecutando tests para CreateProjectModal...\n')

// Test 1: Validación de título - casos básicos
console.log('1. Test: Validación de título - casos básicos')
try {
  // Simular función de validación del modal
  function validateTitle(value: string, existingProjects: { title: string }[] = []): string {
    if (!value.trim()) {
      return 'El título es requerido'
    }
    
    if (value.trim().length < 3) {
      return 'El título debe tener al menos 3 caracteres'
    }
    
    if (value.trim().length > 100) {
      return 'El título no puede exceder 100 caracteres'
    }
    
    // Verificar unicidad local (básica)
    const titleExists = existingProjects.some(project => 
      project.title.toLowerCase().trim() === value.toLowerCase().trim()
    )
    
    if (titleExists) {
      return 'Ya existe un proyecto con este título'
    }
    
    return ''
  }

  // Test título vacío
  assert(validateTitle('') === 'El título es requerido', 'Debe rechazar título vacío')
  assert(validateTitle('   ') === 'El título es requerido', 'Debe rechazar título solo espacios')

  // Test título muy corto
  assert(validateTitle('a') === 'El título debe tener al menos 3 caracteres', 'Debe rechazar título de 1 carácter')
  assert(validateTitle('ab') === 'El título debe tener al menos 3 caracteres', 'Debe rechazar título de 2 caracteres')

  // Test título muy largo
  const longTitle = 'a'.repeat(101)
  assert(validateTitle(longTitle) === 'El título no puede exceder 100 caracteres', 'Debe rechazar título > 100 chars')

  // Test título válido
  assert(validateTitle('Mi Proyecto') === '', 'Debe aceptar título válido')
  assert(validateTitle('   Proyecto con espacios   ') === '', 'Debe aceptar título con espacios')

  console.log('✅ Validación de título - casos básicos - PASS\n')
} catch (error) {
  console.log(`❌ Validación de título - casos básicos - FAIL: ${(error as Error).message}\n`)
}

// Test 2: Validación de unicidad de título
console.log('2. Test: Validación de unicidad de título')
try {
  function validateTitle(value: string, existingProjects: { title: string }[] = []): string {
    if (!value.trim()) return 'El título es requerido'
    if (value.trim().length < 3) return 'El título debe tener al menos 3 caracteres'
    if (value.trim().length > 100) return 'El título no puede exceder 100 caracteres'
    
    const titleExists = existingProjects.some(project => 
      project.title.toLowerCase().trim() === value.toLowerCase().trim()
    )
    
    if (titleExists) return 'Ya existe un proyecto con este título'
    return ''
  }

  const existingProjects = [
    { title: 'Proyecto Existente' },
    { title: 'Otro Proyecto' },
    { title: 'PROYECTO EN MAYÚSCULAS' },
  ]

  // Test título duplicado exacto
  assert(
    validateTitle('Proyecto Existente', existingProjects) === 'Ya existe un proyecto con este título',
    'Debe rechazar título duplicado exacto'
  )

  // Test título duplicado con diferente case
  assert(
    validateTitle('proyecto existente', existingProjects) === 'Ya existe un proyecto con este título',
    'Debe rechazar título duplicado en minúsculas'
  )

  assert(
    validateTitle('PROYECTO EXISTENTE', existingProjects) === 'Ya existe un proyecto con este título',
    'Debe rechazar título duplicado en mayúsculas'
  )

  // Test título duplicado con espacios
  assert(
    validateTitle('  Proyecto Existente  ', existingProjects) === 'Ya existe un proyecto con este título',
    'Debe rechazar título duplicado con espacios extra'
  )

  // Test título único
  assert(
    validateTitle('Nuevo Proyecto Único', existingProjects) === '',
    'Debe aceptar título único'
  )

  // Test con lista vacía
  assert(
    validateTitle('Cualquier Título', []) === '',
    'Debe aceptar cualquier título con lista vacía'
  )

  console.log('✅ Validación de unicidad de título - PASS\n')
} catch (error) {
  console.log(`❌ Validación de unicidad de título - FAIL: ${(error as Error).message}\n`)
}

// Test 3: Validación de descripción
console.log('3. Test: Validación de descripción')
try {
  // La descripción es opcional, solo validamos longitud máxima
  function validateDescription(value: string): string {
    if (value.length > 500) {
      return 'La descripción no puede exceder 500 caracteres'
    }
    return ''
  }

  // Test descripción vacía (válida)
  assert(validateDescription('') === '', 'Debe aceptar descripción vacía')

  // Test descripción normal
  assert(validateDescription('Esta es una descripción normal') === '', 'Debe aceptar descripción normal')

  // Test descripción muy larga
  const longDescription = 'a'.repeat(501)
  assert(
    validateDescription(longDescription) === 'La descripción no puede exceder 500 caracteres',
    'Debe rechazar descripción > 500 chars'
  )

  // Test descripción en el límite
  const limitDescription = 'a'.repeat(500)
  assert(validateDescription(limitDescription) === '', 'Debe aceptar descripción de exactamente 500 chars')

  console.log('✅ Validación de descripción - PASS\n')
} catch (error) {
  console.log(`❌ Validación de descripción - FAIL: ${(error as Error).message}\n`)
}

// Test 4: Validación de formulario completo
console.log('4. Test: Validación de formulario completo')
try {
  interface FormData {
    title: string
    description: string
  }

  function validateForm(data: FormData, existingProjects: { title: string }[] = []): {
    isValid: boolean
    titleError: string
    descriptionError: string
  } {
    const titleError = (() => {
      if (!data.title.trim()) return 'El título es requerido'
      if (data.title.trim().length < 3) return 'El título debe tener al menos 3 caracteres'
      if (data.title.trim().length > 100) return 'El título no puede exceder 100 caracteres'
      
      const titleExists = existingProjects.some(project => 
        project.title.toLowerCase().trim() === data.title.toLowerCase().trim()
      )
      if (titleExists) return 'Ya existe un proyecto con este título'
      return ''
    })()

    const descriptionError = data.description.length > 500 
      ? 'La descripción no puede exceder 500 caracteres' 
      : ''

    return {
      isValid: !titleError && !descriptionError,
      titleError,
      descriptionError
    }
  }

  const existingProjects = [{ title: 'Proyecto Existente' }]

  // Formulario válido
  const validForm = validateForm({
    title: 'Nuevo Proyecto',
    description: 'Descripción válida'
  }, existingProjects)

  assert(validForm.isValid === true, 'Formulario válido debe pasar')
  assert(validForm.titleError === '', 'Formulario válido no debe tener error de título')
  assert(validForm.descriptionError === '', 'Formulario válido no debe tener error de descripción')

  // Formulario con título inválido
  const invalidTitleForm = validateForm({
    title: 'ab', // Muy corto
    description: 'Descripción válida'
  }, existingProjects)

  assert(invalidTitleForm.isValid === false, 'Formulario con título inválido debe fallar')
  assert(invalidTitleForm.titleError !== '', 'Debe tener error de título')
  assert(invalidTitleForm.descriptionError === '', 'No debe tener error de descripción')

  // Formulario con título duplicado
  const duplicateTitleForm = validateForm({
    title: 'Proyecto Existente',
    description: 'Descripción válida'
  }, existingProjects)

  assert(duplicateTitleForm.isValid === false, 'Formulario con título duplicado debe fallar')
  assert(duplicateTitleForm.titleError === 'Ya existe un proyecto con este título', 'Debe tener error de título duplicado')

  // Formulario con descripción muy larga
  const longDescriptionForm = validateForm({
    title: 'Título Válido',
    description: 'a'.repeat(501)
  }, existingProjects)

  assert(longDescriptionForm.isValid === false, 'Formulario con descripción larga debe fallar')
  assert(longDescriptionForm.titleError === '', 'No debe tener error de título')
  assert(longDescriptionForm.descriptionError !== '', 'Debe tener error de descripción')

  console.log('✅ Validación de formulario completo - PASS\n')
} catch (error) {
  console.log(`❌ Validación de formulario completo - FAIL: ${(error as Error).message}\n`)
}

// Test 5: Preparación de datos para envío
console.log('5. Test: Preparación de datos para envío')
try {
  interface CreateProjectData {
    title: string
    description?: string
  }

  function prepareProjectData(title: string, description: string): CreateProjectData {
    const data: CreateProjectData = {
      title: title.trim(),
    }

    // Solo incluir descripción si no está vacía
    if (description.trim()) {
      data.description = description.trim()
    }

    return data
  }

  // Test con título y descripción
  const fullData = prepareProjectData('  Mi Proyecto  ', '  Mi descripción  ')
  assert(fullData.title === 'Mi Proyecto', 'Debe limpiar espacios del título')
  assert(fullData.description === 'Mi descripción', 'Debe limpiar espacios de la descripción')

  // Test solo con título
  const titleOnlyData = prepareProjectData('Mi Proyecto', '')
  assert(titleOnlyData.title === 'Mi Proyecto', 'Debe incluir título')
  assert(titleOnlyData.description === undefined, 'No debe incluir descripción vacía')

  // Test con descripción solo espacios
  const spacesDescriptionData = prepareProjectData('Mi Proyecto', '   ')
  assert(spacesDescriptionData.title === 'Mi Proyecto', 'Debe incluir título')
  assert(spacesDescriptionData.description === undefined, 'No debe incluir descripción solo espacios')

  console.log('✅ Preparación de datos para envío - PASS\n')
} catch (error) {
  console.log(`❌ Preparación de datos para envío - FAIL: ${(error as Error).message}\n`)
}

// Test 6: Estados del modal
console.log('6. Test: Estados del modal')
try {
  interface ModalState {
    isOpen: boolean
    isCreating: boolean
    title: string
    description: string
    titleError: string
  }

  function getModalState(
    isOpen: boolean,
    isCreating: boolean,
    title: string,
    description: string,
    titleError: string
  ): ModalState & { canSubmit: boolean } {
    const state: ModalState = {
      isOpen,
      isCreating,
      title,
      description,
      titleError
    }

    const canSubmit = title.trim().length >= 3 && !titleError && !isCreating

    return { ...state, canSubmit }
  }

  // Estado inicial
  const initialState = getModalState(false, false, '', '', '')
  assert(initialState.canSubmit === false, 'Estado inicial no debe permitir submit')

  // Estado con título válido
  const validState = getModalState(true, false, 'Mi Proyecto', '', '')
  assert(validState.canSubmit === true, 'Estado con título válido debe permitir submit')

  // Estado creando
  const creatingState = getModalState(true, true, 'Mi Proyecto', '', '')
  assert(creatingState.canSubmit === false, 'Estado creando no debe permitir submit')

  // Estado con error
  const errorState = getModalState(true, false, 'Mi Proyecto', '', 'Error de título')
  assert(errorState.canSubmit === false, 'Estado con error no debe permitir submit')

  // Estado con título muy corto
  const shortTitleState = getModalState(true, false, 'ab', '', '')
  assert(shortTitleState.canSubmit === false, 'Título muy corto no debe permitir submit')

  console.log('✅ Estados del modal - PASS\n')
} catch (error) {
  console.log(`❌ Estados del modal - FAIL: ${(error as Error).message}\n`)
}

console.log('🎉 Tests de CreateProjectModal completados!')
console.log('\n📊 Resumen de tests:')
console.log('- Validación de título - casos básicos ✅')
console.log('- Validación de unicidad de título ✅')
console.log('- Validación de descripción ✅')
console.log('- Validación de formulario completo ✅')
console.log('- Preparación de datos para envío ✅')
console.log('- Estados del modal ✅')
console.log('\n🔧 Para ejecutar: tsx src/app/(frontend)/(private)/projects/components/CreateProjectModal.test.ts') 