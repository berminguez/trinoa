// Railway infrastructure test - zero dependencies
export function GET() {
  return new Response(`
Railway Test Results:
- Time: ${new Date().toISOString()}
- Node: ${process.version}
- Platform: ${process.platform}
- Arch: ${process.arch}
- Memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB
- Port: ${process.env.PORT}
- Railway: ${process.env.RAILWAY_ENVIRONMENT || 'not detected'}
- Status: RUNNING ✅
`, {
    status: 200,
    headers: { 'Content-Type': 'text/plain' }
  })
}