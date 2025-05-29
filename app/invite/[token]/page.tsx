"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { supabase } from "@/lib/supabase"
import { getInvitationDetails, acceptInvitation } from "@/app/actions/invitation-actions"
import { Zap, Calendar, Users, CheckCircle, AlertCircle, Loader2, Mail, Share2 } from "lucide-react"

export default function InvitePage() {
  const params = useParams()
  const router = useRouter()
  const [invitation, setInvitation] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    loadInvitation()
    checkUser()
  }, [params.token])

  const checkUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    setUser(user)
  }

  const loadInvitation = async () => {
    try {
      const result = await getInvitationDetails(params.token as string)
      if (result.success) {
        setInvitation(result.invitation)
      } else {
        setError(result.error || "Invitation not found")
      }
    } catch (error) {
      setError("Failed to load invitation")
    } finally {
      setLoading(false)
    }
  }

  const handleAcceptInvitation = async () => {
    if (!user) {
      setError("Please sign in to accept this invitation")
      return
    }

    setAccepting(true)
    setError("")
    setSuccess("")

    try {
      const result = await acceptInvitation(params.token as string, user.email)
      if (result.success) {
        if (result.alreadyMember) {
          setSuccess("You're already a member of this hackathon!")
          // Redirect to shared hackathons page after 2 seconds
          setTimeout(() => {
            router.push("/shared")
          }, 2000)
        } else {
          setSuccess(
            result.message || "Successfully joined the hackathon! It will now appear in your shared hackathons.",
          )
          // Redirect to shared hackathons page after 2 seconds
          setTimeout(() => {
            router.push("/shared")
          }, 2000)
        }
      } else {
        setError(result.error || "Failed to accept invitation")
      }
    } catch (error) {
      setError("Failed to accept invitation")
    } finally {
      setAccepting(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen animated-bg flex items-center justify-center">
        <Card className="w-full max-w-md border-glow bg-dark-surface/80 backdrop-blur-sm">
          <CardContent className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-electric-blue" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error && !invitation) {
    return (
      <div className="min-h-screen animated-bg flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-glow bg-dark-surface/80 backdrop-blur-sm">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <CardTitle className="text-xl text-glow">Invalid Invitation</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/")} className="w-full">
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen animated-bg flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl border-glow bg-dark-surface/80 backdrop-blur-sm">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Zap className="h-8 w-8 text-electric-blue" />
            <CardTitle className="text-2xl font-bold text-glow text-electric-blue">Hackathon Invitation</CardTitle>
          </div>
          <CardDescription>You've been invited to join an exciting hackathon project!</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Invitation Details */}
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="text-xl font-bold text-glow mb-2">{invitation?.hackathon?.title}</h2>
              <Badge variant="outline" className="border-electric-blue text-electric-blue">
                {invitation?.hackathon?.theme}
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-dark-bg border border-dark-border">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-electric-blue" />
                  <span className="font-medium">Schedule</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {formatDate(invitation?.hackathon?.start_time)} - {formatDate(invitation?.hackathon?.end_time)}
                </p>
              </div>

              <div className="p-4 rounded-lg bg-dark-bg border border-dark-border">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4 text-electric-blue" />
                  <span className="font-medium">Team Size</span>
                </div>
                <p className="text-sm text-muted-foreground">Up to {invitation?.hackathon?.team_size} members</p>
              </div>
            </div>

            {invitation?.hackathon?.goal && (
              <div className="p-4 rounded-lg bg-dark-bg border border-dark-border">
                <h4 className="font-medium mb-2">Project Goal</h4>
                <p className="text-sm text-muted-foreground">{invitation.hackathon.goal}</p>
              </div>
            )}

            {invitation?.hackathon?.description && (
              <div className="p-4 rounded-lg bg-dark-bg border border-dark-border">
                <h4 className="font-medium mb-2">Description</h4>
                <p className="text-sm text-muted-foreground">{invitation.hackathon.description}</p>
              </div>
            )}

            <div className="p-4 rounded-lg bg-electric-blue/10 border border-electric-blue/30">
              <div className="flex items-center gap-2 mb-2">
                <Mail className="h-4 w-4 text-electric-blue" />
                <span className="font-medium text-electric-blue">Invited by</span>
              </div>
              <p className="text-sm">
                {invitation?.inviter?.full_name || invitation?.inviter?.email} ({invitation?.inviter?.email})
              </p>
            </div>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <Alert className="border-red-500/30 bg-red-500/10">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-red-400">{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-electric-green/30 bg-electric-green/10">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription className="text-electric-green">
                {success}
                <div className="mt-2 flex items-center gap-1 text-sm">
                  <Share2 className="h-3 w-3" />
                  Redirecting to your shared hackathons...
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="space-y-4">
            {!user ? (
              <div className="text-center space-y-4">
                <p className="text-muted-foreground">Please sign in to accept this invitation</p>
                <Button
                  onClick={() => router.push("/")}
                  className="w-full bg-electric-blue hover:bg-electric-blue/80 text-dark-bg font-semibold"
                >
                  Sign In
                </Button>
              </div>
            ) : invitation?.status === "accepted" ? (
              <div className="text-center space-y-4">
                <p className="text-electric-green">This invitation has already been accepted!</p>
                <Button
                  onClick={() => router.push("/shared")}
                  className="w-full bg-electric-blue hover:bg-electric-blue/80 text-dark-bg font-semibold"
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  View Shared Hackathons
                </Button>
              </div>
            ) : (
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  onClick={() => router.push("/")}
                  className="flex-1 border-dark-border hover:bg-dark-surface"
                >
                  Maybe Later
                </Button>
                <Button
                  onClick={handleAcceptInvitation}
                  disabled={accepting}
                  className="flex-1 bg-electric-blue hover:bg-electric-blue/80 text-dark-bg font-semibold"
                >
                  {accepting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Joining...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Accept Invitation
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
