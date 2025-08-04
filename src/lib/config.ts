// ============================================================================
// EIDETIK MVP - CONFIGURACIÓN Y CONSTANTES
// ============================================================================

// Variables de entorno con valores por defecto
export const CONFIG = {
  // MongoDB
  DATABASE_URI: process.env.DATABASE_URI || 'mongodb://localhost:27017/eidetik-dev',

  // AWS S3
  AWS_REGION: process.env.AWS_REGION || 'us-east-1',
  AWS_S3_BUCKET: process.env.AWS_S3_BUCKET || '',

  // OpenAI
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',

  // Vercel AI SDK / Chat IA
  AI_CHAT_MODEL: process.env.AI_CHAT_MODEL || 'gpt-4',
  AI_CHAT_TEMPERATURE: parseFloat(process.env.AI_CHAT_TEMPERATURE || '0.7'),
  AI_CHAT_MAX_TOKENS: parseInt(process.env.AI_CHAT_MAX_TOKENS || '2048'),
  AI_CHAT_TOP_P: parseFloat(process.env.AI_CHAT_TOP_P || '1'),

  // Pinecone
  PINECONE_API_KEY: process.env.PINECONE_API_KEY || '',
  PINECONE_ENVIRONMENT: process.env.PINECONE_ENVIRONMENT || 'us-east-1-aws',
  PINECONE_INDEX_NAME: process.env.PINECONE_INDEX_NAME || 'resources-chunks',

  // Stripe
  STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY || '',
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || '',

  // IDs de productos de Stripe
  STRIPE_PRODUCT_FREE: process.env.STRIPE_PRODUCT_FREE || 'prod_SjYDBHSvLZp5DA',
  STRIPE_PRODUCT_BASIC: process.env.STRIPE_PRODUCT_BASIC || 'prod_SjYC4IXeXTz7Wx',
  STRIPE_PRODUCT_PRO: process.env.STRIPE_PRODUCT_PRO || 'prod_SjYK6cyeSoaqV1',

  // Workers
  WORKER_CONCURRENCY: parseInt(process.env.WORKER_CONCURRENCY || '2'),
  WORKER_MAX_RETRIES: parseInt(process.env.WORKER_MAX_RETRIES || '3'),
  WORKER_RETRY_DELAY: parseInt(process.env.WORKER_RETRY_DELAY || '5000'),

  // File limits
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE || '2147483648'), // 2GB
  MAX_VIDEO_DURATION: parseInt(process.env.MAX_VIDEO_DURATION || '7200'), // 2 hours

  // Rate limiting
  RATE_LIMIT_UPLOAD: parseInt(process.env.RATE_LIMIT_UPLOAD || '10'),
  RATE_LIMIT_API: parseInt(process.env.RATE_LIMIT_API || '100'),

  // MCP (Model Context Protocol)
  MCP_HOST: process.env.EIDETIK_MCP_HOST || 'localhost:8081',
} as const

// Constantes del procesamiento de video
export const VIDEO_PROCESSING = {
  CHUNK_SIZE_MIN: 30, // segundos
  CHUNK_SIZE_MAX: 60, // segundos
  FRAME_EXTRACTION_INTERVAL: 5, // cada 5 segundos
  SUPPORTED_FORMATS: ['mp4', 'mov', 'avi', 'mkv'] as const,
  SUPPORTED_MIME_TYPES: [
    'video/mp4',
    'video/quicktime',
    'video/x-msvideo',
    'video/x-matroska',
  ] as const,
} as const

// Constantes de embeddings
export const EMBEDDING_CONFIG = {
  MODEL: 'text-embedding-ada-002',
  DIMENSIONS: 1536,
  BATCH_SIZE: 100,
} as const

// Constantes de Pinecone
export const PINECONE_CONFIG = {
  VECTOR_DIMENSIONS: 1536,
  METRIC: 'cosine',
  NAMESPACE_PREFIX: 'eidetik',
} as const

// Constantes de Chat IA y RAG
export const CHAT_CONFIG = {
  // Configuración RAG
  RAG_TOP_K: parseInt(process.env.RAG_TOP_K || '5'), // Número de documentos a recuperar
  RAG_SIMILARITY_THRESHOLD: parseFloat(process.env.RAG_SIMILARITY_THRESHOLD || '0.7'), // Umbral de similitud
  RAG_MAX_CONTEXT_LENGTH: parseInt(process.env.RAG_MAX_CONTEXT_LENGTH || '8000'), // Máximo contexto en tokens

  // Límites de conversación
  MAX_MESSAGES_PER_CONVERSATION: parseInt(process.env.MAX_MESSAGES_PER_CONVERSATION || '100'),
  MAX_CONVERSATIONS_PER_USER: parseInt(process.env.MAX_CONVERSATIONS_PER_USER || '50'),

  // Configuración de streaming
  STREAM_ENABLED: process.env.AI_STREAM_ENABLED !== 'false', // Por defecto habilitado

  // Rate limiting específico del chat
  CHAT_RATE_LIMIT_PER_MINUTE: parseInt(process.env.CHAT_RATE_LIMIT_PER_MINUTE || '20'),
  CHAT_RATE_LIMIT_PER_HOUR: parseInt(process.env.CHAT_RATE_LIMIT_PER_HOUR || '200'),
} as const
