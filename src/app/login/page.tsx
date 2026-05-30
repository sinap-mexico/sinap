'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, Suspense } from 'react'
import { LoginScreen } from '@/components/sinap/login-screen'

function LoginContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  // After successful login, the LoginScreen component handles auth via next-auth
  // and the middleware will redirect to /dashboard automatically
  // This page just renders the login screen as a standalone route

  return <LoginScreen />
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen w-full items-center justify-center bg-white">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#534AB7] border-t-transparent" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}
