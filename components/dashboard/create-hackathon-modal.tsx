"use client"

import React from "react"
import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { generateTasks } from "@/app/actions/generate-tasks"
import { sendHackathonInvitation } from "@/app/actions/invitation-actions"
import { supabase } from "@/lib/supabase"
import { X, Plus, Mail, Users } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { AiDescriptionEnhancer } from "./ai-description-enhancer"
import { ClockIcon } from "lucide-react"
import { Sparkles } from "lucide-react"

interface CreateHackathonModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

interface FormData {
  title: string
  description: string
  theme: string
  duration: number
  teamSize: number
  startTime: string
}

interface TeamMember {
  email: string
  name?: string
}

const THEME_OPTIONS = [
  { id: "ai-ml", label: "🤖 AI & Machine Learning", description: "Build intelligent applications" },
  { id: "web-mobile", label: "📱 Web & Mobile Apps", description: "Create user-friendly applications" },
  { id: "blockchain", label: "⛓️ Blockchain & Crypto", description: "Decentralized solutions" },
  { id: "iot-hardware", label: "🔧 IoT & Hardware", description: "Connected devices and sensors" },
  { id: "gaming", label: "🎮 Gaming & Entertainment", description: "Interactive experiences" },
  { id: "fintech", label: "💰 FinTech & Finance", description: "Financial technology solutions" },
  { id: "healthcare", label: "🏥 HealthTech", description: "Medical and wellness innovations" },
  { id: "sustainability", label: "🌱 Sustainability & Green Tech", description: "Environmental solutions" },
  { id: "education", label: "📚 EdTech & Learning", description: "Educational technology" },
  { id: "open", label: "🚀 Open Innovation", description: "Any creative solution" },
]

const CreateHackathonModal: React.FC<CreateHackathonModalProps> = ({ open, onOpenChange, onSuccess }) => {
  const [formData, setFormData] = useState<FormData>({
    title: "",
    description: "",
    theme: "",
    duration: 24,
    teamSize: 4,
    startTime: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [newMemberEmail, setNewMemberEmail] = useState("")
  const [collaborators, setCollaborators] = useState<any[]>([])
  const { toast } = useToast()
  const [showAiEnhancer, setShowAiEnhancer] = useState(false)
  const [timeMode, setTimeMode] = useState<"duration" | "endTime">("duration")
  const [startTimeMode, setStartTimeMode] = useState<"now" | "future">("future")
  const [endTime, setEndTime] = useState("")

  // Set default start time to user's current time + 1 hour
  React.useEffect(() => {
    const updateStartTime = () => {
      const now = new Date()
      if (startTimeMode === "now") {
        const localDateTime = now.toISOString().slice(0, 16)
        setFormData((prev) => ({ ...prev, startTime: localDateTime }))
      } else {
        const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000)
        const localDateTime = oneHourLater.toISOString().slice(0, 16)
        setFormData((prev) => ({ ...prev, startTime: localDateTime }))
      }
    }

    updateStartTime()
  }, [startTimeMode])

  // Load previous collaborators
  React.useEffect(() => {
    const loadCollaborators = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) return

        // Get users who have been in hackathons with the current user
        const { data: teamMemberships } = await supabase
          .from("team_members")
          .select(`
            hackathon_id,
            profiles:user_id(id, email, full_name)
          `)
          .neq("user_id", user.id)

        if (teamMemberships) {
          // Get unique collaborators
          const uniqueCollaborators = teamMemberships
            .map((tm) => tm.profiles)
            .filter((profile, index, self) => profile && self.findIndex((p) => p?.id === profile.id) === index)
            .slice(0, 10) // Limit to 10 recent collaborators

          setCollaborators(uniqueCollaborators)
        }
      } catch (error) {
        console.error("Error loading collaborators:", error)
      }
    }

    if (open) {
      loadCollaborators()
    }
  }, [open])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value,
    })
  }

  const handleThemeSelect = (themeId: string) => {
    setFormData({
      ...formData,
      theme: themeId,
    })
  }

  const addTeamMember = (email: string, name?: string) => {
    if (!email || teamMembers.some((member) => member.email === email)) return

    // Check team size limit (creator counts as 1)
    if (teamMembers.length >= formData.teamSize - 1) {
      toast({
        title: "Team Full",
        description: `Maximum ${formData.teamSize - 1} additional members allowed (creator included in team size)`,
        variant: "destructive",
      })
      return
    }

    setTeamMembers([...teamMembers, { email, name }])
    setNewMemberEmail("")
  }

  const removeTeamMember = (email: string) => {
    setTeamMembers(teamMembers.filter((member) => member.email !== email))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      const startTime = new Date(formData.startTime)
      let endTime: Date

      if (timeMode === "duration") {
        endTime = new Date(startTime.getTime() + formData.duration * 60 * 60 * 1000)
      } else {
        endTime = new Date(endTime)
        // Calculate duration for database
        const durationMs = endTime.getTime() - startTime.getTime()
        formData.duration = Math.max(1, Math.round(durationMs / (60 * 60 * 1000)))
      }

      // Get theme label for AI generation
      const selectedTheme = THEME_OPTIONS.find((t) => t.id === formData.theme)
      const themeLabel = selectedTheme?.label || formData.theme

      console.log("Creating hackathon with data:", {
        title: formData.title,
        description: formData.description,
        theme: themeLabel,
        duration_hours: formData.duration,
        team_size: formData.teamSize,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        created_by: user.id,
      })

      // Create hackathon (database trigger will automatically add creator as team member)
      const { data: hackathon, error: hackathonError } = await supabase
        .from("hackathons")
        .insert({
          title: formData.title,
          description: formData.description,
          theme: themeLabel,
          duration_hours: formData.duration,
          team_size: formData.teamSize,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          created_by: user.id,
        })
        .select()
        .single()

      if (hackathonError) {
        console.error("Hackathon creation error:", hackathonError)
        throw hackathonError
      }

      console.log("Hackathon created successfully:", hackathon)

      // Wait a moment for the database trigger to complete
      await new Promise((resolve) => setTimeout(resolve, 500))

      // Verify creator was added as team member (by trigger)
      try {
        const { data: teamMember, error: checkError } = await supabase
          .from("team_members")
          .select("id, role")
          .eq("hackathon_id", hackathon.id)
          .eq("user_id", user.id)
          .single()

        if (checkError || !teamMember) {
          console.warn("Creator not found in team, adding manually...")

          // Fallback: manually add creator if trigger didn't work
          const { error: teamError } = await supabase.from("team_members").insert({
            hackathon_id: hackathon.id,
            user_id: user.id,
            role: "creator",
          })

          if (teamError && !teamError.message.includes("duplicate key")) {
            console.error("Manual team member creation error:", teamError)
            throw teamError
          }
        } else {
          console.log("Creator successfully added as team member by trigger:", teamMember)
        }
      } catch (teamError: any) {
        // If it's a duplicate key error, that's actually good - it means the trigger worked
        if (teamError.message?.includes("duplicate key")) {
          console.log("Creator already exists as team member (trigger worked)")
        } else {
          console.error("Team member verification error:", teamError)
          // Don't throw here - hackathon was created successfully
        }
      }

      // Generate AI tasks with smart ordering (remove dependencies to fix the error)
      try {
        const aiTasks = await generateTasks(themeLabel, formData.description, formData.duration, formData.teamSize)
        console.log("AI tasks generated:", aiTasks)

        // Insert tasks with smart ordering (without dependencies column)
        if (aiTasks && aiTasks.length > 0) {
          const tasksToInsert = aiTasks.map((task: any, index: number) => ({
            hackathon_id: hackathon.id,
            title: task.title,
            description: task.description,
            estimated_hours: task.estimatedHours,
            priority: task.priority,
            order_index: index, // Smart ordering from AI
          }))

          const { error: tasksError } = await supabase.from("tasks").insert(tasksToInsert)

          if (tasksError) {
            console.error("Tasks creation error:", tasksError)
            // Don't throw here - hackathon was created successfully
          } else {
            console.log("Tasks created successfully with smart ordering")
          }
        }
      } catch (aiError) {
        console.error("AI task generation failed:", aiError)
        // Don't throw here - hackathon was created successfully
      }

      // Send invitations to team members
      if (teamMembers.length > 0) {
        const invitationPromises = teamMembers.map(async (member) => {
          try {
            const result = await sendHackathonInvitation(
              hackathon.id,
              user.email || "",
              user.user_metadata?.full_name || "Team Member",
              member.email,
              hackathon.title,
              themeLabel,
              {
                inviteUrl: `https://hackathon.mjsons.net/shared?hackathon=${hackathon.id}`,
              },
            )

            if (result.success) {
              console.log(`✅ Invitation sent to ${member.email}`)
            } else {
              console.error(`❌ Failed to send invitation to ${member.email}:`, result.error)
            }

            return result
          } catch (error) {
            console.error(`❌ Error sending invitation to ${member.email}:`, error)
            return { success: false, error: "Failed to send invitation" }
          }
        })

        const invitationResults = await Promise.all(invitationPromises)
        const successfulInvitations = invitationResults.filter((result) => result.success).length

        if (successfulInvitations > 0) {
          toast({
            title: "Invitations Sent!",
            description: `${successfulInvitations} team member${successfulInvitations !== 1 ? "s" : ""} invited successfully`,
            variant: "default",
          })
        }
      }

      // Reset form and close modal
      setFormData({
        title: "",
        description: "",
        theme: "",
        duration: 24,
        teamSize: 4,
        startTime: "",
      })
      setTeamMembers([])

      toast({
        title: "Hackathon Created! 🎉",
        description: "Your hackathon has been created successfully",
        variant: "default",
      })

      onSuccess()
    } catch (error: any) {
      console.error("Error creating hackathon:", error)

      // Provide more specific error messages
      let errorMessage = "Failed to create hackathon"
      if (error.message?.includes("authentication")) {
        errorMessage = "Please sign in again and try again"
      } else if (error.message?.includes("permission")) {
        errorMessage = "You don't have permission to create hackathons"
      } else if (error.message?.includes("duplicate key")) {
        errorMessage = "This hackathon already exists or there was a conflict"
      } else if (error.message) {
        errorMessage = error.message
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-electric-blue" />
            Create Hackathon
          </DialogTitle>
          <DialogDescription>Create a new hackathon and invite your team to collaborate.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Hackathon Title</Label>
            <Input
              id="title"
              name="title"
              placeholder="e.g., AI Innovation Challenge 2025"
              value={formData.title}
              onChange={handleChange}
              required
              className="bg-dark-bg border-dark-border focus:border-electric-blue"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="description">Description & Goals</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowAiEnhancer(!showAiEnhancer)}
                disabled={!formData.description.trim()}
                className="border-electric-blue/30 text-electric-blue hover:bg-electric-blue/20"
              >
                <Sparkles className="h-4 w-4 mr-1" />
                AI Enhance
              </Button>
            </div>
            <Textarea
              id="description"
              name="description"
              placeholder="Brief overview: What do you want to build? (e.g., 'A mobile app to help students find study groups')"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              required
              className="bg-dark-bg border-dark-border focus:border-electric-blue"
            />
            {showAiEnhancer && formData.description.trim() && (
              <AiDescriptionEnhancer
                currentDescription={formData.description}
                theme={formData.theme}
                onSelect={(enhanced) => {
                  setFormData({ ...formData, description: enhanced })
                  setShowAiEnhancer(false)
                }}
                onClose={() => setShowAiEnhancer(false)}
              />
            )}
          </div>

          <div className="space-y-3">
            <Label>Theme</Label>
            <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
              {THEME_OPTIONS.map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => handleThemeSelect(theme.id)}
                  className={`p-3 text-left rounded-lg border transition-all ${
                    formData.theme === theme.id
                      ? "border-electric-blue bg-electric-blue/10 text-electric-blue shadow-lg"
                      : "border-gray-600 bg-gray-700 hover:border-electric-blue/50 hover:bg-gray-600 text-gray-100"
                  }`}
                >
                  <div className="font-medium">{theme.label}</div>
                  <div className={`text-sm ${formData.theme === theme.id ? "text-electric-blue/80" : "text-gray-300"}`}>
                    {theme.description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Label className="flex items-center gap-2">
                <ClockIcon className="h-4 w-4" />
                Time Planning
              </Label>
              <div className="flex border border-dark-border rounded-lg p-1">
                <Button
                  type="button"
                  variant={timeMode === "duration" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setTimeMode("duration")}
                  className={timeMode === "duration" ? "bg-electric-blue text-dark-bg" : ""}
                >
                  Duration
                </Button>
                <Button
                  type="button"
                  variant={timeMode === "endTime" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setTimeMode("endTime")}
                  className={timeMode === "endTime" ? "bg-electric-blue text-dark-bg" : ""}
                >
                  End Time
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {timeMode === "duration" ? (
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (hours)</Label>
                  <Input
                    type="number"
                    id="duration"
                    name="duration"
                    min="1"
                    max="168"
                    value={formData.duration}
                    onChange={(e) => {
                      const value = Number.parseInt(e.target.value)
                      setFormData({ ...formData, duration: isNaN(value) ? 24 : value })
                    }}
                    required
                    className="bg-dark-bg border-dark-border focus:border-electric-blue"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="endTime">End Time</Label>
                  <Input
                    type="datetime-local"
                    id="endTime"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    required
                    className="bg-dark-bg border-dark-border focus:border-electric-blue"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="teamSize">Team Size</Label>
                <Input
                  type="number"
                  id="teamSize"
                  name="teamSize"
                  min="1"
                  max="20"
                  value={formData.teamSize}
                  onChange={(e) => {
                    const value = Number.parseInt(e.target.value)
                    setFormData({ ...formData, teamSize: isNaN(value) ? 4 : value })
                  }}
                  required
                  className="bg-dark-bg border-dark-border focus:border-electric-blue"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-4">
              <Label htmlFor="startTime">Start Time</Label>
              <div className="flex border border-dark-border rounded-lg p-1">
                <Button
                  type="button"
                  variant={startTimeMode === "now" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setStartTimeMode("now")}
                  className={startTimeMode === "now" ? "bg-electric-blue text-dark-bg" : ""}
                >
                  Now
                </Button>
                <Button
                  type="button"
                  variant={startTimeMode === "future" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setStartTimeMode("future")}
                  className={startTimeMode === "future" ? "bg-electric-blue text-dark-bg" : ""}
                >
                  Future
                </Button>
              </div>
            </div>
            <Input
              type="datetime-local"
              id="startTime"
              name="startTime"
              value={formData.startTime}
              onChange={handleChange}
              disabled={startTimeMode === "now"}
              required
              className="bg-dark-bg border-dark-border focus:border-electric-blue disabled:opacity-50"
            />
          </div>

          {/* Team Member Invitation Section */}
          <div className="space-y-4 border-t border-dark-border pt-4">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-electric-blue" />
              <Label>Invite Team Members (Optional)</Label>
            </div>

            {/* Add new member */}
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="Enter email address"
                value={newMemberEmail}
                onChange={(e) => setNewMemberEmail(e.target.value)}
                className="bg-dark-bg border-dark-border focus:border-electric-blue"
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    addTeamMember(newMemberEmail)
                  }
                }}
              />
              <Button
                type="button"
                onClick={() => addTeamMember(newMemberEmail)}
                disabled={!newMemberEmail}
                className="bg-electric-blue hover:bg-electric-blue/80 text-dark-bg"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Quick add from collaborators */}
            {collaborators.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Quick add from previous collaborators:</Label>
                <div className="flex flex-wrap gap-2">
                  {collaborators.map((collaborator) => (
                    <Button
                      key={collaborator.id}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addTeamMember(collaborator.email, collaborator.full_name)}
                      disabled={teamMembers.some((member) => member.email === collaborator.email)}
                      className="border-dark-border hover:bg-electric-blue/20 hover:border-electric-blue"
                    >
                      {collaborator.full_name || collaborator.email}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Current team members */}
            {teamMembers.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm">Team Members to Invite:</Label>
                <div className="flex flex-wrap gap-2">
                  {teamMembers.map((member) => (
                    <Badge
                      key={member.email}
                      variant="secondary"
                      className="bg-electric-blue/20 text-electric-blue border-electric-blue/30 flex items-center gap-1"
                    >
                      {member.name || member.email}
                      <button
                        type="button"
                        onClick={() => removeTeamMember(member.email)}
                        className="ml-1 hover:text-red-400"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Button
            type="submit"
            disabled={isLoading || !formData.theme}
            className="mt-4 bg-electric-blue hover:bg-electric-blue/80 text-dark-bg font-semibold"
          >
            {isLoading ? "Creating..." : "Create Hackathon & Send Invites"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export { CreateHackathonModal }
