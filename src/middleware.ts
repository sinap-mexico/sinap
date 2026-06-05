import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public routes
  if (pathname === '/' || pathname === '/login' || pathname === '/reset-password' || pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // Allow trial-expired page
  if (pathname === '/trial-expired') {
    return NextResponse.next()
  }

  // Protect dashboard (both /dashboard and /dashboard/*)
  if (pathname === '/dashboard' || pathname.startsWith('/dashboard/')) {
    // Check demo mode cookie
    const isDemo = request.cookies.get('sinap-demo')?.value === 'true'
    if (isDemo) return NextResponse.next()

    // Check for NextAuth session cookie directly (more reliable than getToken on Edge)
    // NextAuth sets one of these cookies when a user is authenticated:
    const sessionCookie = request.cookies.get('next-auth.session-token')?.value
      || request.cookies.get('__Secure-next-auth.session-token')?.value

    if (!sessionCookie) {
      const loginUrl = new URL('/login', request.url)
      return NextResponse.redirect(loginUrl)
    }

    // Session cookie exists — let the request through
    // Actual session validation (JWT decode, trial check) happens client-side
    // and in individual API route handlers via requireAuth()
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard', '/dashboard/:path*'],
}
