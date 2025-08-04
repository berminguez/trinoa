# Variables de Entorno - Chat IA con RAG

Este documento describe las variables de entorno necesarias para el sistema de chat IA con RAG del playground.

## Variables Requeridas

### OpenAI (Requerido)
```bash
# Clave API de OpenAI para Vercel AI SDK
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## Variables Opcionales de Chat IA

### Configuración del Modelo
```bash
# Modelo de OpenAI para chat (por defecto: gpt-4)
AI_CHAT_MODEL=gpt-4

# Temperatura del modelo (0.0 - 2.0, por defecto: 0.7)
AI_CHAT_TEMPERATURE=0.7

# Máximo número de tokens en respuesta (por defecto: 2048)
AI_CHAT_MAX_TOKENS=2048

# Top-p para muestreo (0.0 - 1.0, por defecto: 1)
AI_CHAT_TOP_P=1
```

### Configuración RAG
```bash
# Número de documentos a recuperar en búsqueda RAG (por defecto: 5)
RAG_TOP_K=5

# Umbral de similitud para documentos RAG (0.0 - 1.0, por defecto: 0.7)
RAG_SIMILARITY_THRESHOLD=0.7

# Máximo contexto en tokens para RAG (por defecto: 8000)
RAG_MAX_CONTEXT_LENGTH=8000
```

### Límites de Conversación
```bash
# Máximo número de mensajes por conversación (por defecto: 100)
MAX_MESSAGES_PER_CONVERSATION=100

# Máximo número de conversaciones por usuario (por defecto: 50)
MAX_CONVERSATIONS_PER_USER=50
```

### Configuración de Streaming
```bash
# Habilitar streaming de respuestas (por defecto: true)
AI_STREAM_ENABLED=true
```

### Rate Limiting del Chat
```bash
# Límite de mensajes por minuto por usuario (por defecto: 20)
CHAT_RATE_LIMIT_PER_MINUTE=20

# Límite de mensajes por hora por usuario (por defecto: 200)
CHAT_RATE_LIMIT_PER_HOUR=200
```

## Variables Existentes (No Modificar)

El sistema de chat utiliza también estas variables ya configuradas:

### Pinecone (Para RAG)
```bash
PINECONE_API_KEY=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
PINECONE_ENVIRONMENT=us-east-1-aws
PINECONE_INDEX_NAME=resources-chunks
```

### Base de Datos
```bash
DATABASE_URI=mongodb://localhost:27017/eidetik-dev
```

## Ejemplo de Configuración Completa

```bash
# OpenAI (Requerido)
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Chat IA (Opcional - valores por defecto)
AI_CHAT_MODEL=gpt-4
AI_CHAT_TEMPERATURE=0.7
AI_CHAT_MAX_TOKENS=2048
AI_CHAT_TOP_P=1

# RAG (Opcional - valores por defecto)
RAG_TOP_K=5
RAG_SIMILARITY_THRESHOLD=0.7
RAG_MAX_CONTEXT_LENGTH=8000

# Límites (Opcional - valores por defecto)
MAX_MESSAGES_PER_CONVERSATION=100
MAX_CONVERSATIONS_PER_USER=50

# Streaming (Opcional - por defecto habilitado)
AI_STREAM_ENABLED=true

# Rate Limiting (Opcional - valores por defecto)
CHAT_RATE_LIMIT_PER_MINUTE=20
CHAT_RATE_LIMIT_PER_HOUR=200
```

## Notas

1. **OPENAI_API_KEY** es la única variable requerida. El resto tienen valores por defecto.
2. Las variables se cargan desde `src/lib/config.ts` y están disponibles como `CONFIG` y `CHAT_CONFIG`.
3. Para desarrollo local, añade estas variables a tu archivo `.env` en la raíz del proyecto.
4. Para producción, configúralas en tu plataforma de despliegue.

## Verificación

Para verificar que las variables están configuradas correctamente:

```bash
# Verificar que OpenAI API Key está configurado
node -e "console.log(process.env.OPENAI_API_KEY ? 'OpenAI configurado' : 'OpenAI NO configurado')"
``` 