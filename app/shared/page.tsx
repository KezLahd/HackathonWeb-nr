"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { supabase } from "@/lib/supabase"
import { getUserSharedHackathons } from "@/app/actions/invitation-actions"
import { Calendar, Users, ArrowRight, Share2, Loader2, AlertTriangle } from "lucide-react"

interface SharedHackathon {
  id: string
  title: string
  description: string
  theme: string
  goal: string
  start_time: string
  end_time: string
  team_size: number
  creator?: {
    full_name: string | null
    email: string | null
  } | null
  invitation_status?: string
  invited_at?: string
}

export default function SharedHackathonsPage() {
  const router = useRouter()
  const [hackathons, setHackathons] = useState<SharedHackathon[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    loadUserAndHackathons()
  }, [])

  const loadUserAndHackathons = async () => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        console.error("User not authenticated:", userError)
        router.push("/")
        return
      }

      setUser(user)

      const result = await getUserSharedHackathons(user.email!)
      if (result.success) {
        setHackathons(result.hackathons)
        setError(null)
      } else {
        console.error("Error loading shared hackathons:", result.error)
        setError(result.error || "Failed to load shared hackathons")
      }
    } catch (error: any) {
      console.error("Error loading shared hackathons:", error)
      setError("An unexpected error occurred")
    } finally {
      setLoading(false)
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

  const getStatusBadge = (hackathon: SharedHackathon) => {
    const now = new Date()
    const startTime = new Date(hackathon.start_time)
    const endTime = new Date(hackathon.end_time)

    if (hackathon.invitation_status === "pending") {
      return <Badge className="bg-yellow-500 text-dark-bg">Invitation Pending</Badge>
    } else if (now >= startTime && now <= endTime) {
      return <Badge className="bg-electric-green text-dark-bg">Live</Badge>
    } else if (now < startTime) {
      return <Badge className="bg-neon-purple text-white">Upcoming</Badge>
    } else {
      return <Badge variant="secondary">Completed</Badge>
    }
  }

  const handleJoinHackathon = (hackathonId: string) => {
    router.push(`/hackathon/${hackathonId}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen animated-bg">
        <header className="border-b border-dark-border bg-dark-surface/80 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-2">
              <Share2 className="h-6 w-6 text-electric-blue" />
              <h1 className="text-xl font-bold text-glow text-electric-blue">Shared Hackathons</h1>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-electric-blue mx-auto mb-4" />
              <p className="text-muted-foreground">Loading shared hackathons...</p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen animated-bg">
        <header className="border-b border-dark-border bg-dark-surface/80 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Share2 className="h-6 w-6 text-electric-blue" />
                <h1 className="text-xl font-bold text-glow text-electric-blue">Shared Hackathons</h1>
              </div>
              <Button
                variant="outline"
                onClick={() => router.push("/")}
                className="border-dark-border hover:bg-dark-surface"
              >
                Back to Dashboard
              </Button>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          <Alert className="border-red-500/30 bg-red-500/10 max-w-md mx-auto">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-red-400">{error}</AlertDescription>
          </Alert>
          <div className="text-center mt-6">
            <Button
              onClick={() => loadUserAndHackathons()}
              className="bg-electric-blue hover:bg-electric-blue/80 text-dark-bg"
            >
              Try Again
            </Button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen animated-bg">
      <header className="border-b border-dark-border bg-dark-surface/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Share2 className="h-6 w-6 text-electric-blue" />
              <h1 className="text-xl font-bold text-glow text-electric-blue">Shared Hackathons</h1>
            </div>
            <Button
              variant="outline"
              onClick={() => router.push("/")}
              className="border-dark-border hover:bg-dark-surface"
            >
              Back to Dashboard
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-glow mb-2">Hackathons You've Joined</h2>
          <p className="text-muted-foreground">Collaborate with other teams and contribute to exciting projects</p>
        </div>

        {hackathons.length === 0 ? (
          <Card className="border-glow bg-dark-surface/80 backdrop-blur-sm">
            <CardHeader className="text-center py-12">
              <Share2 className="h-16 w-16 text-electric-blue mx-auto mb-4" />
              <CardTitle className="text-2xl text-glow">No Shared Hackathons Yet</CardTitle>
              <CardDescription className="text-lg">
                When someone invites you to join their hackathon, it will appear here
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button
                onClick={() => router.push("/")}
                className="bg-electric-blue hover:bg-electric-blue/80 text-dark-bg"
              >
                Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {hackathons.map((hackathon) => (
              <Card
                key={hackathon.id}
                className="border-glow bg-dark-surface/80 backdrop-blur-sm hover:bg-dark-surface/90 transition-all duration-300 group"
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg text-glow group-hover:text-electric-blue transition-colors">
                        {hackathon.title}
                      </CardTitle>
                      <CardDescription className="mt-1">{hackathon.description}</CardDescription>
                    </div>
                    {getStatusBadge(hackathon)}
                  </div>
                  <Badge variant="outline" className="w-fit border-electric-blue text-electric-blue">
                    {hackathon.theme}
                  </Badge>
                </CardHeader>

                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {formatDate(hackathon.start_time)} - {formatDate(hackathon.end_time)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>Team of {hackathon.team_size}</span>
                    </div>

                    {hackathon.creator && (
                      <div className="p-3 rounded-lg bg-dark-bg border border-dark-border">
                        <p className="text-xs text-muted-foreground mb-1">Created by</p>
                        <p className="text-sm font-medium">
                          {hackathon.creator.full_name || hackathon.creator.email || "Unknown Creator"}
                        </p>
                      </div>
                    )}

                    {hackathon.invitation_status === "pending" && hackathon.invited_at && (
                      <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                        <p className="text-xs text-yellow-400 mb-1">Invitation Status</p>
                        <p className="text-sm text-yellow-300">
                          Invited {formatDate(hackathon.invited_at)} - Pending your response
                        </p>
                      </div>
                    )}

                    {hackathon.goal && (
                      <div className="p-3 rounded-lg bg-dark-bg border border-dark-border">
                        <p className="text-xs text-muted-foreground mb-1">Goal</p>
                        <p className="text-sm">{hackathon.goal}</p>
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={() => handleJoinHackathon(hackathon.id)}
                    className="w-full mt-4 bg-electric-blue hover:bg-electric-blue/80 text-dark-bg font-semibold group"
                  >
                    {hackathon.invitation_status === "pending" ? "Accept Invitation" : "Open Project"}
                    <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
