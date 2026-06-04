import NextAuth from "next-auth"
import { getAuthOptions } from "@/lib/auth"

// CRITICAL FIX: Call getAuthOptions() on EVERY request, not at module load time.
// In Vercel serverless, process.env.NEXTAUTH_SECRET may not be available during
// module initialization on cold starts. By using a wrapper function, we ensure
// the secret is read fresh on each request.
const handler = (...args: Parameters<typeof NextAuth>) => {
  return NextAuth(args[0], args[1], getAuthOptions())
}

export { handler as GET, handler as POST }
