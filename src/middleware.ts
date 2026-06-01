import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public routes
  if (pathname === '/' || pathname === '/login' || pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // Protect dashboard
  if (pathname.startsWith('/dashboard')) {
    // Check demo mode cookie
    const isDemo = request.cookies.get('sinap-demo')?.value === 'true'
    if (isDemo) return NextResponse.next()

    // Check NextAuth session
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
    if (!token) {
      const loginUrl = new URL('/login', request.url)
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*'],
}
