"use client"

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react"
import type { Session } from "next-auth"

interface SinapSessionContextType {
  data: Session | null
  status: "loading" | "authenticated" | "unauthenticated"
  update: () => Promise<Session | null>
}

const SinapSessionContext = createContext<SinapSessionContextType>({
  data: null,
  status: "loading",
  update: async () => null,
})

// Custom session provider that fetches from /api/auth/custom-session
// instead of NextAuth's broken /api/auth/session (which doesn't work with Next.js 16)
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [status, setStatus] = useState<"loading" | "authenticated" | "unauthenticated">("loading")

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/custom-session')
      if (!res.ok) {
        setSession(null)
        setStatus("unauthenticated")
        return null
      }
      const data = await res.json()
      if (data.user) {
        setSession(data as Session)
        setStatus("authenticated")
        return data as Session
      } else {
        setSession(null)
        setStatus("unauthenticated")
        return null
      }
    } catch {
      setSession(null)
      setStatus("unauthenticated")
      return null
    }
  }, [])

  useEffect(() => {
    fetchSession()
    // Refetch every 5 minutes
    const interval = setInterval(fetchSession, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchSession])

  // Refetch on window focus
  useEffect(() => {
    const onFocus = () => fetchSession()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [fetchSession])

  return (
    <SinapSessionContext.Provider value={{ data: session, status, update: fetchSession }}>
      {children}
    </SinapSessionContext.Provider>
  )
}

export function useSession() {
  return useContext(SinapSessionContext)
}
