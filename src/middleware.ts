import { withAuth } from "next-auth/middleware"

export default withAuth({
  pages: {
    signIn: "/login",
  },
})

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/orchestrator/:path*",
    "/api/patients/:path*",
    "/api/appointments/:path*",
    "/api/facturama/:path*",
    "/api/events/:path*",
    "/api/soap/:path*",
    "/api/preconsulta/:path*",
  ],
}
