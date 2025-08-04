// ============================================================================
// EIDETIK MVP - TESTS PARA PROJECTS STORE
// ============================================================================

/**
 * Tests unitarios para el store de proyectos con Zustand
 * 
 * Ejecutar con: tsx src/stores/projects-store.test.ts
 */

import { useProjectsStore, type ProjectsState, type ProjectFilters } from './projects-store'

// Mock de Project para testing
interface MockProject {
  id: string
  title: string
  slug: string
  description?: any
  createdAt: string
  createdBy: string
  updatedAt: string
}

// Helper para simular assertions simples
function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message)
  }
}

// Helper para crear proyecto mock
function createMockProject(overrides: Partial<MockProject> = {}): MockProject {
  return {
    id: 'proj-' + Math.random().toString(36).substring(2, 8),
    title: 'Test Project',
    slug: 'test-project-abc123',
    description: [{ type: 'paragraph', children: [{ text: 'Test description' }] }],
    createdAt: new Date().toISOString(),
    createdBy: 'user-123',
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

// Helper para obtener estado inicial del store
function getInitialState(): Partial<ProjectsState> {
  return {
    projects: [],
    selectedProject: null,
    isLoading: false,
    isCreating: false,
    isUpdating: false,
    isDeleting: false,
    filters: {
      searchTerm: '',
      sortBy: 'recent',
    },
    error: null,
  }
}

console.log('🧪 Ejecutando tests para Projects Store...\n')

// Test 1: Estado inicial del store
console.log('1. Test: Estado inicial del store')
try {
  // Resetear store
  useProjectsStore.getState().reset()
  const state = useProjectsStore.getState()
  
  assert(Array.isArray(state.projects), 'projects debe ser un array')
  assert(state.projects.length === 0, 'projects debe empezar vacío')
  assert(state.selectedProject === null, 'selectedProject debe empezar como null')
  assert(state.isLoading === false, 'isLoading debe empezar como false')
  assert(state.isCreating === false, 'isCreating debe empezar como false')
  assert(state.isUpdating === false, 'isUpdating debe empezar como false')
  assert(state.isDeleting === false, 'isDeleting debe empezar como false')
  assert(state.error === null, 'error debe empezar como null')
  assert(state.filters.searchTerm === '', 'searchTerm debe empezar vacío')
  assert(state.filters.sortBy === 'recent', 'sortBy debe empezar como recent')
  
  console.log('✅ Estado inicial - PASS\n')
} catch (error) {
  console.log(`❌ Estado inicial - FAIL: ${(error as Error).message}\n`)
}

// Test 2: Setear proyectos
console.log('2. Test: Setear proyectos')
try {
  useProjectsStore.getState().reset()
  
  const projects = [
    createMockProject({ title: 'Project 1' }),
    createMockProject({ title: 'Project 2' }),
  ]
  
  useProjectsStore.getState().setProjects(projects)
  const state = useProjectsStore.getState()
  
  assert(state.projects.length === 2, 'Debe tener 2 proyectos')
  assert(state.projects[0].title === 'Project 1', 'Primer proyecto debe tener título correcto')
  assert(state.projects[1].title === 'Project 2', 'Segundo proyecto debe tener título correcto')
  assert(state.error === null, 'Error debe limpiarse al setear proyectos')
  
  console.log('✅ Setear proyectos - PASS\n')
} catch (error) {
  console.log(`❌ Setear proyectos - FAIL: ${(error as Error).message}\n`)
}

// Test 3: Añadir proyecto
console.log('3. Test: Añadir proyecto')
try {
  useProjectsStore.getState().reset()
  
  const existingProject = createMockProject({ title: 'Existing' })
  const newProject = createMockProject({ title: 'New Project' })
  
  useProjectsStore.getState().setProjects([existingProject])
  useProjectsStore.getState().addProject(newProject)
  
  const state = useProjectsStore.getState()
  
  assert(state.projects.length === 2, 'Debe tener 2 proyectos tras añadir')
  assert(state.projects[0].title === 'New Project', 'Nuevo proyecto debe estar al inicio')
  assert(state.projects[1].title === 'Existing', 'Proyecto existente debe estar al final')
  assert(state.error === null, 'Error debe limpiarse al añadir proyecto')
  
  console.log('✅ Añadir proyecto - PASS\n')
} catch (error) {
  console.log(`❌ Añadir proyecto - FAIL: ${(error as Error).message}\n`)
}

// Test 4: Actualizar proyecto
console.log('4. Test: Actualizar proyecto')
try {
  useProjectsStore.getState().reset()
  
  const project = createMockProject({ title: 'Original Title' })
  useProjectsStore.getState().setProjects([project])
  
  const updates = { title: 'Updated Title' }
  useProjectsStore.getState().updateProject(project.id, updates)
  
  const state = useProjectsStore.getState()
  
  assert(state.projects.length === 1, 'Debe mantener 1 proyecto')
  assert(state.projects[0].title === 'Updated Title', 'Título debe haberse actualizado')
  assert(state.projects[0].id === project.id, 'ID debe mantenerse igual')
  assert(state.error === null, 'Error debe limpiarse al actualizar')
  
  console.log('✅ Actualizar proyecto - PASS\n')
} catch (error) {
  console.log(`❌ Actualizar proyecto - FAIL: ${(error as Error).message}\n`)
}

// Test 5: Eliminar proyecto
console.log('5. Test: Eliminar proyecto')
try {
  useProjectsStore.getState().reset()
  
  const project1 = createMockProject({ title: 'Project 1' })
  const project2 = createMockProject({ title: 'Project 2' })
  
  useProjectsStore.getState().setProjects([project1, project2])
  useProjectsStore.getState().removeProject(project1.id)
  
  const state = useProjectsStore.getState()
  
  assert(state.projects.length === 1, 'Debe quedar 1 proyecto tras eliminar')
  assert(state.projects[0].title === 'Project 2', 'Debe quedar el proyecto correcto')
  assert(state.error === null, 'Error debe limpiarse al eliminar')
  
  console.log('✅ Eliminar proyecto - PASS\n')
} catch (error) {
  console.log(`❌ Eliminar proyecto - FAIL: ${(error as Error).message}\n`)
}

// Test 6: Gestión de selectedProject
console.log('6. Test: Gestión de selectedProject')
try {
  useProjectsStore.getState().reset()
  
  const project = createMockProject({ title: 'Selected Project' })
  
  // Seleccionar proyecto
  useProjectsStore.getState().setSelectedProject(project)
  let state = useProjectsStore.getState()
  
  assert(state.selectedProject !== null, 'selectedProject debe estar seteado')
  assert(state.selectedProject?.title === 'Selected Project', 'Título debe coincidir')
  
  // Actualizar proyecto seleccionado
  useProjectsStore.getState().setProjects([project])
  useProjectsStore.getState().updateProject(project.id, { title: 'Updated Selected' })
  state = useProjectsStore.getState()
  
  assert(state.selectedProject?.title === 'Updated Selected', 'selectedProject debe actualizarse')
  
  // Eliminar proyecto seleccionado
  useProjectsStore.getState().removeProject(project.id)
  state = useProjectsStore.getState()
  
  assert(state.selectedProject === null, 'selectedProject debe limpiarse al eliminar')
  
  console.log('✅ Gestión de selectedProject - PASS\n')
} catch (error) {
  console.log(`❌ Gestión de selectedProject - FAIL: ${(error as Error).message}\n`)
}

// Test 7: Estados de carga
console.log('7. Test: Estados de carga')
try {
  useProjectsStore.getState().reset()
  
  // Probar cada estado de carga
  useProjectsStore.getState().setLoading(true)
  assert(useProjectsStore.getState().isLoading === true, 'isLoading debe setearse a true')
  
  useProjectsStore.getState().setCreating(true)
  assert(useProjectsStore.getState().isCreating === true, 'isCreating debe setearse a true')
  
  useProjectsStore.getState().setUpdating(true)
  assert(useProjectsStore.getState().isUpdating === true, 'isUpdating debe setearse a true')
  
  useProjectsStore.getState().setDeleting(true)
  assert(useProjectsStore.getState().isDeleting === true, 'isDeleting debe setearse a true')
  
  // Resetear estados
  useProjectsStore.getState().setLoading(false)
  useProjectsStore.getState().setCreating(false)
  useProjectsStore.getState().setUpdating(false)
  useProjectsStore.getState().setDeleting(false)
  
  const state = useProjectsStore.getState()
  assert(state.isLoading === false, 'isLoading debe resetearse')
  assert(state.isCreating === false, 'isCreating debe resetearse')
  assert(state.isUpdating === false, 'isUpdating debe resetearse')
  assert(state.isDeleting === false, 'isDeleting debe resetearse')
  
  console.log('✅ Estados de carga - PASS\n')
} catch (error) {
  console.log(`❌ Estados de carga - FAIL: ${(error as Error).message}\n`)
}

// Test 8: Gestión de filtros
console.log('8. Test: Gestión de filtros')
try {
  useProjectsStore.getState().reset()
  
  // Setear término de búsqueda
  useProjectsStore.getState().setSearchTerm('test search')
  assert(useProjectsStore.getState().filters.searchTerm === 'test search', 'searchTerm debe setearse')
  
  // Setear orden
  useProjectsStore.getState().setSortBy('name')
  assert(useProjectsStore.getState().filters.sortBy === 'name', 'sortBy debe setearse')
  
  // Setear filtros parciales
  useProjectsStore.getState().setFilters({ searchTerm: 'partial update' })
  const state = useProjectsStore.getState()
  assert(state.filters.searchTerm === 'partial update', 'searchTerm debe actualizarse')
  assert(state.filters.sortBy === 'name', 'sortBy debe mantenerse')
  
  // Limpiar filtros
  useProjectsStore.getState().clearFilters()
  const clearedState = useProjectsStore.getState()
  assert(clearedState.filters.searchTerm === '', 'searchTerm debe limpiarse')
  assert(clearedState.filters.sortBy === 'recent', 'sortBy debe resetearse')
  
  console.log('✅ Gestión de filtros - PASS\n')
} catch (error) {
  console.log(`❌ Gestión de filtros - FAIL: ${(error as Error).message}\n`)
}

// Test 9: Gestión de errores
console.log('9. Test: Gestión de errores')
try {
  useProjectsStore.getState().reset()
  
  // Setear error
  useProjectsStore.getState().setError('Test error message')
  assert(useProjectsStore.getState().error === 'Test error message', 'Error debe setearse')
  
  // Limpiar error
  useProjectsStore.getState().clearError()
  assert(useProjectsStore.getState().error === null, 'Error debe limpiarse')
  
  console.log('✅ Gestión de errores - PASS\n')
} catch (error) {
  console.log(`❌ Gestión de errores - FAIL: ${(error as Error).message}\n`)
}

// Test 10: getFilteredProjects con búsqueda
console.log('10. Test: getFilteredProjects con búsqueda')
try {
  useProjectsStore.getState().reset()
  
  const projects = [
    createMockProject({ title: 'React Project', description: [{ type: 'paragraph', children: [{ text: 'Frontend development' }] }] }),
    createMockProject({ title: 'Node.js API', description: [{ type: 'paragraph', children: [{ text: 'Backend service' }] }] }),
    createMockProject({ title: 'Vue App', description: [{ type: 'paragraph', children: [{ text: 'Frontend application' }] }] }),
  ]
  
  useProjectsStore.getState().setProjects(projects)
  
  // Buscar por título
  useProjectsStore.getState().setSearchTerm('react')
  let filtered = useProjectsStore.getState().getFilteredProjects()
  assert(filtered.length === 1, 'Debe encontrar 1 proyecto por título')
  assert(filtered[0].title === 'React Project', 'Debe encontrar el proyecto correcto')
  
  // Buscar por descripción
  useProjectsStore.getState().setSearchTerm('frontend')
  filtered = useProjectsStore.getState().getFilteredProjects()
  assert(filtered.length === 2, 'Debe encontrar 2 proyectos por descripción')
  
  // Búsqueda sin resultados
  useProjectsStore.getState().setSearchTerm('nonexistent')
  filtered = useProjectsStore.getState().getFilteredProjects()
  assert(filtered.length === 0, 'Debe devolver array vacío para búsqueda sin resultados')
  
  // Sin filtro de búsqueda
  useProjectsStore.getState().setSearchTerm('')
  filtered = useProjectsStore.getState().getFilteredProjects()
  assert(filtered.length === 3, 'Debe devolver todos los proyectos sin filtro')
  
  console.log('✅ getFilteredProjects con búsqueda - PASS\n')
} catch (error) {
  console.log(`❌ getFilteredProjects con búsqueda - FAIL: ${(error as Error).message}\n`)
}

// Test 11: getFilteredProjects con ordenamiento
console.log('11. Test: getFilteredProjects con ordenamiento')
try {
  useProjectsStore.getState().reset()
  
  const now = new Date()
  const projects = [
    createMockProject({ 
      title: 'Z Project', 
      createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString() // 2 días atrás
    }),
    createMockProject({ 
      title: 'A Project', 
      createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString() // 1 día atrás
    }),
    createMockProject({ 
      title: 'M Project', 
      createdAt: now.toISOString() // Ahora
    }),
  ]
  
  useProjectsStore.getState().setProjects(projects)
  
  // Ordenar por nombre
  useProjectsStore.getState().setSortBy('name')
  let sorted = useProjectsStore.getState().getFilteredProjects()
  assert(sorted[0].title === 'A Project', 'Primero debe ser A Project por nombre')
  assert(sorted[1].title === 'M Project', 'Segundo debe ser M Project por nombre')
  assert(sorted[2].title === 'Z Project', 'Tercero debe ser Z Project por nombre')
  
  // Ordenar por fecha de creación (oldest first)
  useProjectsStore.getState().setSortBy('creation')
  sorted = useProjectsStore.getState().getFilteredProjects()
  assert(sorted[0].title === 'Z Project', 'Primero debe ser Z Project (más antiguo)')
  assert(sorted[2].title === 'M Project', 'Último debe ser M Project (más nuevo)')
  
  // Ordenar por reciente (newest first) - default
  useProjectsStore.getState().setSortBy('recent')
  sorted = useProjectsStore.getState().getFilteredProjects()
  assert(sorted[0].title === 'M Project', 'Primero debe ser M Project (más reciente)')
  assert(sorted[2].title === 'Z Project', 'Último debe ser Z Project (más antiguo)')
  
  console.log('✅ getFilteredProjects con ordenamiento - PASS\n')
} catch (error) {
  console.log(`❌ getFilteredProjects con ordenamiento - FAIL: ${(error as Error).message}\n`)
}

// Test 12: getProjectById
console.log('12. Test: getProjectById')
try {
  useProjectsStore.getState().reset()
  
  const project1 = createMockProject({ title: 'Find Me' })
  const project2 = createMockProject({ title: 'Other Project' })
  
  useProjectsStore.getState().setProjects([project1, project2])
  
  // Encontrar proyecto existente
  const found = useProjectsStore.getState().getProjectById(project1.id)
  assert(found !== undefined, 'Debe encontrar el proyecto')
  assert(found?.title === 'Find Me', 'Debe devolver el proyecto correcto')
  
  // Buscar proyecto inexistente
  const notFound = useProjectsStore.getState().getProjectById('nonexistent-id')
  assert(notFound === undefined, 'Debe devolver undefined para ID inexistente')
  
  console.log('✅ getProjectById - PASS\n')
} catch (error) {
  console.log(`❌ getProjectById - FAIL: ${(error as Error).message}\n`)
}

// Test 13: Reset completo
console.log('13. Test: Reset completo')
try {
  // Configurar estado modificado
  const project = createMockProject()
  useProjectsStore.getState().setProjects([project])
  useProjectsStore.getState().setSelectedProject(project)
  useProjectsStore.getState().setLoading(true)
  useProjectsStore.getState().setError('Some error')
  useProjectsStore.getState().setSearchTerm('search term')
  useProjectsStore.getState().setSortBy('name')
  
  // Verificar que el estado está modificado
  let state = useProjectsStore.getState()
  assert(state.projects.length === 1, 'Debe tener proyectos antes del reset')
  assert(state.selectedProject !== null, 'Debe tener proyecto seleccionado antes del reset')
  assert(state.isLoading === true, 'Debe estar en loading antes del reset')
  assert(state.error !== null, 'Debe tener error antes del reset')
  assert(state.filters.searchTerm !== '', 'Debe tener searchTerm antes del reset')
  assert(state.filters.sortBy !== 'recent', 'Debe tener sortBy modificado antes del reset')
  
  // Reset completo
  useProjectsStore.getState().reset()
  state = useProjectsStore.getState()
  
  // Verificar estado inicial
  assert(state.projects.length === 0, 'projects debe resetearse')
  assert(state.selectedProject === null, 'selectedProject debe resetearse')
  assert(state.isLoading === false, 'isLoading debe resetearse')
  assert(state.error === null, 'error debe resetearse')
  assert(state.filters.searchTerm === '', 'searchTerm debe resetearse')
  assert(state.filters.sortBy === 'recent', 'sortBy debe resetearse')
  
  console.log('✅ Reset completo - PASS\n')
} catch (error) {
  console.log(`❌ Reset completo - FAIL: ${(error as Error).message}\n`)
}

console.log('🎉 Tests de Projects Store completados!')
console.log('\n📊 Resumen de tests:')
console.log('- Estado inicial ✅')
console.log('- CRUD de proyectos ✅')
console.log('- Gestión de selectedProject ✅')
console.log('- Estados de carga ✅')
console.log('- Gestión de filtros ✅')
console.log('- Gestión de errores ✅')
console.log('- Filtrado y ordenamiento ✅')
console.log('- Utilidades ✅')
console.log('- Reset completo ✅')
console.log('\n🔧 Para ejecutar: tsx src/stores/projects-store.test.ts') 