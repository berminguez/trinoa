// Check critical environment variables
export function GET() {
  const criticalVars = {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    DATABASE_URI: process.env.DATABASE_URI ? '✅ Set' : '❌ Missing',
    PAYLOAD_SECRET: process.env.PAYLOAD_SECRET ? '✅ Set' : '❌ Missing',
    NEXT_PUBLIC_SERVER_URL: process.env.NEXT_PUBLIC_SERVER_URL,
  }

  return Response.json(
    {
      status: 'Environment Check',
      timestamp: new Date().toISOString(),
      vars: criticalVars,
      nodeVersion: process.version,
      platform: process.platform,
    },
    { status: 200 },
  )
}
