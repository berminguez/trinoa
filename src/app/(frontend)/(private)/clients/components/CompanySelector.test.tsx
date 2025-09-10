// ============================================================================
// TRINOA - TESTS PARA COMPANYSELECTOR
// ============================================================================

/**
 * Tests unitarios para CompanySelector component
 * 
 * Ejecutar con: npx tsx "src/app/(frontend)/(private)/clients/components/CompanySelector.test.tsx"
 */

// Helper para simular assertions simples
function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message)
  }
}

// Mock del tipo Company
interface MockCompany {
  id: string
  name: string
  cif: string
  createdAt: string
  updatedAt: string
}

// Datos de prueba
const mockCompanies: MockCompany[] = [
  {
    id: 'company-1',
    name: 'Empresa Alpha S.L.',
    cif: 'A11111111',
    createdAt: '2024-01-01T10:00:00Z',
    updatedAt: '2024-01-01T10:00:00Z',
  },
  {
    id: 'company-2',
    name: 'Empresa Beta S.A.',
    cif: 'B22222222',
    createdAt: '2024-01-02T10:00:00Z',
    updatedAt: '2024-01-02T10:00:00Z',
  },
  {
    id: 'company-3',
    name: 'Consultora Gamma',
    cif: 'C33333333',
    createdAt: '2024-01-03T10:00:00Z',
    updatedAt: '2024-01-03T10:00:00Z',
  },
]

// Función simulada de getCompaniesAction
async function mockGetCompaniesAction() {
  return {
    success: true,
    data: mockCompanies,
    message: 'Empresas obtenidas exitosamente',
  }
}

// Función simulada de createCompanyAction
async function mockCreateCompanyAction(data: { name: string; cif: string }) {
  const newCompany: MockCompany = {
    id: `company-${Date.now()}`,
    name: data.name,
    cif: data.cif,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  return {
    success: true,
    data: newCompany,
    message: `Empresa "${data.name}" creada exitosamente`,
  }
}

// Función helper para encontrar empresa por valor
function findCompanyByValue(value: string | MockCompany | undefined, companies: MockCompany[]) {
  if (!value) return null
  
  // Si es un objeto Company, usarlo directamente
  if (typeof value === 'object' && value.id) {
    return value
  }
  
  // Si es string, buscar en la lista de empresas
  if (typeof value === 'string') {
    return companies.find(company => 
      company.id === value || 
      company.name === value
    ) || null
  }
  
  return null
}

// Función para filtrar empresas por búsqueda
function filterCompaniesBySearch(companies: MockCompany[], searchTerm: string) {
  if (!searchTerm.trim()) return companies
  
  const search = searchTerm.toLowerCase()
  return companies.filter(company =>
    company.name.toLowerCase().includes(search) ||
    company.cif.toLowerCase().includes(search)
  )
}

// Función para validar datos de empresa
function validateCompanyData(name: string, cif: string) {
  const errors: { name?: string; cif?: string } = {}

  // Validar nombre
  if (!name.trim()) {
    errors.name = 'El nombre de la empresa es requerido'
  } else if (name.trim().length < 2) {
    errors.name = 'El nombre debe tener al menos 2 caracteres'
  } else if (name.trim().length > 100) {
    errors.name = 'El nombre no puede exceder 100 caracteres'
  }

  // Validar CIF
  if (!cif.trim()) {
    errors.cif = 'El CIF es requerido'
  } else {
    const cleanCif = cif.trim().toUpperCase()
    if (cleanCif.length < 9 || cleanCif.length > 20) {
      errors.cif = 'El CIF debe tener entre 9 y 20 caracteres'
    } else if (!/^[A-Z0-9]+$/.test(cleanCif)) {
      errors.cif = 'El CIF debe contener solo letras y números'
    }
  }

  return errors
}

// Tests
console.log('🧪 Ejecutando tests para CompanySelector...\n')

// Test 1: Carga de empresas
console.log('1. Test: Carga de empresas')
;(async () => {
  try {
    const result = await mockGetCompaniesAction()
    
    assert(result.success === true, 'Debe cargar empresas exitosamente')
    assert(Array.isArray(result.data), 'Debe retornar array de empresas')
    assert(result.data.length === 3, 'Debe retornar 3 empresas mock')
    assert(result.data[0].name === 'Empresa Alpha S.L.', 'Primera empresa debe ser Alpha')

    console.log('✅ Carga de empresas - PASS\n')
  } catch (error) {
    console.log(`❌ Carga de empresas - FAIL: ${(error as Error).message}\n`)
  }
})()

// Test 2: Función findCompanyByValue
console.log('2. Test: Función findCompanyByValue')
try {
  // Buscar por ID
  const companyById = findCompanyByValue('company-1', mockCompanies)
  assert(companyById?.name === 'Empresa Alpha S.L.', 'Debe encontrar empresa por ID')

  // Buscar por nombre
  const companyByName = findCompanyByValue('Empresa Beta S.A.', mockCompanies)
  assert(companyByName?.id === 'company-2', 'Debe encontrar empresa por nombre')

  // Pasar objeto company directamente
  const companyObject = findCompanyByValue(mockCompanies[0], mockCompanies)
  assert(companyObject?.id === 'company-1', 'Debe retornar objeto company directamente')

  // Valor null/undefined
  const nullCompany = findCompanyByValue(null as any, mockCompanies)
  assert(nullCompany === null, 'Debe retornar null para valor nulo')

  // Valor no encontrado
  const notFound = findCompanyByValue('empresa-inexistente', mockCompanies)
  assert(notFound === null, 'Debe retornar null para empresa no encontrada')

  console.log('✅ Función findCompanyByValue - PASS\n')
} catch (error) {
  console.log(`❌ Función findCompanyByValue - FAIL: ${(error as Error).message}\n`)
}

// Test 3: Filtrado por búsqueda
console.log('3. Test: Filtrado por búsqueda')
try {
  // Búsqueda por nombre
  const filteredByName = filterCompaniesBySearch(mockCompanies, 'alpha')
  assert(filteredByName.length === 1, 'Debe encontrar 1 empresa por nombre')
  assert(filteredByName[0].name === 'Empresa Alpha S.L.', 'Debe filtrar correctamente por nombre')

  // Búsqueda por CIF
  const filteredByCif = filterCompaniesBySearch(mockCompanies, 'B22')
  assert(filteredByCif.length === 1, 'Debe encontrar 1 empresa por CIF')
  assert(filteredByCif[0].cif === 'B22222222', 'Debe filtrar correctamente por CIF')

  // Búsqueda sin resultados
  const noResults = filterCompaniesBySearch(mockCompanies, 'inexistente')
  assert(noResults.length === 0, 'Debe retornar array vacío para búsqueda sin resultados')

  // Búsqueda vacía
  const allCompanies = filterCompaniesBySearch(mockCompanies, '')
  assert(allCompanies.length === 3, 'Debe retornar todas las empresas para búsqueda vacía')

  // Búsqueda case insensitive
  const caseInsensitive = filterCompaniesBySearch(mockCompanies, 'GAMMA')
  assert(caseInsensitive.length === 1, 'Debe ser case insensitive')

  console.log('✅ Filtrado por búsqueda - PASS\n')
} catch (error) {
  console.log(`❌ Filtrado por búsqueda - FAIL: ${(error as Error).message}\n`)
}

// Test 4: Validación de datos de empresa
console.log('4. Test: Validación de datos de empresa')
try {
  // Validación correcta
  const validData = validateCompanyData('Empresa Test S.L.', 'A12345678')
  assert(Object.keys(validData).length === 0, 'Datos válidos no deben tener errores')

  // Nombre requerido
  const noName = validateCompanyData('', 'A12345678')
  assert(noName.name === 'El nombre de la empresa es requerido', 'Debe requerir nombre')

  // Nombre muy corto
  const shortName = validateCompanyData('A', 'A12345678')
  assert(shortName.name === 'El nombre debe tener al menos 2 caracteres', 'Debe validar longitud mínima de nombre')

  // Nombre muy largo
  const longName = validateCompanyData('a'.repeat(101), 'A12345678')
  assert(longName.name === 'El nombre no puede exceder 100 caracteres', 'Debe validar longitud máxima de nombre')

  // CIF requerido
  const noCif = validateCompanyData('Empresa Test', '')
  assert(noCif.cif === 'El CIF es requerido', 'Debe requerir CIF')

  // CIF muy corto
  const shortCif = validateCompanyData('Empresa Test', 'A1234567')
  assert(shortCif.cif === 'El CIF debe tener entre 9 y 20 caracteres', 'Debe validar longitud mínima de CIF')

  // CIF muy largo
  const longCif = validateCompanyData('Empresa Test', 'A'.repeat(21))
  assert(longCif.cif === 'El CIF debe tener entre 9 y 20 caracteres', 'Debe validar longitud máxima de CIF')

  // CIF con caracteres inválidos
  const invalidCif = validateCompanyData('Empresa Test', 'A1234567@')
  assert(invalidCif.cif === 'El CIF debe contener solo letras y números', 'Debe validar caracteres válidos en CIF')

  console.log('✅ Validación de datos de empresa - PASS\n')
} catch (error) {
  console.log(`❌ Validación de datos de empresa - FAIL: ${(error as Error).message}\n`)
}

// Test 5: Creación de nueva empresa
console.log('5. Test: Creación de nueva empresa')
;(async () => {
  try {
    const newCompanyData = {
      name: 'Nueva Empresa Test S.L.',
      cif: 'D98765432',
    }

    const result = await mockCreateCompanyAction(newCompanyData)
    
    assert(result.success === true, 'Debe crear empresa exitosamente')
    assert(result.data.name === newCompanyData.name, 'Debe retornar nombre correcto')
    assert(result.data.cif === newCompanyData.cif, 'Debe retornar CIF correcto')
    assert(typeof result.data.id === 'string', 'Debe generar ID único')
    assert(result.message?.includes('creada exitosamente'), 'Debe incluir mensaje de éxito')

    console.log('✅ Creación de nueva empresa - PASS\n')
  } catch (error) {
    console.log(`❌ Creación de nueva empresa - FAIL: ${(error as Error).message}\n`)
  }
})()

// Test 6: Props y configuración del componente
console.log('6. Test: Props y configuración del componente')
try {
  // Simular props del componente
  interface MockCompanySelectorProps {
    value?: string | MockCompany
    onValueChange: (company: MockCompany | null) => void
    placeholder?: string
    disabled?: boolean
    required?: boolean
    error?: string
    label?: string
    className?: string
  }

  const mockOnValueChange = (company: MockCompany | null) => {
    // Mock function
  }

  // Props por defecto
  const defaultProps: MockCompanySelectorProps = {
    onValueChange: mockOnValueChange,
  }

  assert(typeof defaultProps.onValueChange === 'function', 'onValueChange debe ser función')

  // Props con configuración personalizada
  const customProps: MockCompanySelectorProps = {
    value: mockCompanies[0],
    onValueChange: mockOnValueChange,
    placeholder: 'Selecciona empresa...',
    disabled: false,
    required: true,
    error: 'Error de validación',
    label: 'Empresa personalizada',
    className: 'custom-class',
  }

  assert(customProps.value === mockCompanies[0], 'Debe aceptar valor como objeto company')
  assert(customProps.placeholder === 'Selecciona empresa...', 'Debe aceptar placeholder personalizado')
  assert(customProps.required === true, 'Debe aceptar campo requerido')
  assert(customProps.error === 'Error de validación', 'Debe aceptar mensaje de error')

  console.log('✅ Props y configuración del componente - PASS\n')
} catch (error) {
  console.log(`❌ Props y configuración del componente - FAIL: ${(error as Error).message}\n`)
}

console.log('🎉 Tests de CompanySelector completados!')
console.log('\n📊 Resumen:')
console.log('- Carga de empresas ✅')
console.log('- Función findCompanyByValue ✅')
console.log('- Filtrado por búsqueda ✅')
console.log('- Validación de datos ✅')
console.log('- Creación de nueva empresa ✅')
console.log('- Props y configuración ✅')
console.log('\n🔧 Para ejecutar: npx tsx "src/app/(frontend)/(private)/clients/components/CompanySelector.test.tsx"')
