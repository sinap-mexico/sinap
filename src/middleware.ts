import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Simple middleware without NextAuth — auth is handled client-side
// This avoids redirect loops caused by withAuth when no database is connected
export function middleware(request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: [
    // Only apply to API routes that need future auth protection
    // Currently no server-side auth is enforced since we use client-side Zustand + NextAuth optional
  ],
}
