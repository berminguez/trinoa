// Endpoint súper simple sin imports pesados para probar que Next.js arranca
export async function GET() {
  return new Response('OK - Next.js is running', {
    status: 200,
    headers: { 'Content-Type': 'text/plain' },
  })
}
