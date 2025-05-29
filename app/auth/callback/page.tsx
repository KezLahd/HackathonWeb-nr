"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { data, error } = await supabase.auth.getSession()

        if (error) {
          console.error("Auth callback error:", error)
          router.push("/?error=auth_callback_failed")
          return
        }

        if (data.session) {
          console.log("✅ Auth callback successful")
          router.push("/")
        } else {
          console.log("❌ No session found in callback")
          router.push("/")
        }
      } catch (error) {
        console.error("Auth callback error:", error)
        router.push("/")
      }
    }

    handleAuthCallback()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center animated-bg">
      <div className="text-center space-y-4">
        <div className="animate-pulse text-electric-blue text-2xl font-bold">Completing sign in...</div>
      </div>
    </div>
  )
}
