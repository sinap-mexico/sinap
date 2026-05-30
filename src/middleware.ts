import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth({
  pages: {
    signIn: "/login",
  },
})

export const config = {
  matcher: [
    "/api/orchestrator/:path*",
    "/api/patients/:path*",
    "/api/appointments/:path*",
    "/api/facturama/:path*",
    "/api/events/:path*",
    "/api/soap/:path*",
    "/api/preconsulta/:path*",
  ],
}
