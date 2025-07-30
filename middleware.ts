// Next.js middleware for multitenant routing
import { NextRequest, NextResponse } from 'next/server';
import { tenantMiddleware } from './src/lib/middleware/tenant-middleware';

export async function middleware(request: NextRequest) {
  return await tenantMiddleware(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/health (health check endpoint)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!api/health|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
