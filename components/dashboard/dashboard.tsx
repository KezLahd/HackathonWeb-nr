"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase"
import { Plus, LogOut, Zap, Share2, Archive, Trash2, Eye, Hash } from "lucide-react"
import { CreateHackathonModal } from "./create-hackathon-modal"
import { HackathonCard } from "./hackathon-card"
import { useRouter } from "next/navigation"
import { JoinHackathonModal } from "./join-hackathon-modal"

interface Hackathon {
  id: string
  title: string
  description: string
  theme: string
  start_time: string
  end_time: string
  team_size: number
  status: string
}

interface DashboardProps {
  onSignOut: () => void
}

export function Dashboard({ onSignOut }: DashboardProps) {
  const router = useRouter()
  const [hackathons, setHackathons] = useState<Hackathon[]>([])
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [showArchived, setShowArchived] = useState(false)
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false)

  useEffect(() => {
    loadUser()
    loadHackathons()
  }, [showArchived])

  const loadUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    setUser(user)
  }

  const loadHackathons = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        console.error("No authenticated user")
        return
      }

      const statusFilter = showArchived ? ["archived"] : ["active"]

      const { data, error } = await supabase
        .from("hackathons")
        .select("*")
        .eq("created_by", user.id)
        .in("status", statusFilter)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error loading hackathons:", error)
      } else {
        setHackathons(data || [])
      }
    } catch (error) {
      console.error("Error in loadHackathons:", error)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    onSignOut()
  }

  const archiveHackathon = async (hackathonId: string) => {
    if (!confirm("Are you sure you want to archive this hackathon?")) return

    try {
      const { error } = await supabase.from("hackathons").update({ status: "archived" }).eq("id", hackathonId)

      if (error) throw error
      loadHackathons()
    } catch (error: any) {
      console.error("Error archiving hackathon:", error)
      alert(error.message)
    }
  }

  const restoreHackathon = async (hackathonId: string) => {
    try {
      const { error } = await supabase.from("hackathons").update({ status: "active" }).eq("id", hackathonId)

      if (error) throw error
      loadHackathons()
    } catch (error: any) {
      console.error("Error restoring hackathon:", error)
      alert(error.message)
    }
  }

  const deleteHackathon = async (hackathonId: string) => {
    if (!confirm("Are you sure you want to permanently delete this hackathon? This action cannot be undone.")) return

    try {
      const { error } = await supabase.from("hackathons").update({ status: "deleted" }).eq("id", hackathonId)

      if (error) throw error
      loadHackathons()
    } catch (error: any) {
      console.error("Error deleting hackathon:", error)
      alert(error.message)
    }
  }

  return (
    <div className="min-h-screen animated-bg">
      <header className="border-b border-dark-border bg-dark-surface/80 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Zap className="h-8 w-8 text-electric-blue" />
            <h1 className="text-2xl font-bold text-glow text-electric-blue">Hackathon Planner</h1>
          </div>
          <div className="flex items-center gap-6">
            <span className="text-base text-muted-foreground">
              Welcome, {user?.user_metadata?.full_name || user?.email}
            </span>
            <Button
              variant="outline"
              size="default"
              onClick={handleSignOut}
              className="border-dark-border hover:bg-dark-surface px-4 py-2 text-base"
            >
              <LogOut className="h-5 w-5 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-12">
          <div>
            <h2 className="text-4xl font-bold text-glow mb-4">
              {showArchived ? "Archived Hackathons" : "Your Hackathons"}
            </h2>
            <p className="text-muted-foreground text-lg">
              {showArchived
                ? "View and manage your archived projects"
                : "Plan, execute, and dominate your next hackathon"}
            </p>
          </div>
          <div className="flex items-center gap-6">
            <Button
              variant="outline"
              size="lg"
              onClick={() => router.push("/shared")}
              className="border-dark-border hover:bg-dark-surface px-6 py-3 text-base"
            >
              <Share2 className="h-5 w-5 mr-2" />
              Shared Hackathons
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => setIsJoinModalOpen(true)}
              className="border-dark-border hover:bg-dark-surface px-6 py-3 text-base"
            >
              <Hash className="h-5 w-5 mr-2" />
              Join Hackathon
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => setShowArchived(!showArchived)}
              className="border-dark-border hover:bg-dark-surface px-6 py-3 text-base"
            >
              {showArchived ? (
                <>
                  <Eye className="h-5 w-5 mr-2" />
                  Show Active
                </>
              ) : (
                <>
                  <Archive className="h-5 w-5 mr-2" />
                  Show Archived
                </>
              )}
            </Button>
            {!showArchived && (
              <Button
                onClick={() => setIsCreateModalOpen(true)}
                size="lg"
                className="bg-electric-blue hover:bg-electric-blue/80 text-dark-bg font-semibold glow-effect px-6 py-3 text-base"
              >
                <Plus className="h-5 w-5 mr-2" />
                New Hackathon
              </Button>
            )}
          </div>
        </div>

        {hackathons.length === 0 ? (
          <Card className="border-glow bg-dark-surface/80 backdrop-blur-sm">
            <CardHeader className="text-center py-16">
              {showArchived ? (
                <>
                  <Archive className="h-20 w-20 text-electric-blue mx-auto mb-6" />
                  <CardTitle className="text-3xl text-glow mb-4">No Archived Hackathons</CardTitle>
                  <CardDescription className="text-xl">Your archived hackathons will appear here</CardDescription>
                </>
              ) : (
                <>
                  <Zap className="h-20 w-20 text-electric-blue mx-auto mb-6" />
                  <CardTitle className="text-3xl text-glow mb-4">Ready to hack?</CardTitle>
                  <CardDescription className="text-xl">
                    Create your first hackathon project and let AI help you plan the perfect execution
                  </CardDescription>
                </>
              )}
            </CardHeader>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {hackathons.map((hackathon) => (
              <div key={hackathon.id} className="relative group">
                <HackathonCard hackathon={hackathon} onUpdate={loadHackathons} />

                {/* Management Actions */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="flex gap-1">
                    {showArchived ? (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => restoreHackathon(hackathon.id)}
                          className="h-8 w-8 p-0 bg-dark-surface/80 hover:bg-electric-blue/20 hover:text-electric-blue"
                          title="Restore hackathon"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteHackathon(hackathon.id)}
                          className="h-8 w-8 p-0 bg-dark-surface/80 hover:bg-red-500/20 hover:text-red-400"
                          title="Delete permanently"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => archiveHackathon(hackathon.id)}
                        className="h-8 w-8 p-0 bg-dark-surface/80 hover:bg-yellow-500/20 hover:text-yellow-400"
                        title="Archive hackathon"
                      >
                        <Archive className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Status Badge */}
                {hackathon.status === "archived" && (
                  <Badge className="absolute top-2 left-2 bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                    Archived
                  </Badge>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      <CreateHackathonModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onSuccess={() => {
          setIsCreateModalOpen(false)
          loadHackathons()
        }}
      />
      <JoinHackathonModal
        open={isJoinModalOpen}
        onOpenChange={setIsJoinModalOpen}
        onSuccess={() => {
          setIsJoinModalOpen(false)
          // Optionally redirect to shared hackathons
          router.push("/shared")
        }}
        userEmail={user?.email || ""}
      />
    </div>
  )
}
