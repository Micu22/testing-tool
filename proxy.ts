import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // 1. Public Paths (Always allowed)
  // - /login (The login page itself)
  // - /api/login (The login API handle)
  // - /session/* (The patient access token)
  // - /_next/* (Static assets, JS bundles)
  // - /favicon.ico, /public/* (Static files)
  if (
    path.startsWith('/login') ||
    path.startsWith('/api/login') ||
    path.startsWith('/session/') ||
    path.startsWith('/_next') ||
    path.startsWith('/static') ||
    path.includes('.') // Crude check for files like logo.png, favicon.ico
  ) {
    return NextResponse.next();
  }

  // 2. Protected Paths
  // - / (Home / Create Session)
  // - /admin/* (Admin Dashboard)
  
  const authToken = request.cookies.get('auth_token')?.value;

  if (authToken !== 'valid') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
