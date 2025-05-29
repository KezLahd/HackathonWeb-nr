"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { supabase } from "@/lib/supabase"
import { Loader2, Zap, Mail, CheckCircle, AlertCircle, LogIn, UserPlus } from "lucide-react"

interface EnhancedAuthFormProps {
  onSuccess: () => void
}

export function EnhancedAuthForm({ onSuccess }: EnhancedAuthFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [needsEmailConfirmation, setNeedsEmailConfirmation] = useState(false)
  const [activeTab, setActiveTab] = useState("signin")

  const [earlyAccessCode, setEarlyAccessCode] = useState("")
  const [hasEarlyAccess, setHasEarlyAccess] = useState(false)
  const [earlyAccessError, setEarlyAccessError] = useState("")

  const validateEarlyAccess = () => {
    if (earlyAccessCode.trim() === "Paris69") {
      setHasEarlyAccess(true)
      setEarlyAccessError("")
      // Stay on signup tab, but now with access
    } else {
      setEarlyAccessError("Invalid early access code. Please contact support for access.")
    }
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    setSuccess("")

    try {
      console.log("🔐 Attempting sign in for:", email)

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (error) {
        console.error("❌ Sign in error:", error)
        if (error.message.includes("Invalid login credentials")) {
          setError("Invalid email or password. Please check your credentials and try again.")
        } else if (error.message.includes("Email not confirmed")) {
          setError("Please check your email and click the confirmation link before signing in.")
        } else {
          setError(error.message)
        }
        return
      }

      if (data.user && data.session) {
        console.log("✅ Sign in successful")
        setSuccess("Successfully signed in!")

        // Small delay to show success message, then the auth state change will handle the rest
        setTimeout(() => {
          onSuccess()
        }, 500)
      }
    } catch (error: any) {
      console.error("❌ Unexpected sign in error:", error)
      setError("An unexpected error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    setSuccess("")

    // Validation (keep existing validation code)
    if (password !== confirmPassword) {
      setError("Passwords do not match")
      setIsLoading(false)
      return
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long")
      setIsLoading(false)
      return
    }

    // Check password strength (keep existing code)
    const hasLower = /[a-z]/.test(password)
    const hasUpper = /[A-Z]/.test(password)
    const hasNumber = /[0-9]/.test(password)
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password)

    if (!hasLower || !hasUpper || !hasNumber || !hasSpecial) {
      setError("Password must contain at least one lowercase letter, uppercase letter, number, and special character")
      setIsLoading(false)
      return
    }

    try {
      console.log("📝 Attempting sign up for:", email)

      // Create user with Supabase but disable email confirmation
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        console.error("❌ Sign up error:", error)
        if (error.message.includes("User already registered")) {
          setError("An account with this email already exists. Please sign in instead.")
        } else {
          setError(error.message)
        }
        return
      }

      if (data.user) {
        // Send custom confirmation email
        try {
          const confirmationUrl = `${window.location.origin}/auth/confirm?token=${data.user.id}&email=${encodeURIComponent(email)}`

          const emailResponse = await fetch("/api/auth/send-confirmation", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: email.trim(),
              confirmationUrl,
              fullName: fullName.trim(),
            }),
          })

          if (emailResponse.ok) {
            console.log("✅ Custom confirmation email sent")
            setNeedsEmailConfirmation(true)
            setSuccess("Account created! Please check your email for a confirmation link.")
          } else {
            console.error("❌ Failed to send custom email")
            setError("Account created but failed to send confirmation email. Please contact support.")
          }
        } catch (emailError) {
          console.error("❌ Email sending error:", emailError)
          setError("Account created but failed to send confirmation email. Please contact support.")
        }
      }
    } catch (error: any) {
      console.error("❌ Unexpected sign up error:", error)
      setError("An unexpected error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  if (needsEmailConfirmation) {
    return (
      <div className="min-h-screen flex items-center justify-center animated-bg p-4">
        <Card className="w-full max-w-md border-glow bg-dark-surface/80 backdrop-blur-sm">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Mail className="h-8 w-8 text-electric-blue" />
              <CardTitle className="text-2xl font-bold text-glow text-electric-blue">Check Your Email</CardTitle>
            </div>
            <CardDescription>
              We've sent a confirmation link to <strong>{email}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="border-electric-blue/30 bg-electric-blue/10">
              <Mail className="h-4 w-4" />
              <AlertDescription>
                Click the confirmation link in your email to activate your account, then return here to sign in.
              </AlertDescription>
            </Alert>
            <Button
              onClick={() => {
                setNeedsEmailConfirmation(false)
                setActiveTab("signin")
                setEmail("")
                setPassword("")
                setFullName("")
                setConfirmPassword("")
                setError("")
                setSuccess("")
              }}
              className="w-full bg-electric-blue hover:bg-electric-blue/80 text-dark-bg"
            >
              Back to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Early Access Gate
  if (!hasEarlyAccess && activeTab === "signup") {
    return (
      <div className="min-h-screen flex items-center justify-center animated-bg p-4">
        <Card className="w-full max-w-md border-glow bg-dark-surface/80 backdrop-blur-sm">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Zap className="h-8 w-8 text-electric-blue" />
              <CardTitle className="text-2xl font-bold text-glow text-electric-blue">Early Access Required</CardTitle>
            </div>
            <CardDescription className="text-muted-foreground">
              Enter your early access code to create an account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              type="text"
              placeholder="Enter early access code"
              value={earlyAccessCode}
              onChange={(e) => setEarlyAccessCode(e.target.value)}
              className="bg-dark-bg border-dark-border focus:border-electric-blue"
              onKeyPress={(e) => e.key === "Enter" && validateEarlyAccess()}
            />
            <Button
              onClick={validateEarlyAccess}
              className="w-full bg-electric-blue hover:bg-electric-blue/80 text-dark-bg font-semibold"
            >
              Verify Access Code
            </Button>
            <Button
              onClick={() => {
                setActiveTab("signin")
                setEarlyAccessCode("")
                setEarlyAccessError("")
              }}
              variant="outline"
              className="w-full border-dark-border hover:bg-dark-bg"
            >
              Back to Sign In
            </Button>

            {earlyAccessError && (
              <Alert className="border-red-500/30 bg-red-500/10">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-red-400">{earlyAccessError}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center animated-bg p-4">
      <Card className="w-full max-w-md border-glow bg-dark-surface/80 backdrop-blur-sm">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Zap className="h-8 w-8 text-electric-blue" />
            <CardTitle className="text-2xl font-bold text-glow text-electric-blue">Hackathon Planner</CardTitle>
          </div>
          <CardDescription className="text-muted-foreground">
            Plan, execute, and dominate your next hackathon
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 bg-dark-bg border border-dark-border rounded-lg p-1">
              <TabsTrigger
                value="signin"
                className={`flex items-center gap-2 rounded-md transition-all duration-200 ${
                  activeTab === "signin"
                    ? "bg-dark-surface text-electric-blue shadow-lg font-semibold"
                    : "text-muted-foreground hover:text-electric-blue hover:bg-dark-surface"
                }`}
              >
                <LogIn className="h-4 w-4" />
                Sign In
              </TabsTrigger>
              <TabsTrigger
                value="signup"
                className={`flex items-center gap-2 rounded-md transition-all duration-200 ${
                  activeTab === "signup"
                    ? "bg-electric-blue text-dark-bg shadow-lg shadow-electric-blue/20 font-semibold"
                    : "text-muted-foreground hover:text-electric-blue hover:bg-dark-surface"
                }`}
              >
                <UserPlus className="h-4 w-4" />
                Sign Up
              </TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="space-y-4 mt-6">
              <form onSubmit={handleSignIn} className="space-y-4">
                <Input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-dark-bg border-dark-border focus:border-electric-blue"
                />
                <Input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-dark-bg border-dark-border focus:border-electric-blue"
                />
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-electric-blue hover:bg-electric-blue/80 text-dark-bg font-semibold"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign In"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="space-y-4 mt-6">
              <form onSubmit={handleSignUp} className="space-y-4">
                <Input
                  type="text"
                  placeholder="Full Name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="bg-dark-bg border-dark-border focus:border-electric-blue"
                />
                <Input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-dark-bg border-dark-border focus:border-electric-blue"
                />
                <Input
                  type="password"
                  placeholder="Password (8+ chars, mixed case, numbers, symbols)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="bg-dark-bg border-dark-border focus:border-electric-blue"
                />
                <Input
                  type="password"
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="bg-dark-bg border-dark-border focus:border-electric-blue"
                />

                {/* Password Requirements */}
                <div className="text-xs text-muted-foreground space-y-1">
                  <div className="font-medium">Password must contain:</div>
                  <div className="grid grid-cols-2 gap-1">
                    <div className={`flex items-center gap-1 ${/[a-z]/.test(password) ? "text-electric-green" : ""}`}>
                      <div
                        className={`h-1 w-1 rounded-full ${/[a-z]/.test(password) ? "bg-electric-green" : "bg-muted-foreground"}`}
                      />
                      Lowercase
                    </div>
                    <div className={`flex items-center gap-1 ${/[A-Z]/.test(password) ? "text-electric-green" : ""}`}>
                      <div
                        className={`h-1 w-1 rounded-full ${/[A-Z]/.test(password) ? "bg-electric-green" : "bg-muted-foreground"}`}
                      />
                      Uppercase
                    </div>
                    <div className={`flex items-center gap-1 ${/[0-9]/.test(password) ? "text-electric-green" : ""}`}>
                      <div
                        className={`h-1 w-1 rounded-full ${/[0-9]/.test(password) ? "bg-electric-green" : "bg-muted-foreground"}`}
                      />
                      Number
                    </div>
                    <div
                      className={`flex items-center gap-1 ${/[!@#$%^&*(),.?":{}|<>]/.test(password) ? "text-electric-green" : ""}`}
                    >
                      <div
                        className={`h-1 w-1 rounded-full ${/[!@#$%^&*(),.?":{}|<>]/.test(password) ? "bg-electric-green" : "bg-muted-foreground"}`}
                      />
                      Symbol
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-electric-blue hover:bg-electric-blue/80 text-dark-bg font-semibold"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          {/* Error/Success Messages */}
          {error && (
            <Alert className="mt-4 border-red-500/30 bg-red-500/10">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-red-400">{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mt-4 border-electric-green/30 bg-electric-green/10">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription className="text-electric-green">{success}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
