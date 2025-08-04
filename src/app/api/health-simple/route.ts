// Ultra simple health check with zero imports
export async function GET() {
  return Response.json({ status: 'ok', time: Date.now() })
}
