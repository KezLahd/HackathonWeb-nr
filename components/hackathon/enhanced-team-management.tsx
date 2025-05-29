"use client"

import type React from "react"

import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { supabase } from "@/lib/supabase"
import { ApiClient } from "@/lib/api-client"
import { PresenceIndicator } from "./presence-indicator"
import {
  sendHackathonInvitation,
  createInviteCode,
  getHackathonInviteCodes,
  deleteInviteCode,
  getPreviousCollaborators,
} from "@/app/actions/invitation-actions"
import {
  Users,
  UserPlus,
  Mail,
  Crown,
  Trash2,
  Loader2,
  CheckCircle,
  Send,
  Copy,
  Plus,
  QrCode,
  Clock,
  Hash,
  UserCheck,
  Wifi,
  WifiOff,
  RefreshCw,
  Circle,
  ChevronDown,
  Check,
} from "lucide-react"

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

interface PendingInvite {
  id: string
  email: string
  status: string
  invited_at: string
}

interface InviteCode {
  id: string
  code: string
  created_at: string
  expires_at: string
  used_count: number
  last_used_at: string | null
  is_active: boolean
}

interface Collaborator {
  email: string
  full_name: string | null
  hackathon_count: number
  last_collaboration: string
}

interface Hackathon {
  id: string
  created_by: string
  team_size: number
  title: string
  theme: string
}

interface EnhancedTeamManagementProps {
  hackathon: Hackathon
  onTeamUpdate?: (members: TeamMember[]) => void
}

export function EnhancedTeamManagement({ hackathon, onTeamUpdate }: EnhancedTeamManagementProps) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([])
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([])
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [inviteEmail, setInviteEmail] = useState("")
  const [isInviting, setIsInviting] = useState(false)
  const [isCreatingCode, setIsCreatingCode] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [inviteMessage, setInviteMessage] = useState("")
  const [activeTab, setActiveTab] = useState("quick")
  const [isConnected, setIsConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [collaboratorOpen, setCollaboratorOpen] = useState(false)
  const [selectedCollaborator, setSelectedCollaborator] = useState<Collaborator | null>(null)

  // Use refs to track component state
  const mountedRef = useRef(true)
  const channelRef = useRef<any>(null)

  // Enhanced team loading using API endpoint
  const loadTeamMembers = useCallback(
    async (forceRefresh = false) => {
      if (!mountedRef.current) return

      try {
        console.log(`🔄 Loading team members via API for hackathon: ${hackathon.id} ${forceRefresh ? "(forced)" : ""}`)

        const result = await ApiClient.getTeamMembers(hackathon.id)

        if (!result.success) {
          throw new Error(result.error)
        }

        console.log("✅ Team members loaded via API:", result.members.length)

        if (mountedRef.current) {
          setTeamMembers(result.members)
          setLastUpdate(new Date())

          // Notify parent component of team update
          if (onTeamUpdate) {
            onTeamUpdate(result.members)
          }
        }

        return result.members
      } catch (error) {
        console.error("❌ Error loading team members via API:", error)
        if (mountedRef.current) {
          setIsConnected(false)
        }
        return []
      }
    },
    [hackathon.id, onTeamUpdate],
  )

  // Load previous collaborators
  const loadCollaborators = useCallback(async () => {
    if (!currentUser?.email) return

    try {
      const result = await getPreviousCollaborators(currentUser.email)
      if (result.success && mountedRef.current) {
        setCollaborators(result.collaborators)
      }
    } catch (error) {
      console.error("Error loading collaborators:", error)
    }
  }, [currentUser?.email])

  // Setup real-time subscription for team changes
  const setupRealtimeSubscription = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }

    if (!currentUser?.id) return

    console.log("🔌 Setting up real-time subscription for team changes:", hackathon.id)

    const channel = supabase
      .channel(`team-realtime-${hackathon.id}-${Date.now()}`, {
        config: {
          broadcast: { self: true },
          presence: { key: currentUser.id },
        },
      })
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "team_members",
          filter: `hackathon_id=eq.${hackathon.id}`,
        },
        (payload) => {
          console.log("🔄 REAL-TIME: Team member change detected:", payload)
          setIsConnected(true)

          // Reload team members via API for consistency
          setTimeout(() => {
            if (mountedRef.current) {
              loadTeamMembers(true)
            }
          }, 100)
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
        },
        (payload) => {
          console.log("🔄 REAL-TIME: Profile updated:", payload.new?.id)
          // Check if this profile belongs to a team member
          const isTeamMemberProfile = teamMembers.some((member) => member.profiles?.id === payload.new?.id)
          if (isTeamMemberProfile) {
            setTimeout(() => {
              if (mountedRef.current) {
                loadTeamMembers(true)
              }
            }, 200)
          }
        },
      )
      .subscribe((status) => {
        console.log("📡 Team subscription status:", status)
        setIsConnected(status === "SUBSCRIBED")

        if (status === "CHANNEL_ERROR") {
          console.error("❌ Real-time subscription error")
          setIsConnected(false)
          // Retry subscription after delay
          setTimeout(() => {
            if (mountedRef.current) {
              setupRealtimeSubscription()
            }
          }, 3000)
        }
      })

    channelRef.current = channel
  }, [hackathon.id, currentUser?.id, teamMembers, loadTeamMembers])

  // Manual refresh function
  const handleManualRefresh = async () => {
    setIsRefreshing(true)
    try {
      await loadTeamMembers(true)
      await loadPendingInvites()
      await loadInviteCodes()
      await loadCollaborators()
    } finally {
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    mountedRef.current = true

    const initializeComponent = async () => {
      console.log("🚀 Initializing Enhanced Team Management for hackathon:", hackathon.id)

      // Load current user
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (mountedRef.current) {
        setCurrentUser(user)
      }

      // Initial data load
      await loadTeamMembers(true)
      await loadPendingInvites()
      await loadInviteCodes()

      // Load collaborators if user is available
      if (user && mountedRef.current) {
        await loadCollaborators()
        setupRealtimeSubscription()
      }

      if (mountedRef.current) {
        setLoading(false)
      }
    }

    initializeComponent()

    // Cleanup function
    return () => {
      console.log("🧹 Enhanced Team Management unmounting, cleaning up...")
      mountedRef.current = false

      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [hackathon.id])

  // Re-setup subscription when user changes
  useEffect(() => {
    if (currentUser && mountedRef.current && !loading) {
      setupRealtimeSubscription()
      loadCollaborators()
    }
  }, [currentUser, setupRealtimeSubscription, loading, loadCollaborators])

  const loadPendingInvites = async () => {
    try {
      const { data, error } = await supabase
        .from("invitations")
        .select("*")
        .eq("hackathon_id", hackathon.id)
        .eq("status", "pending")
        .order("invited_at", { ascending: false })

      if (error) throw error
      if (mountedRef.current) {
        setPendingInvites(data || [])
      }
    } catch (error) {
      console.error("Error loading pending invites:", error)
    }
  }

  const loadInviteCodes = async () => {
    if (!currentUser) return

    try {
      const result = await getHackathonInviteCodes(hackathon.id, currentUser.id)
      if (result.success && mountedRef.current) {
        setInviteCodes(result.codes)
      }
    } catch (error) {
      console.error("Error loading invite codes:", error)
    }
  }

  const inviteTeamMember = async (e: React.FormEvent) => {
    e.preventDefault()

    const emailToInvite = selectedCollaborator?.email || inviteEmail.trim()
    if (!emailToInvite) return

    setIsInviting(true)
    setInviteMessage("")

    try {
      const email = emailToInvite.toLowerCase()

      // Check if already a team member (with null safety)
      const existingMember = teamMembers.find((member) => member.profiles?.email?.toLowerCase() === email)
      if (existingMember) {
        setInviteMessage("This user is already a team member.")
        setIsInviting(false)
        return
      }

      // Check if already invited
      const existingInvite = pendingInvites.find((invite) => invite.email.toLowerCase() === email)
      if (existingInvite) {
        setInviteMessage("This user has already been invited.")
        setIsInviting(false)
        return
      }

      // Check team size limit
      if (teamMembers.length + pendingInvites.length >= hackathon.team_size) {
        setInviteMessage(`Team is full. Maximum ${hackathon.team_size} members allowed.`)
        setIsInviting(false)
        return
      }

      // Prepare invitation parameters with extensive validation
      const invitationParams = {
        hackathonId: hackathon?.id || "",
        inviterEmail: currentUser?.email || "",
        inviterName: currentUser?.user_metadata?.full_name || currentUser?.email || "Unknown User",
        inviteeEmail: email,
        hackathonTitle: hackathon?.title || "Untitled Hackathon",
        hackathonTheme: hackathon?.theme || "General",
      }

      console.log("✅ TEAM MANAGEMENT - All fields validated, sending invitation...")

      // Send invitation with all validated parameters
      const result = await sendHackathonInvitation(
        invitationParams.hackathonId,
        invitationParams.inviterEmail,
        invitationParams.inviterName,
        invitationParams.inviteeEmail,
        invitationParams.hackathonTitle,
        invitationParams.hackathonTheme,
      )

      console.log("📧 TEAM MANAGEMENT - Invitation result:", result)

      if (result.success) {
        setInviteMessage(result.message)
        setInviteEmail("")
        setSelectedCollaborator(null)
        loadPendingInvites() // Reload pending invites
        loadCollaborators() // Reload collaborators to update counts
      } else {
        setInviteMessage(`Error: ${result.error}`)
      }
    } catch (error: any) {
      console.error("❌ TEAM MANAGEMENT - Error inviting team member:", error)
      setInviteMessage(`Error: ${error.message}`)
    } finally {
      setIsInviting(false)
    }
  }

  const createNewInviteCode = async () => {
    if (!currentUser) return

    setIsCreatingCode(true)
    try {
      const result = await createInviteCode(hackathon.id, currentUser.id)
      if (result.success) {
        setInviteMessage(`Invite code created: ${result.inviteCode}`)
        loadInviteCodes()
      } else {
        setInviteMessage(`Error: ${result.error}`)
      }
    } catch (error: any) {
      console.error("Error creating invite code:", error)
      setInviteMessage(`Error: ${error.message}`)
    } finally {
      setIsCreatingCode(false)
    }
  }

  const copyInviteCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      setInviteMessage(`Invite code ${code} copied to clipboard!`)
    } catch (error) {
      setInviteMessage(`Invite code: ${code}`)
    }
  }

  const removeInviteCode = async (codeId: string) => {
    if (!confirm("Are you sure you want to delete this invite code?")) return

    try {
      const result = await deleteInviteCode(codeId, currentUser.id)
      if (result.success) {
        setInviteMessage("Invite code deleted successfully")
        loadInviteCodes()
      } else {
        setInviteMessage(`Error: ${result.error}`)
      }
    } catch (error: any) {
      console.error("Error deleting invite code:", error)
      setInviteMessage(`Error: ${error.message}`)
    }
  }

  const removeTeamMember = async (memberId: string) => {
    if (!confirm("Are you sure you want to remove this team member?")) return

    try {
      const { error } = await supabase.from("team_members").delete().eq("id", memberId)
      if (error) throw error

      // Force immediate UI update
      const updatedMembers = teamMembers.filter((member) => member.id !== memberId)
      setTeamMembers(updatedMembers)

      // Reload to ensure consistency
      setTimeout(() => {
        if (mountedRef.current) {
          loadTeamMembers(true)
        }
      }, 500)
    } catch (error: any) {
      console.error("Error removing team member:", error)
      alert(error.message)
    }
  }

  const cancelInvitation = async (inviteId: string) => {
    if (!confirm("Are you sure you want to cancel this invitation?")) return

    try {
      const { error } = await supabase.from("invitations").delete().eq("id", inviteId)
      if (error) throw error
      loadPendingInvites()
    } catch (error: any) {
      console.error("Error canceling invitation:", error)
      alert(error.message)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })
  }

  const isCreator = currentUser?.id === hackathon.created_by
  const totalSlots = teamMembers.length + pendingInvites.length

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
        <div className="flex items-center justify-between">
          <CardTitle className="text-glow flex items-center gap-2">
            <Users className="h-5 w-5 text-electric-blue" />
            Team ({totalSlots}/{hackathon.team_size})
          </CardTitle>
          <div className="flex items-center gap-3">
            <PresenceIndicator hackathonId={hackathon.id} currentUserId={currentUser?.id} />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="h-8 w-8 p-0 hover:bg-electric-blue/20"
              title="Refresh team data"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            </Button>
            {isConnected ? (
              <Wifi className="h-4 w-4 text-electric-green" title="Real-time connected" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-400" title="Connection lost" />
            )}
            <span className="text-xs text-muted-foreground">{lastUpdate.toLocaleTimeString()}</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Invite Options - Only for creators */}
        {isCreator && totalSlots < hackathon.team_size && (
          <div className="space-y-3">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3 bg-dark-bg">
                <TabsTrigger value="quick" className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  Quick Add
                </TabsTrigger>
                <TabsTrigger value="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email
                </TabsTrigger>
                <TabsTrigger value="code" className="flex items-center gap-2">
                  <QrCode className="h-4 w-4" />
                  Code
                </TabsTrigger>
              </TabsList>

              <TabsContent value="quick" className="space-y-2 mt-4">
                <form onSubmit={inviteTeamMember} className="space-y-2">
                  <Popover open={collaboratorOpen} onOpenChange={setCollaboratorOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={collaboratorOpen}
                        className="w-full justify-between bg-dark-bg border-dark-border focus:border-electric-blue"
                      >
                        {selectedCollaborator ? (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-5 w-5">
                              <AvatarFallback className="bg-electric-blue text-dark-bg text-xs">
                                {selectedCollaborator.full_name?.charAt(0) || selectedCollaborator.email.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <span>{selectedCollaborator.full_name || selectedCollaborator.email}</span>
                            <Badge variant="outline" className="text-xs">
                              {selectedCollaborator.hackathon_count} projects
                            </Badge>
                          </div>
                        ) : (
                          "Select previous collaborator..."
                        )}
                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0 bg-dark-surface border-dark-border">
                      <Command className="bg-dark-surface">
                        <CommandInput placeholder="Search collaborators..." className="bg-dark-bg border-dark-border" />
                        <CommandList>
                          <CommandEmpty>No previous collaborators found.</CommandEmpty>
                          <CommandGroup>
                            {collaborators.map((collaborator) => (
                              <CommandItem
                                key={collaborator.email}
                                value={collaborator.email}
                                onSelect={() => {
                                  setSelectedCollaborator(collaborator)
                                  setCollaboratorOpen(false)
                                }}
                                className="hover:bg-dark-bg"
                              >
                                <div className="flex items-center gap-2 w-full">
                                  <Avatar className="h-6 w-6">
                                    <AvatarFallback className="bg-electric-blue text-dark-bg text-xs">
                                      {collaborator.full_name?.charAt(0) || collaborator.email.charAt(0)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1">
                                    <div className="font-medium text-sm">
                                      {collaborator.full_name || collaborator.email}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {collaborator.hackathon_count} projects • Last:{" "}
                                      {formatDate(collaborator.last_collaboration)}
                                    </div>
                                  </div>
                                  <Check
                                    className={`ml-auto h-4 w-4 ${
                                      selectedCollaborator?.email === collaborator.email ? "opacity-100" : "opacity-0"
                                    }`}
                                  />
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>

                  <Button
                    type="submit"
                    disabled={isInviting || !selectedCollaborator}
                    className="w-full bg-electric-blue hover:bg-electric-blue/80 text-dark-bg font-semibold"
                    size="sm"
                  >
                    {isInviting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Sending Invitation...
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Invite {selectedCollaborator?.full_name || selectedCollaborator?.email || "Collaborator"}
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="email" className="space-y-2 mt-4">
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
                        Sending Invitation...
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Send Email Invitation
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="code" className="space-y-3 mt-4">
                <Button
                  onClick={createNewInviteCode}
                  disabled={isCreatingCode}
                  className="w-full bg-electric-blue hover:bg-electric-blue/80 text-dark-bg font-semibold"
                  size="sm"
                >
                  {isCreatingCode ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating Code...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Invite Code
                    </>
                  )}
                </Button>

                {/* Existing Invite Codes */}
                {inviteCodes.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="text-sm font-medium text-electric-blue">Active Invite Codes</h5>
                    {inviteCodes.map((code) => (
                      <div
                        key={code.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-dark-bg border border-dark-border"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-electric-blue/20 flex items-center justify-center">
                            <Hash className="h-4 w-4 text-electric-blue" />
                          </div>
                          <div>
                            <div className="font-mono font-bold text-electric-blue">{code.code}</div>
                            <div className="text-xs text-muted-foreground flex items-center gap-2">
                              <Clock className="h-3 w-3" />
                              Expires {formatDate(code.expires_at)}
                              {code.used_count > 0 && <span>• Used {code.used_count} times</span>}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyInviteCode(code.code)}
                            className="h-8 w-8 p-0 hover:bg-electric-blue/20 hover:text-electric-blue"
                            title="Copy code"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeInviteCode(code.id)}
                            className="h-8 w-8 p-0 hover:bg-red-500/20 hover:text-red-400"
                            title="Delete code"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>

            {inviteMessage && (
              <Alert className="border-electric-blue/30 bg-electric-blue/10">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription className="text-electric-blue">{inviteMessage}</AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Team Members List */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-electric-blue">Active Members</h4>
          {teamMembers.length === 0 ? (
            <div className="text-center py-6">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">Loading team members...</p>
            </div>
          ) : (
            teamMembers.map((member) => (
              <div
                key={`${member.id}-${member.user_id}-${lastUpdate.getTime()}`}
                className="flex items-center justify-between p-3 rounded-lg bg-dark-bg border border-dark-border animate-in fade-in duration-300"
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-electric-blue text-dark-bg text-sm">
                        {member.profiles?.full_name?.charAt(0) || member.profiles?.email?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>
                    {/* Show online indicator for active users */}
                    <div className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-dark-bg">
                      <Circle className="h-full w-full text-electric-green fill-current" />
                    </div>
                  </div>
                  <div>
                    <div className="font-medium text-sm flex items-center gap-2">
                      {member.profiles?.full_name || "Unknown User"}
                      {member.role === "creator" && (
                        <Badge className="bg-neon-purple text-white text-xs">
                          <Crown className="h-3 w-3 mr-1" />
                          Creator
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {member.profiles?.email || "No email"}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <UserCheck className="h-3 w-3" />
                      Joined {formatDate(member.joined_at)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {member.role !== "creator" && (
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
            ))
          )}
        </div>

        {/* Pending Invites */}
        {pendingInvites.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-yellow-400">Pending Email Invitations</h4>
            {pendingInvites.map((invite) => (
              <div
                key={invite.id}
                className="flex items-center justify-between p-3 rounded-lg bg-dark-bg border border-yellow-500/30"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-yellow-500/20 flex items-center justify-center">
                    <Send className="h-4 w-4 text-yellow-400" />
                  </div>
                  <div>
                    <div className="font-medium text-sm">{invite.email}</div>
                    <div className="text-xs text-muted-foreground">
                      Invited {new Date(invite.invited_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-yellow-500/30 text-yellow-400">
                    Pending
                  </Badge>

                  {isCreator && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => cancelInvitation(invite.id)}
                      className="h-8 w-8 p-0 hover:bg-red-500/20 hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {totalSlots >= hackathon.team_size && (
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
