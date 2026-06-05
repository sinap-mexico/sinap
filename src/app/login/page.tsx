'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense } from 'react'
import { LoginScreen } from '@/components/sinap/login-screen'

function LoginContent() {
  const searchParams = useSearchParams()

  // NextAuth redirects to /login?error=CredentialsSignin when login fails.
  // We pass this to LoginScreen so it can display the error message.
  const authError = searchParams.get('error')
  const resetSuccess = searchParams.get('reset') === 'success'

  return <LoginScreen authError={authError} resetSuccess={resetSuccess} />
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
