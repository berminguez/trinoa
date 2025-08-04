// Simple status endpoint
export function GET() {
  return Response.json({
    status: 'Server is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
  })
}
