"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { EnhancedAuthForm } from "@/components/auth/enhanced-auth-form"
import { Dashboard } from "@/components/dashboard/dashboard"

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [authChecked, setAuthChecked] = useState(false)

  useEffect(() => {
    let mounted = true

    const initializeAuth = async () => {
      try {
        console.log("🔍 Starting auth initialization...")

        // Get current session
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession()

        console.log("📋 Session check result:", {
          hasSession: !!session,
          hasUser: !!session?.user,
          error: sessionError?.message,
        })

        if (mounted) {
          if (session?.user && !sessionError) {
            console.log("✅ Valid session found, setting user")
            setUser(session.user)

            // Ensure profile exists (non-blocking)
            ensureProfile(session.user)
          } else {
            console.log("❌ No valid session, user needs to sign in")
            setUser(null)
          }

          setAuthChecked(true)
          setLoading(false)
        }
      } catch (error) {
        console.error("❌ Auth initialization error:", error)
        if (mounted) {
          setUser(null)
          setAuthChecked(true)
          setLoading(false)
        }
      }
    }

    // Initialize auth immediately
    initializeAuth()

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("🔄 Auth state change:", event, !!session?.user)

      if (mounted) {
        if (event === "SIGNED_IN" && session?.user) {
          console.log("✅ User signed in")
          setUser(session.user)
          ensureProfile(session.user)
        } else if (event === "SIGNED_OUT") {
          console.log("👋 User signed out")
          setUser(null)
        } else if (event === "TOKEN_REFRESHED" && session?.user) {
          console.log("🔄 Token refreshed")
          setUser(session.user)
        }

        setAuthChecked(true)
        setLoading(false)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  // Ensure profile exists (non-blocking)
  const ensureProfile = async (user: any) => {
    try {
      const { data: existingProfile } = await supabase.from("profiles").select("id").eq("id", user.id).single()

      if (!existingProfile) {
        console.log("📝 Creating profile for user:", user.id)
        const { error } = await supabase.from("profiles").insert({
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
          created_at: new Date().toISOString(),
        })

        if (error && error.code !== "23505") {
          console.error("❌ Profile creation failed:", error)
        } else {
          console.log("✅ Profile created successfully")
        }
      }
    } catch (error) {
      console.error("❌ Profile check/creation error:", error)
    }
  }

  // Show loading only for a short time
  if (loading && !authChecked) {
    return (
      <div className="min-h-screen animated-bg flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-pulse text-electric-blue text-2xl font-bold">Loading...</div>
          <div className="text-sm text-muted-foreground">Checking authentication...</div>
        </div>
      </div>
    )
  }

  // Show auth form if no user
  if (!user) {
    return (
      <EnhancedAuthForm
        onSuccess={() => {
          // The auth state change listener will handle setting the user
          console.log("🎉 Auth success callback triggered")
        }}
      />
    )
  }

  // Show dashboard if user is authenticated
  return <Dashboard onSignOut={() => setUser(null)} />
}
