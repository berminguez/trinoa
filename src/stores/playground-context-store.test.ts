// ============================================================================
// EIDETIK MVP - TESTS PARA PLAYGROUND CONTEXT STORE
// ============================================================================

/**
 * Tests unitarios para el store de contexto de playground con Zustand
 * 
 * Ejecutar con: tsx src/stores/playground-context-store.test.ts
 */

import { usePlaygroundContextStore, useContextDisplayState } from './playground-context-store'
import type { 
  PlaygroundProject, 
  PlaygroundVideo, 
  PlaygroundContextStore,
  ChatContext,
  ContextDisplayState 
} from '@/types/playground'

// Helper para simular assertions simples
function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message)
  }
}

// Helpers para crear datos mock
function createMockProject(overrides: Partial<PlaygroundProject> = {}): PlaygroundProject {
  return {
    id: 'proj-' + Math.random().toString(36).substring(2, 8),
    title: 'Test Project',
    slug: 'test-project-abc123',
    ...overrides,
  }
}

function createMockVideo(overrides: Partial<PlaygroundVideo> = {}): PlaygroundVideo {
  return {
    id: 'vid-' + Math.random().toString(36).substring(2, 8),
    title: 'Test Video',
    projectId: 'proj-123',
    projectTitle: 'Test Project',
    type: 'video',
    status: 'completed',
    ...overrides,
  }
}

// Helper para obtener estado inicial del store
function getInitialState(): Partial<PlaygroundContextStore> {
  return {
    selectedProject: null,
    selectedVideos: [],
    allVideosSelected: true,
    availableProjects: [],
    availableVideos: [],
    isLoadingProjects: false,
    isLoadingVideos: false,
    projectsError: null,
    videosError: null,
    lastUpdated: 0,
  }
}

// ============================================================================
// TESTS
// ============================================================================

console.log('🧪 Iniciando tests del Playground Context Store...\n')

// Test 1: Estado inicial
console.log('1️⃣ Test: Estado inicial del store')
try {
  const store = usePlaygroundContextStore.getState()
  const expected = getInitialState()
  
  assert(store.selectedProject === expected.selectedProject, 'selectedProject debe ser null inicialmente')
  assert(store.selectedVideos.length === 0, 'selectedVideos debe ser array vacío inicialmente')
  assert(store.allVideosSelected === true, 'allVideosSelected debe ser true inicialmente')
  assert(store.availableProjects.length === 0, 'availableProjects debe ser array vacío')
  assert(store.availableVideos.length === 0, 'availableVideos debe ser array vacío')
  assert(store.isLoadingProjects === false, 'isLoadingProjects debe ser false')
  assert(store.isLoadingVideos === false, 'isLoadingVideos debe ser false')
  assert(store.projectsError === null, 'projectsError debe ser null')
  assert(store.videosError === null, 'videosError debe ser null')
  
  console.log('✅ Estado inicial correcto\n')
} catch (error) {
  console.error('❌ Error en estado inicial:', error)
  process.exit(1)
}

// Test 2: setSelectedProject
console.log('2️⃣ Test: setSelectedProject')
try {
  const store = usePlaygroundContextStore.getState()
  const mockProject = createMockProject({ id: 'proj-123', title: 'Proyecto Test' })
  
  // Configurar estado inicial con videos seleccionados
  store.setSelectedVideos([createMockVideo(), createMockVideo()])
  assert(store.selectedVideos.length === 2, 'Setup: debe tener videos seleccionados')
  
  // Cambiar proyecto - debe resetear videos
  store.setSelectedProject(mockProject)
  const state = usePlaygroundContextStore.getState()
  
  assert(state.selectedProject?.id === mockProject.id, 'Debe establecer el proyecto seleccionado')
  assert(state.selectedProject?.title === mockProject.title, 'Debe mantener título del proyecto')
  assert(state.selectedVideos.length === 0, 'Debe resetear videos al cambiar proyecto')
  assert(state.allVideosSelected === true, 'Debe marcar allVideosSelected como true')
  
  // Resetear a null
  store.setSelectedProject(null)
  const resetState = usePlaygroundContextStore.getState()
  assert(resetState.selectedProject === null, 'Debe permitir resetear proyecto a null')
  
  console.log('✅ setSelectedProject funciona correctamente\n')
} catch (error) {
  console.error('❌ Error en setSelectedProject:', error)
  process.exit(1)
}

// Test 3: setSelectedVideos y toggleVideo
console.log('3️⃣ Test: setSelectedVideos y toggleVideo')
try {
  const store = usePlaygroundContextStore.getState()
  const mockVideos = [
    createMockVideo({ id: 'vid-1', title: 'Video 1' }),
    createMockVideo({ id: 'vid-2', title: 'Video 2' }),
  ]
  
  // Reset store
  store.resetContext()
  
  // setSelectedVideos
  store.setSelectedVideos(mockVideos)
  let state = usePlaygroundContextStore.getState()
  assert(state.selectedVideos.length === 2, 'Debe establecer videos seleccionados')
  assert(state.allVideosSelected === false, 'allVideosSelected debe ser false con videos específicos')
  
  // toggleVideo - remover video existente
  store.toggleVideo(mockVideos[0])
  state = usePlaygroundContextStore.getState()
  assert(state.selectedVideos.length === 1, 'Debe remover video al hacer toggle')
  assert(state.selectedVideos[0].id === 'vid-2', 'Debe mantener el video correcto')
  
  // toggleVideo - agregar video nuevo
  const newVideo = createMockVideo({ id: 'vid-3', title: 'Video 3' })
  store.toggleVideo(newVideo)
  state = usePlaygroundContextStore.getState()
  assert(state.selectedVideos.length === 2, 'Debe agregar video nuevo')
  assert(state.selectedVideos.some(v => v.id === 'vid-3'), 'Debe contener el video agregado')
  
  // toggleVideo hasta vaciar - debe marcar allVideosSelected
  store.toggleVideo(state.selectedVideos[0])
  store.toggleVideo(state.selectedVideos[0])
  state = usePlaygroundContextStore.getState()
  assert(state.selectedVideos.length === 0, 'Debe vaciar videos seleccionados')
  assert(state.allVideosSelected === true, 'Debe marcar allVideosSelected cuando se vacía')
  
  console.log('✅ setSelectedVideos y toggleVideo funcionan correctamente\n')
} catch (error) {
  console.error('❌ Error en setSelectedVideos/toggleVideo:', error)
  process.exit(1)
}

// Test 4: toggleAllVideos
console.log('4️⃣ Test: toggleAllVideos')
try {
  const store = usePlaygroundContextStore.getState()
  const mockVideos = [createMockVideo(), createMockVideo()]
  
  // Configurar videos específicos seleccionados
  store.setSelectedVideos(mockVideos)
  assert(usePlaygroundContextStore.getState().allVideosSelected === false, 'Setup: allVideosSelected debe ser false')
  
  // toggleAllVideos - debe marcar "Todos los videos"
  store.toggleAllVideos()
  let state = usePlaygroundContextStore.getState()
  assert(state.allVideosSelected === true, 'Debe marcar allVideosSelected')
  assert(state.selectedVideos.length === 0, 'Debe limpiar videos específicos')
  
  // toggleAllVideos cuando ya está marcado - no debe cambiar
  store.toggleAllVideos()
  state = usePlaygroundContextStore.getState()
  assert(state.allVideosSelected === true, 'Debe mantener allVideosSelected si ya estaba marcado')
  
  console.log('✅ toggleAllVideos funciona correctamente\n')
} catch (error) {
  console.error('❌ Error en toggleAllVideos:', error)
  process.exit(1)
}

// Test 5: resetContext
console.log('5️⃣ Test: resetContext')
try {
  const store = usePlaygroundContextStore.getState()
  
  // Configurar estado no-inicial
  const mockProject = createMockProject()
  const mockVideos = [createMockVideo(), createMockVideo()]
  store.setSelectedProject(mockProject)
  store.setSelectedVideos(mockVideos)
  
  // Verificar que cambió
  let state = usePlaygroundContextStore.getState()
  assert(state.selectedProject !== null, 'Setup: debe tener proyecto seleccionado')
  assert(state.selectedVideos.length > 0, 'Setup: debe tener videos seleccionados')
  assert(state.allVideosSelected === false, 'Setup: allVideosSelected debe ser false')
  
  // Reset
  store.resetContext()
  state = usePlaygroundContextStore.getState()
  assert(state.selectedProject === null, 'Debe resetear proyecto a null')
  assert(state.selectedVideos.length === 0, 'Debe resetear videos a array vacío')
  assert(state.allVideosSelected === true, 'Debe resetear allVideosSelected a true')
  
  console.log('✅ resetContext funciona correctamente\n')
} catch (error) {
  console.error('❌ Error en resetContext:', error)
  process.exit(1)
}

// Test 6: setAvailableProjects y setAvailableVideos
console.log('6️⃣ Test: setAvailableProjects y setAvailableVideos')
try {
  const store = usePlaygroundContextStore.getState()
  const mockProjects = [createMockProject(), createMockProject()]
  const mockVideos = [createMockVideo(), createMockVideo()]
  
  // Test setAvailableProjects
  store.setAvailableProjects(mockProjects)
  let state = usePlaygroundContextStore.getState()
  assert(state.availableProjects.length === 2, 'Debe establecer proyectos disponibles')
  assert(state.projectsError === null, 'Debe limpiar error de proyectos')
  assert(state.lastUpdated > 0, 'Debe actualizar timestamp')
  
  // Test setAvailableVideos
  const timestamp1 = state.lastUpdated
  setTimeout(() => {
    store.setAvailableVideos(mockVideos)
    state = usePlaygroundContextStore.getState()
    assert(state.availableVideos.length === 2, 'Debe establecer videos disponibles')
    assert(state.videosError === null, 'Debe limpiar error de videos')
    assert(state.lastUpdated > timestamp1, 'Debe actualizar timestamp al cambiar videos')
  }, 1)
  
  console.log('✅ setAvailableProjects y setAvailableVideos funcionan correctamente\n')
} catch (error) {
  console.error('❌ Error en setAvailable:', error)
  process.exit(1)
}

// Test 7: Estados de loading y error
console.log('7️⃣ Test: Estados de loading y error')
try {
  const store = usePlaygroundContextStore.getState()
  
  // Test loading states
  store.setLoadingProjects(true)
  assert(usePlaygroundContextStore.getState().isLoadingProjects === true, 'Debe establecer loading projects')
  
  store.setLoadingVideos(true)
  assert(usePlaygroundContextStore.getState().isLoadingVideos === true, 'Debe establecer loading videos')
  
  // Test error states - debe desactivar loading
  store.setProjectsError('Error de proyectos')
  let state = usePlaygroundContextStore.getState()
  assert(state.projectsError === 'Error de proyectos', 'Debe establecer error de proyectos')
  assert(state.isLoadingProjects === false, 'Debe desactivar loading al establecer error')
  
  store.setVideosError('Error de videos')
  state = usePlaygroundContextStore.getState()
  assert(state.videosError === 'Error de videos', 'Debe establecer error de videos')
  assert(state.isLoadingVideos === false, 'Debe desactivar loading al establecer error')
  
  // Reset errors
  store.setProjectsError(null)
  store.setVideosError(null)
  state = usePlaygroundContextStore.getState()
  assert(state.projectsError === null, 'Debe limpiar error de proyectos')
  assert(state.videosError === null, 'Debe limpiar error de videos')
  
  console.log('✅ Estados de loading y error funcionan correctamente\n')
} catch (error) {
  console.error('❌ Error en loading/error states:', error)
  process.exit(1)
}

// Test 8: getFilteredVideos
console.log('8️⃣ Test: getFilteredVideos')
try {
  const store = usePlaygroundContextStore.getState()
  
  // Configurar datos
  const project1 = createMockProject({ id: 'proj-1', title: 'Proyecto 1' })
  const project2 = createMockProject({ id: 'proj-2', title: 'Proyecto 2' })
  const videos = [
    createMockVideo({ id: 'vid-1', projectId: 'proj-1', title: 'Video Proyecto 1' }),
    createMockVideo({ id: 'vid-2', projectId: 'proj-1', title: 'Video Proyecto 1-2' }),
    createMockVideo({ id: 'vid-3', projectId: 'proj-2', title: 'Video Proyecto 2' }),
  ]
  
  store.setAvailableProjects([project1, project2])
  store.setAvailableVideos(videos)
  
  // Sin proyecto seleccionado - debe devolver todos
  store.setSelectedProject(null)
  let filteredVideos = store.getFilteredVideos()
  assert(filteredVideos.length === 3, 'Sin proyecto debe devolver todos los videos')
  
  // Con proyecto específico - debe filtrar
  store.setSelectedProject(project1)
  filteredVideos = store.getFilteredVideos()
  assert(filteredVideos.length === 2, 'Con proyecto debe filtrar videos')
  assert(filteredVideos.every(v => v.projectId === 'proj-1'), 'Todos los videos deben ser del proyecto correcto')
  
  console.log('✅ getFilteredVideos funciona correctamente\n')
} catch (error) {
  console.error('❌ Error en getFilteredVideos:', error)
  process.exit(1)
}

// Test 9: getChatContext
console.log('9️⃣ Test: getChatContext')
try {
  const store = usePlaygroundContextStore.getState()
  
  // Configurar datos
  const projects = [
    createMockProject({ id: 'proj-1', title: 'Proyecto 1' }),
    createMockProject({ id: 'proj-2', title: 'Proyecto 2' }),
  ]
  const videos = [
    createMockVideo({ id: 'vid-1', projectId: 'proj-1', title: 'Video 1' }),
    createMockVideo({ id: 'vid-2', projectId: 'proj-1', title: 'Video 2' }),
    createMockVideo({ id: 'vid-3', projectId: 'proj-2', title: 'Video 3' }),
  ]
  
  store.setAvailableProjects(projects)
  store.setAvailableVideos(videos)
  
  // Caso 1: "Todos los proyectos" y "Todos los videos"
  store.resetContext()
  let context = store.getChatContext()
  assert(context.scope === 'all_projects', 'Scope debe ser all_projects')
  assert(context.projectCount === 2, 'Debe contar todos los proyectos')
  assert(context.videoCount === 3, 'Debe contar todos los videos')
  assert(context.projects.ids.length === 2, 'Debe incluir IDs de todos los proyectos')
  assert(context.videos.ids.length === 3, 'Debe incluir IDs de todos los videos')
  
  // Caso 2: Proyecto específico con "Todos los videos"
  store.setSelectedProject(projects[0])
  context = store.getChatContext()
  assert(context.scope === 'specific_project', 'Scope debe ser specific_project')
  assert(context.projectCount === 1, 'Debe contar solo el proyecto seleccionado')
  assert(context.videoCount === 2, 'Debe contar solo videos del proyecto')
  assert(context.projects.ids[0] === 'proj-1', 'Debe incluir ID del proyecto correcto')
  assert(context.videos.ids.length === 2, 'Debe incluir solo videos del proyecto')
  
  // Caso 3: Videos específicos seleccionados
  store.setSelectedVideos([videos[0], videos[1]])
  context = store.getChatContext()
  assert(context.scope === 'specific_videos', 'Scope debe ser specific_videos')
  assert(context.videoCount === 2, 'Debe contar solo videos seleccionados')
  assert(context.videos.ids.length === 2, 'Debe incluir solo videos seleccionados')
  
  console.log('✅ getChatContext funciona correctamente\n')
} catch (error) {
  console.error('❌ Error en getChatContext:', error)
  process.exit(1)
}

// Test 10: isProjectAvailable y isVideoAvailable
console.log('🔟 Test: isProjectAvailable y isVideoAvailable')
try {
  const store = usePlaygroundContextStore.getState()
  
  // Configurar datos
  const projects = [createMockProject({ id: 'proj-available' })]
  const videos = [createMockVideo({ id: 'vid-available' })]
  
  store.setAvailableProjects(projects)
  store.setAvailableVideos(videos)
  
  // Test disponible
  assert(store.isProjectAvailable('proj-available') === true, 'Debe detectar proyecto disponible')
  assert(store.isVideoAvailable('vid-available') === true, 'Debe detectar video disponible')
  
  // Test no disponible
  assert(store.isProjectAvailable('proj-missing') === false, 'Debe detectar proyecto no disponible')
  assert(store.isVideoAvailable('vid-missing') === false, 'Debe detectar video no disponible')
  
  console.log('✅ isProjectAvailable y isVideoAvailable funcionan correctamente\n')
} catch (error) {
  console.error('❌ Error en validaciones de disponibilidad:', error)
  process.exit(1)
}

// Test 11: validateAndCleanPersistedData
console.log('1️⃣1️⃣ Test: validateAndCleanPersistedData')
try {
  const store = usePlaygroundContextStore.getState()
  
  // Configurar datos disponibles
  const availableProject = createMockProject({ id: 'proj-available' })
  const availableVideos = [
    createMockVideo({ id: 'vid-available-1' }),
    createMockVideo({ id: 'vid-available-2' }),
  ]
  store.setAvailableProjects([availableProject])
  store.setAvailableVideos(availableVideos)
  
  // Configurar selecciones con datos que ya no existen
  const missingProject = createMockProject({ id: 'proj-missing' })
  const missingVideos = [
    createMockVideo({ id: 'vid-missing-1' }),
    createMockVideo({ id: 'vid-missing-2' }),
  ]
  
  // Caso 1: Proyecto que ya no existe
  store.setSelectedProject(missingProject)
  store.setSelectedVideos(missingVideos)
  
  let result = store.validateAndCleanPersistedData()
  let state = usePlaygroundContextStore.getState()
  
  assert(result.cleaned === true, 'Debe indicar que se limpiaron datos')
  assert(result.removedProject === true, 'Debe indicar que se removió proyecto')
  assert(result.removedVideosCount === 2, 'Debe indicar videos removidos')
  assert(state.selectedProject === null, 'Debe resetear proyecto missing')
  assert(state.selectedVideos.length === 0, 'Debe resetear videos missing')
  assert(state.allVideosSelected === true, 'Debe marcar allVideosSelected')
  
  // Caso 2: Videos que ya no existen (proyecto válido)
  store.setSelectedProject(availableProject)
  store.setSelectedVideos([availableVideos[0], missingVideos[0]])
  
  result = store.validateAndCleanPersistedData()
  state = usePlaygroundContextStore.getState()
  
  assert(result.cleaned === true, 'Debe limpiar videos missing')
  assert(result.removedProject === false, 'No debe remover proyecto válido')
  assert(result.removedVideosCount === 1, 'Debe contar videos removidos')
  assert(state.selectedVideos.length === 1, 'Debe mantener videos válidos')
  assert(state.selectedVideos[0].id === 'vid-available-1', 'Debe mantener video correcto')
  
  // Caso 3: Datos válidos - no debe cambiar nada
  store.setSelectedProject(availableProject)
  store.setSelectedVideos([availableVideos[0]])
  
  result = store.validateAndCleanPersistedData()
  assert(result.cleaned === false, 'No debe limpiar datos válidos')
  
  console.log('✅ validateAndCleanPersistedData funciona correctamente\n')
} catch (error) {
  console.error('❌ Error en validateAndCleanPersistedData:', error)
  process.exit(1)
}

// Test 12: hydrateAfterDataLoad
console.log('1️⃣2️⃣ Test: hydrateAfterDataLoad')
try {
  const store = usePlaygroundContextStore.getState()
  
  // Caso 1: Sin datos disponibles
  store.setAvailableProjects([])
  store.setAvailableVideos([])
  
  let result = store.hydrateAfterDataLoad()
  assert(result.hydrated === false, 'No debe hidratar sin datos')
  assert(result.reason === 'no_data_available', 'Debe indicar razón correcta')
  
  // Caso 2: Con datos disponibles
  const projects = [createMockProject({ id: 'proj-1' })]
  const videos = [
    createMockVideo({ id: 'vid-1', projectId: 'proj-1' }),
    createMockVideo({ id: 'vid-2', projectId: 'proj-1' }),
  ]
  
  store.setAvailableProjects(projects)
  store.setAvailableVideos(videos)
  
  result = store.hydrateAfterDataLoad()
  assert(result.hydrated === true, 'Debe hidratar con datos disponibles')
  assert(result.dataAvailable?.projects === 1, 'Debe reportar cantidad de proyectos')
  assert(result.dataAvailable?.videos === 2, 'Debe reportar cantidad de videos')
  
  console.log('✅ hydrateAfterDataLoad funciona correctamente\n')
} catch (error) {
  console.error('❌ Error en hydrateAfterDataLoad:', error)
  process.exit(1)
}

// Test 13: useContextDisplayState hook
console.log('1️⃣3️⃣ Test: useContextDisplayState hook')
try {
  const store = usePlaygroundContextStore.getState()
  
  // Caso 1: "Todos los proyectos"
  store.resetContext()
  let displayState = useContextDisplayState()
  assert(displayState.type === 'all_projects', 'Debe mostrar all_projects sin proyecto seleccionado')
  
  // Caso 2: Proyecto específico con "Todos los videos"
  const project = createMockProject({ title: 'Mi Proyecto' })
  store.setSelectedProject(project)
  displayState = useContextDisplayState()
  assert(displayState.type === 'specific_project', 'Debe mostrar specific_project')
  if (displayState.type === 'specific_project') {
    assert(displayState.projectName === 'Mi Proyecto', 'Debe mostrar nombre correcto')
  }
  
  // Caso 3: Proyecto específico con videos seleccionados
  const videos = [createMockVideo(), createMockVideo()]
  store.setSelectedVideos(videos)
  displayState = useContextDisplayState()
  assert(displayState.type === 'specific_project_with_videos', 'Debe mostrar specific_project_with_videos')
  if (displayState.type === 'specific_project_with_videos') {
    assert(displayState.projectName === 'Mi Proyecto', 'Debe mostrar nombre correcto')
    assert(displayState.videoCount === 2, 'Debe contar videos correctamente')
  }
  
  console.log('✅ useContextDisplayState funciona correctamente\n')
} catch (error) {
  console.error('❌ Error en useContextDisplayState:', error)
  process.exit(1)
}

// ============================================================================
// RESUMEN
// ============================================================================

console.log('🎉 ¡Todos los tests pasaron exitosamente!')
console.log('\n📊 Resumen de tests ejecutados:')
console.log('✅ Estado inicial del store')
console.log('✅ setSelectedProject (con reset de videos)')
console.log('✅ setSelectedVideos y toggleVideo')
console.log('✅ toggleAllVideos')
console.log('✅ resetContext')
console.log('✅ setAvailableProjects y setAvailableVideos')
console.log('✅ Estados de loading y error')
console.log('✅ getFilteredVideos')
console.log('✅ getChatContext (todos los casos)')
console.log('✅ isProjectAvailable y isVideoAvailable')
console.log('✅ validateAndCleanPersistedData')
console.log('✅ hydrateAfterDataLoad')
console.log('✅ useContextDisplayState hook')
console.log('\n🚀 Store de Playground Context funcionando correctamente!')

// Si llegamos aquí, todos los tests pasaron
process.exit(0) 