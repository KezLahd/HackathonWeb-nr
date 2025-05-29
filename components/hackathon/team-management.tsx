"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase"
import { Users, UserPlus, Mail, Crown, Trash2, Loader2 } from "lucide-react"

interface TeamMember {
  id: string
  user_id: string
  role: string
  joined_at: string
  profiles: {
    id: string
    full_name: string
    email: string
  }
}

interface Hackathon {
  id: string
  created_by: string
  team_size: number
}

interface TeamManagementProps {
  hackathon: Hackathon
}

export function TeamManagement({ hackathon }: TeamManagementProps) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [inviteEmail, setInviteEmail] = useState("")
  const [isInviting, setIsInviting] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCurrentUser()
    loadTeamMembers()

    // Set up real-time subscription for team members
    const teamSubscription = supabase
      .channel("team-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "team_members",
          filter: `hackathon_id=eq.${hackathon.id}`,
        },
        () => {
          loadTeamMembers()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(teamSubscription)
    }
  }, [hackathon.id])

  const loadCurrentUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    setCurrentUser(user)
  }

  const loadTeamMembers = async () => {
    try {
      const { data, error } = await supabase
        .from("team_members")
        .select(`
          *,
          profiles:user_id(id, full_name, email)
        `)
        .eq("hackathon_id", hackathon.id)
        .order("joined_at", { ascending: true })

      if (error) throw error
      setTeamMembers(data || [])
    } catch (error) {
      console.error("Error loading team members:", error)
    } finally {
      setLoading(false)
    }
  }

  const inviteTeamMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail.trim()) return

    setIsInviting(true)
    try {
      // Check if user exists
      const { data: existingUser, error: userError } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", inviteEmail.trim())
        .single()

      if (userError && userError.code !== "PGRST116") {
        throw userError
      }

      if (!existingUser) {
        alert("User with this email does not exist. They need to sign up first.")
        return
      }

      // Check if already a team member
      const { data: existingMember } = await supabase
        .from("team_members")
        .select("id")
        .eq("hackathon_id", hackathon.id)
        .eq("user_id", existingUser.id)
        .single()

      if (existingMember) {
        alert("This user is already a team member.")
        return
      }

      // Check team size limit
      if (teamMembers.length >= hackathon.team_size) {
        alert(`Team is full. Maximum ${hackathon.team_size} members allowed.`)
        return
      }

      // Add team member
      const { error } = await supabase.from("team_members").insert({
        hackathon_id: hackathon.id,
        user_id: existingUser.id,
        role: "member",
      })

      if (error) throw error

      setInviteEmail("")
      alert("Team member invited successfully!")
    } catch (error: any) {
      console.error("Error inviting team member:", error)
      alert(error.message)
    } finally {
      setIsInviting(false)
    }
  }

  const removeTeamMember = async (memberId: string) => {
    if (!confirm("Are you sure you want to remove this team member?")) return

    try {
      const { error } = await supabase.from("team_members").delete().eq("id", memberId)

      if (error) throw error
    } catch (error: any) {
      console.error("Error removing team member:", error)
      alert(error.message)
    }
  }

  const isCreator = currentUser?.id === hackathon.created_by

  if (loading) {
    return (
      <Card className="border-glow bg-dark-surface/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-glow flex items-center gap-2">
            <Users className="h-5 w-5 text-electric-blue" />
            Team
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-12 bg-dark-bg rounded-lg"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-glow bg-dark-surface/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-glow flex items-center gap-2">
          <Users className="h-5 w-5 text-electric-blue" />
          Team ({teamMembers.length}/{hackathon.team_size})
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Invite Form - Only for creators */}
        {isCreator && teamMembers.length < hackathon.team_size && (
          <form onSubmit={inviteTeamMember} className="space-y-2">
            <Input
              type="email"
              placeholder="Enter email to invite"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="bg-dark-bg border-dark-border focus:border-electric-blue"
            />
            <Button
              type="submit"
              disabled={isInviting || !inviteEmail.trim()}
              className="w-full bg-electric-blue hover:bg-electric-blue/80 text-dark-bg font-semibold"
              size="sm"
            >
              {isInviting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Inviting...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite Member
                </>
              )}
            </Button>
          </form>
        )}

        {/* Team Members List */}
        <div className="space-y-3">
          {teamMembers.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between p-3 rounded-lg bg-dark-bg border border-dark-border"
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-electric-blue text-dark-bg text-sm">
                    {member.profiles.full_name?.charAt(0) || member.profiles.email.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium text-sm">{member.profiles.full_name || "Anonymous"}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {member.profiles.email}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {member.role === "creator" ? (
                  <Badge className="bg-neon-purple text-white">
                    <Crown className="h-3 w-3 mr-1" />
                    Creator
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-electric-blue/30 text-electric-blue">
                    Member
                  </Badge>
                )}

                {isCreator && member.role !== "creator" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeTeamMember(member.id)}
                    className="h-8 w-8 p-0 hover:bg-red-500/20 hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        {teamMembers.length === 0 && (
          <div className="text-center py-6">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground text-sm">No team members yet</p>
          </div>
        )}

        {teamMembers.length >= hackathon.team_size && (
          <div className="text-center py-2">
            <Badge variant="outline" className="border-electric-green/30 text-electric-green">
              Team Full
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
