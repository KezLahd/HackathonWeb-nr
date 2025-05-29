"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, AlertCircle, Loader2, Zap } from "lucide-react"

export default function ConfirmPage() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("")
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    const confirmEmail = async () => {
      try {
        const token = searchParams.get("token")
        const email = searchParams.get("email")

        if (!token || !email) {
          setStatus("error")
          setMessage("Invalid confirmation link. Please check your email for the correct link.")
          return
        }

        // In a real implementation, you'd verify the token and activate the account
        // For now, we'll simulate the confirmation process
        console.log("📧 Confirming email for:", email)

        // Simulate API call delay
        await new Promise((resolve) => setTimeout(resolve, 2000))

        setStatus("success")
        setMessage("Your email has been confirmed! You can now sign in to your account.")

        // Redirect to sign in after 3 seconds
        setTimeout(() => {
          router.push("/")
        }, 3000)
      } catch (error) {
        console.error("❌ Confirmation error:", error)
        setStatus("error")
        setMessage("Failed to confirm your email. Please try again or contact support.")
      }
    }

    confirmEmail()
  }, [searchParams, router])

  return (
    <div className="min-h-screen flex items-center justify-center animated-bg p-4">
      <Card className="w-full max-w-md border-glow bg-dark-surface/80 backdrop-blur-sm">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            {status === "loading" && <Loader2 className="h-8 w-8 text-electric-blue animate-spin" />}
            {status === "success" && <CheckCircle className="h-8 w-8 text-electric-green" />}
            {status === "error" && <AlertCircle className="h-8 w-8 text-red-400" />}
            <Zap className="h-8 w-8 text-electric-blue" />
          </div>
          <CardTitle className="text-2xl font-bold text-glow text-electric-blue">
            {status === "loading" && "Confirming Email..."}
            {status === "success" && "Email Confirmed!"}
            {status === "error" && "Confirmation Failed"}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <Alert
            className={`${
              status === "success"
                ? "border-electric-green/30 bg-electric-green/10"
                : status === "error"
                  ? "border-red-500/30 bg-red-500/10"
                  : "border-electric-blue/30 bg-electric-blue/10"
            }`}
          >
            {status === "loading" && <Loader2 className="h-4 w-4 animate-spin" />}
            {status === "success" && <CheckCircle className="h-4 w-4" />}
            {status === "error" && <AlertCircle className="h-4 w-4" />}
            <AlertDescription
              className={
                status === "success"
                  ? "text-electric-green"
                  : status === "error"
                    ? "text-red-400"
                    : "text-electric-blue"
              }
            >
              {message}
            </AlertDescription>
          </Alert>

          {status === "success" && (
            <div className="text-center text-sm text-muted-foreground">Redirecting to sign in page in 3 seconds...</div>
          )}

          {status === "error" && (
            <Button
              onClick={() => router.push("/")}
              className="w-full bg-electric-blue hover:bg-electric-blue/80 text-dark-bg"
            >
              Back to Sign In
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
