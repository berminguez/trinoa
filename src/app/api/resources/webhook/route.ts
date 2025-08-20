/**
 * POST /api/resources/webhook
 *
 * Webhook endpoint que busca resources por executionId en lugar de por ID directo.
 *
 * Este endpoint reemplaza la funcionalidad de /:id/webhook para casos donde
 * no se tiene el resourceId disponible (como en beforeChange hooks).
 *
 * Formato esperado del body:
 * {
 *   "executionId": "12345",
 *   "status": "completed" | "failed" | "error",
 *   "analyzeResult": { ... }, // Para casos exitosos
 *   "errorMessage": "...", // Para casos de error
 *   "modelId": "...",
 *   "modelo": "...",
 *   "caso": "...",
 *   "tipo": "..."
 * }
 */

export async function GET() {
  return Response.json({
    success: true,
    message: 'Resources webhook endpoint (by executionId)',
    usage: 'POST con executionId en el body para procesar webhooks de n8n',
    example: {
      executionId: '12345',
      status: 'completed',
      analyzeResult: {
        fields: {
          campo1: { value: 'valor1', confidence: 0.95 },
          campo2: { value: 'valor2', confidence: 0.87 },
        },
      },
      modelId: 'model-123',
      modelo: 'azure-document-intelligence',
      caso: 'factura_suministros',
      tipo: 'electricidad',
    },
  })
}

export async function POST() {
  return Response.json(
    {
      success: false,
      error: 'Use the webhook endpoint in the Resources collection instead of this API route',
    },
    { status: 400 },
  )
}
