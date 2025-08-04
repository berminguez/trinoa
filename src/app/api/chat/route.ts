import { openai } from '@ai-sdk/openai'
import { streamText, experimental_createMCPClient } from 'ai'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getCurrentUser } from '@/actions/auth/getUser'

// Cambiar a nodejs runtime para soporte completo de MCP
export const runtime = 'nodejs'

// Cache para herramientas MCP (por usuario)
let mcpToolsCache: Record<string, Record<string, any>> | null = null

/**
 * Busca la playground key del usuario autenticado
 */
async function getUserPlaygroundKey(userId: string): Promise<string | null> {
  try {
    const payload = await getPayload({ config })

    const playgroundKeysResponse = await payload.find({
      collection: 'api-keys' as any,
      where: {
        and: [
          {
            user: {
              equals: userId,
            },
          },
          {
            playgroundKey: {
              equals: true,
            },
          },
        ],
      },
      limit: 1,
    })

    if (playgroundKeysResponse.docs.length === 0) {
      console.warn(`⚠️ No se encontró playground key para usuario ${userId}`)
      return null
    }

    const playgroundKey = playgroundKeysResponse.docs[0] as any
    console.log(`✅ Playground key encontrada para usuario ${userId}:`, {
      keyId: playgroundKey.id,
      keyName: playgroundKey.name,
      lastFour: playgroundKey.keyValueLastFour,
    })

    return playgroundKey.keyValue
  } catch (error) {
    console.error('❌ Error buscando playground key:', error)
    return null
  }
}

async function getMCPTools(userId?: string) {
  try {
    let apiKey: string | null = null

    // Si se proporciona userId, buscar su playground key
    if (userId) {
      apiKey = await getUserPlaygroundKey(userId)
      if (!apiKey) {
        console.error(
          `❌ No se puede conectar al MCP: usuario ${userId} no tiene playground key asignada`,
        )
        return null
      }
    } else {
      // Sin userId no se puede autenticar - ya no hay fallback a TEST_MCP_KEY
      console.error('❌ No se puede conectar al MCP: se requiere userId para autenticación')
      return null
    }

    // Cache key basado en el usuario (solo usuarios autenticados pueden usar MCP)
    const cacheKey = `user_${userId}`

    // Si no hay herramientas en cache para esta key, crear conexión y obtenerlas
    if (!mcpToolsCache || !mcpToolsCache[cacheKey]) {
      console.log('🔗 Conectando al MCP en:', process.env.EIDETIK_MCP_HOST)
      console.log('🔑 Usando playground key del usuario', userId)

      const mcpClient = await experimental_createMCPClient({
        transport: {
          type: 'sse',
          url: process.env.EIDETIK_MCP_HOST || 'http://localhost:8081/sse',
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
        },
      })

      console.log('✅ Cliente MCP conectado')

      // Obtener herramientas disponibles
      const tools = await mcpClient.tools()

      // Inicializar cache si es null
      if (!mcpToolsCache) {
        mcpToolsCache = {}
      }

      mcpToolsCache[cacheKey] = tools
      console.log('🛠️ Herramientas MCP cargadas:', Object.keys(tools || {}).length)
    }

    return mcpToolsCache[cacheKey]
  } catch (error) {
    console.error('❌ Error conectando al MCP:', error)
    return null
  }
}

/**
 * Valida que los IDs de proyectos y videos en el contexto pertenecen al usuario autenticado
 */
async function validateContextOwnership(context: any, userId: string) {
  if (!context || typeof context !== 'object') {
    return { isValid: true, sanitizedContext: null }
  }

  try {
    const payload = await getPayload({ config })

    // Si no hay IDs específicos, el contexto es válido
    if (!context.projects?.ids?.length && !context.videos?.ids?.length) {
      return { isValid: true, sanitizedContext: context }
    }

    let sanitizedProjectIds: string[] = []
    let sanitizedVideoIds: string[] = []

    // Validar proyectos si existen
    if (context.projects?.ids?.length > 0) {
      const projectsResponse = await payload.find({
        collection: 'projects' as any,
        where: {
          id: { in: context.projects.ids },
          createdBy: { equals: userId },
        },
        limit: 100,
        depth: 0,
      })

      sanitizedProjectIds = projectsResponse.docs.map((p: any) => p.id)

      if (sanitizedProjectIds.length !== context.projects.ids.length) {
        console.warn('🔒 Algunos proyectos del contexto no pertenecen al usuario:', {
          requested: context.projects.ids,
          validated: sanitizedProjectIds,
          userId,
        })
      }
    }

    // Validar videos si existen
    if (context.videos?.ids?.length > 0) {
      const resourcesResponse = await payload.find({
        collection: 'resources' as any,
        where: {
          id: { in: context.videos.ids },
          'project.createdBy': { equals: userId },
        },
        limit: 500,
        depth: 1,
      })

      sanitizedVideoIds = resourcesResponse.docs.map((r: any) => r.id)

      if (sanitizedVideoIds.length !== context.videos.ids.length) {
        console.warn('🔒 Algunos videos del contexto no pertenecen al usuario:', {
          requested: context.videos.ids,
          validated: sanitizedVideoIds,
          userId,
        })
      }
    }

    // Crear contexto sanitizado
    const sanitizedContext = {
      ...context,
      projects: {
        ...context.projects,
        ids: sanitizedProjectIds,
      },
      videos: {
        ...context.videos,
        ids: sanitizedVideoIds,
      },
      projectCount: sanitizedProjectIds.length,
      videoCount: sanitizedVideoIds.length,
    }

    return { isValid: true, sanitizedContext }
  } catch (error) {
    console.error('❌ Error validando contexto:', error)
    return { isValid: false, sanitizedContext: null }
  }
}

export async function POST(req: Request) {
  try {
    const { messages, context } = await req.json()

    // Validar que hay mensajes
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'No se proporcionaron mensajes válidos' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Validar clave de OpenAI
    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY no está configurada')
      return new Response(JSON.stringify({ error: 'Configuración de OpenAI no disponible' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Validar usuario autenticado y contexto
    let validatedContext = context
    let currentUser = null

    if (context && Object.keys(context).length > 0) {
      try {
        const user = await getCurrentUser()
        if (!user) {
          console.warn('⚠️ Contexto enviado sin usuario autenticado, ignorando')
          validatedContext = null
        } else {
          currentUser = user
          console.log('🔒 Validando contexto para usuario:', user.id)
          const validation = await validateContextOwnership(context, user.id)

          if (!validation.isValid) {
            console.error('❌ Error en validación de contexto, usando contexto vacío')
            validatedContext = null
          } else {
            validatedContext = validation.sanitizedContext
            console.log('✅ Contexto validado exitosamente')
          }
        }
      } catch (error) {
        console.error('❌ Error durante validación de contexto:', error)
        validatedContext = null
      }
    } else {
      // Aún necesitamos el usuario para obtener su playground key
      try {
        currentUser = await getCurrentUser()
      } catch (error) {
        console.warn('⚠️ No se pudo obtener usuario autenticado para MCP')
      }
    }

    // Obtener herramientas MCP usando playground key del usuario
    const tools = await getMCPTools(currentUser?.id)
    const hasTools = tools && Object.keys(tools).length > 0

    // Si no hay herramientas disponibles por falta de playground key,
    // notificar al usuario en el contexto
    const playgroundKeyError =
      currentUser && !hasTools
        ? '\n\n⚠️ AVISO: El chatbot no tiene ninguna API key asignada. Las funcionalidades avanzadas no están disponibles.'
        : ''

    // Validar y procesar contexto del playground
    let contextInfo = ''
    if (validatedContext && typeof validatedContext === 'object') {
      console.log('🎯 Contexto del playground validado:', JSON.stringify(validatedContext, null, 2))
      console.log('🔍 Análisis del contexto:', {
        scope: validatedContext.scope,
        projectCount: validatedContext.projectCount,
        videoCount: validatedContext.videoCount,
        hasProjectIds: validatedContext.projects?.ids?.length > 0,
        hasVideoIds: validatedContext.videos?.ids?.length > 0,
        projectIds: validatedContext.projects?.ids || [],
        videoIds: validatedContext.videos?.ids || [],
      })

      if (validatedContext.scope === 'all_projects' && validatedContext.projectCount > 0) {
        contextInfo = `

📊 CONTEXTO DE BÚSQUEDA ACTIVO:
- Alcance: Todos los proyectos del usuario (${validatedContext.projectCount} proyecto${validatedContext.projectCount !== 1 ? 's' : ''})
- Videos disponibles: ${validatedContext.videoCount} video${validatedContext.videoCount !== 1 ? 's' : ''}
- Cuando busques información, considera TODOS los proyectos y videos del usuario.`
      } else if (
        (validatedContext.scope === 'specific_project' ||
          validatedContext.scope === 'specific_project_with_videos') &&
        validatedContext.projects?.ids?.length > 0
      ) {
        const projectNames = validatedContext.projects.names?.join(', ') || 'Proyecto específico'
        const videoNames =
          validatedContext.videos?.names?.length > 0
            ? `\n- Videos específicos: ${validatedContext.videos.names.slice(0, 5).join(', ')}${validatedContext.videos.names.length > 5 ? ` y ${validatedContext.videos.names.length - 5} más` : ''}`
            : ''

        contextInfo = `

🎯 CONTEXTO DE BÚSQUEDA ESPECÍFICO:
- Proyecto seleccionado: ${projectNames}
- Videos del contexto: ${validatedContext.videoCount} video${validatedContext.videoCount !== 1 ? 's' : ''}${videoNames}
- IMPORTANTE: Enfoca tus respuestas únicamente en el contenido relacionado con este proyecto y sus videos.
- IDs de referencia: Proyecto(s) [${validatedContext.projects.ids.join(', ')}]${validatedContext.videos?.ids?.length > 0 ? `, Video(s) [${validatedContext.videos.ids.slice(0, 3).join(', ')}${validatedContext.videos.ids.length > 3 ? '...' : ''}]` : ''}`
      } else if (
        validatedContext.scope === 'specific_videos' &&
        validatedContext.videos?.ids?.length > 0
      ) {
        const videoNames =
          validatedContext.videos.names?.slice(0, 3).join(', ') || 'Videos específicos'
        const projectInfo =
          validatedContext.projects?.ids?.length > 0
            ? `\n- Proyecto base: ${validatedContext.projects.names?.[0] || 'Proyecto'}`
            : ''

        contextInfo = `

🎯 CONTEXTO DE BÚSQUEDA DE VIDEOS ESPECÍFICOS:
- Videos seleccionados: ${videoNames}${validatedContext.videos.names.length > 3 ? ` y ${validatedContext.videos.names.length - 3} más` : ''}${projectInfo}
- IMPORTANTE: Enfoca tus respuestas ÚNICAMENTE en estos videos específicos.
- IDs de videos: [${validatedContext.videos.ids.join(', ')}]
- Cuando el usuario pregunte sobre "el video" sin especificar, usa estos videos específicos.`
      } else if (validatedContext.scope === 'no_context') {
        contextInfo = `

ℹ️ CONTEXTO: Usuario sin proyectos/videos disponibles.
- Proporciona respuestas generales y sugiere crear proyectos o subir contenido para usar el sistema RAG.`
      } else {
        console.warn('⚠️ Scope de contexto no reconocido:', validatedContext.scope)
        // Fallback: intentar procesar contexto genérico
        if (
          validatedContext.projects?.ids?.length > 0 ||
          validatedContext.videos?.ids?.length > 0
        ) {
          const projectInfo = validatedContext.projects?.names?.join(', ') || 'proyectos'
          const videoInfo = validatedContext.videos?.names?.slice(0, 3).join(', ') || 'videos'

          contextInfo = `

🔧 CONTEXTO DETECTADO (scope: ${validatedContext.scope}):
- Proyectos: ${projectInfo} [IDs: ${validatedContext.projects?.ids?.join(', ') || 'ninguno'}]
- Videos: ${videoInfo} [IDs: ${validatedContext.videos?.ids?.slice(0, 3).join(', ') || 'ninguno'}]
- IMPORTANTE: Usa estos IDs específicos para buscar información relevante.`
        }
      }
    }

    // Configurar el sistema de mensajes con información sobre herramientas MCP y contexto
    const systemMessage = {
      role: 'system' as const,
      content: `Eres un asistente de IA inteligente y útil llamado Eidetik. 
Respondes de manera clara, precisa y en español. 
Puedes ayudar con una amplia gama de tareas y preguntas.

Características principales:
- Eres experto en análisis de documentos y contenido
- Puedes ayudar con tareas de productividad 
- Mantienes conversaciones naturales y útiles
- Siempre respondes en español

${
  hasTools
    ? `✅ HERRAMIENTAS DISPONIBLES: Tienes acceso a herramientas MCP personalizadas que te permiten interactuar con sistemas externos. 

IMPORTANTE: Cuando uses herramientas:
1. Ejecuta la herramienta necesaria
2. Analiza el resultado que obtienes
3. Genera una respuesta natural y conversacional basada en ese resultado
4. NO muestres directamente el JSON o resultado crudo
5. Interpreta y contextualiza la información para el usuario

Ejemplo: Si obtienes "temperatura: 15°C, condición: nublado" → responde "Actualmente hace 15°C en esa ciudad con cielo nublado. Es un día fresco, te recomendaría llevar una chaqueta ligera."`
    : `⚠️ Herramientas MCP no disponibles actualmente. Proporciona respuestas útiles basadas en tu conocimiento.`
}${contextInfo}

En el futuro, tendrás acceso ampliado a:
- Sistema RAG para buscar en documentos del usuario
- Capacidades multimodales para análisis de imágenes y videos${playgroundKeyError}`,
    }

    // Preparar mensajes para OpenAI
    const allMessages = [systemMessage, ...messages]

    console.log(
      '💬 Procesando chat con',
      hasTools ? `${Object.keys(tools).length} herramientas MCP` : 'sin herramientas MCP',
      validatedContext
        ? `| Contexto: ${validatedContext.scope} (${validatedContext.projectCount || 0} proyectos, ${validatedContext.videoCount || 0} videos)`
        : '| Sin contexto',
    )

    // Crear stream con OpenAI, incluyendo herramientas MCP si están disponibles
    const result = await streamText({
      model: openai('gpt-4o-mini'), // Modelo eficiente y capaz
      messages: allMessages,
      temperature: 0.7,
      maxTokens: 2000,
      // Incluir herramientas MCP si están disponibles
      ...(hasTools && {
        tools,
        toolChoice: 'auto', // Permitir al modelo decidir cuándo usar herramientas
        maxToolRoundtrips: 5, // CRÍTICO: Permitir múltiples rondas para procesar resultados
      }),
    })

    // Retornar stream response
    return result.toDataStreamResponse()
  } catch (error) {
    console.error('Error en API de chat:', error)

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Error interno del servidor',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  }
}
