"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { CountdownTimer } from "@/components/hackathon/countdown-timer"
import { EnhancedTeamManagement } from "@/components/hackathon/enhanced-team-management"
import { AIInsights } from "@/components/hackathon/ai-insights"
import { AITaskSuggestions } from "@/components/hackathon/ai-task-suggestions"
import { AIChatToggle } from "@/components/hackathon/ai-chat-toggle"
import { SmartNotifications } from "@/components/hackathon/smart-notifications"
import { AIFeaturesIntro } from "@/components/hackathon/ai-features-intro"
import { PresenceIndicator } from "@/components/hackathon/presence-indicator"
import { GanttChart } from "@/components/hackathon/gantt-chart"
import { AddTaskModal } from "@/components/hackathon/add-task-modal"
import { useToast } from "@/hooks/use-toast"
import { ApiClient } from "@/lib/api-client"
import { TaskOrderingService } from "@/lib/task-ordering-service"
import { Checkbox } from "@/components/ui/checkbox"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import {
  CheckCircle2,
  UserCheck,
  CheckSquare,
  ListTodo,
  Plus,
  Edit,
  Trash2,
  User,
  Clock,
  BarChart3,
  Zap,
  ArrowLeft,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Target } from "lucide-react"
import { EnhancedTaskList } from "@/components/hackathon/enhanced-task-list"

interface Hackathon {
  id: string
  title: string
  description: string
  theme: string
  start_time: string
  end_time: string
  duration_hours: number
  team_size: number
  status: string
  created_by: string
  created_at: string
}

export default function HackathonPage() {
  const params = useParams()
  const router = useRouter()
  const hackathonId = params.id as string

  const [hackathon, setHackathon] = useState<Hackathon | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [showAIIntro, setShowAIIntro] = useState(true)
  const [tasks, setTasks] = useState<any[]>([])
  const [teamMembers, setTeamMembers] = useState<any[]>([])
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [showGantt, setShowGantt] = useState(false)
  const [editingTask, setEditingTask] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<{ title: string; estimated_hours: number }>({
    title: "",
    estimated_hours: 0,
  })
  const { toast } = useToast()

  useEffect(() => {
    const loadHackathon = async () => {
      try {
        // Get current user
        const {
          data: { user },
        } = await supabase.auth.getUser()
        setCurrentUser(user)

        // Load hackathon details
        const { data: hackathonData, error } = await supabase
          .from("hackathons")
          .select("*")
          .eq("id", hackathonId)
          .single()

        if (error) {
          console.error("Error loading hackathon:", error)
          return
        }

        setHackathon(hackathonData)

        // Load tasks
        const { data: tasksData } = await supabase
          .from("tasks")
          .select("*")
          .eq("hackathon_id", hackathonId)
          .order("order_index")

        setTasks(tasksData || [])

        // Load team members (participants)
        const { data: participantsData } = await supabase
          .from("team_members")
          .select(`
            *,
            profiles:user_id (
              id,
              full_name,
              email
            )
          `)
          .eq("hackathon_id", hackathonId)

        setTeamMembers(participantsData || [])
      } catch (error) {
        console.error("Error:", error)
      } finally {
        setLoading(false)
      }
    }

    if (hackathonId) {
      loadHackathon()
    }
  }, [hackathonId])

  // Check if user has seen AI intro before
  useEffect(() => {
    const hasSeenIntro = localStorage.getItem(`ai-intro-seen-${hackathonId}`)
    if (hasSeenIntro) {
      setShowAIIntro(false)
    }
  }, [hackathonId])

  // Enhanced task completion
  const toggleTaskCompletion = async (taskId: string, completed: boolean) => {
    try {
      // Optimistic update
      setTasks((prev) =>
        prev.map((task) =>
          task.id === taskId ? { ...task, completed, completed_at: completed ? new Date().toISOString() : null } : task,
        ),
      )

      const result = await ApiClient.completeTask(taskId, completed, currentUser?.id || "")

      toast({
        title: completed ? "Task Completed! 🎉" : "Task Reopened",
        description: `Task has been ${completed ? "marked as complete" : "reopened"}`,
        variant: "default",
      })
    } catch (error: any) {
      console.error("Error updating task completion:", error)
      // Revert optimistic update on error
      setTasks((prev) =>
        prev.map((task) =>
          task.id === taskId
            ? { ...task, completed: !completed, completed_at: !completed ? new Date().toISOString() : null }
            : task,
        ),
      )
      toast({
        title: "Error",
        description: "Failed to update task. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Enhanced task assignment
  const assignTask = async (taskId: string, userId: string | null) => {
    try {
      // Optimistic update
      const assignee = userId ? teamMembers.find((member) => member.profiles?.id === userId) : null
      setTasks((prev) => prev.map((task) => (task.id === taskId ? { ...task, assigned_to: userId, assignee } : task)))

      const result = await ApiClient.assignTask(taskId, userId, currentUser?.id || "")

      const assigneeName = assignee?.profiles?.full_name || assignee?.profiles?.email || "someone"
      toast({
        title: userId ? "Task Assigned!" : "Task Unassigned",
        description: userId ? `Task assigned to ${assigneeName}` : "Task has been unassigned",
        variant: "default",
      })
    } catch (error: any) {
      console.error("Error assigning task:", error)
      // Reload tasks on error
      loadTasks()
      toast({
        title: "Assignment Failed",
        description: error.message || "Failed to assign task. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Task editing
  const startEditing = (task: any) => {
    setEditingTask(task.id)
    setEditValues({
      title: task.title,
      estimated_hours: task.estimated_hours,
    })
  }

  const saveEdit = async () => {
    if (!editingTask) return

    try {
      const { error } = await supabase
        .from("tasks")
        .update({
          title: editValues.title,
          estimated_hours: editValues.estimated_hours,
        })
        .eq("id", editingTask)

      if (error) throw error

      setEditingTask(null)
      loadTasks()

      toast({
        title: "Task Updated",
        description: "Task has been updated successfully",
        variant: "default",
      })
    } catch (error: any) {
      console.error("Error updating task:", error)
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive",
      })
    }
  }

  const deleteTask = async (taskId: string) => {
    if (!confirm("Are you sure you want to delete this task?")) return

    try {
      const { error } = await supabase.from("tasks").delete().eq("id", taskId)
      if (error) throw error

      // Optimistic update
      setTasks((prev) => prev.filter((task) => task.id !== taskId))

      toast({
        title: "Task Deleted",
        description: "Task has been removed successfully",
        variant: "default",
      })
    } catch (error: any) {
      console.error("Error deleting task:", error)
      toast({
        title: "Error",
        description: "Failed to delete task. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Smart task ordering
  const optimizeTaskOrder = async () => {
    try {
      const orderedTasks = TaskOrderingService.calculateOptimalOrder(tasks)
      setTasks(orderedTasks)

      // Update database
      await Promise.all(
        orderedTasks.map((task) => supabase.from("tasks").update({ order_index: task.order_index }).eq("id", task.id)),
      )

      toast({
        title: "Tasks Optimized! 🚀",
        description: "Tasks have been reordered for optimal completion",
        variant: "default",
      })
    } catch (error) {
      console.error("Error optimizing task order:", error)
      toast({
        title: "Error",
        description: "Failed to optimize task order",
        variant: "destructive",
      })
    }
  }

  const loadTasks = async () => {
    try {
      const { data: tasksData } = await supabase
        .from("tasks")
        .select(`
          *,
          assignee:assigned_to (
            id,
            full_name,
            email
          )
        `)
        .eq("hackathon_id", hackathonId)
        .order("order_index")

      setTasks(tasksData || [])
    } catch (error) {
      console.error("Error loading tasks:", error)
    }
  }

  const handleCloseAIIntro = () => {
    setShowAIIntro(false)
    localStorage.setItem(`ai-intro-seen-${hackathonId}`, "true")
  }

  // Calculate time remaining (fixed calculation)
  const getTimeRemaining = () => {
    if (!hackathon) return 0
    const now = new Date().getTime()
    const endTime = new Date(hackathon.end_time).getTime()
    return Math.max(0, Math.floor((endTime - now) / (1000 * 60 * 60))) // Return hours, not milliseconds
  }

  const loadTeamMembers = async () => {
    try {
      const { data: participantsData } = await supabase
        .from("team_members")
        .select(`
          *,
          profiles:user_id (
            id,
            full_name,
            email
          )
        `)
        .eq("hackathon_id", hackathonId)
      setTeamMembers(participantsData || [])
    } catch (error) {
      console.error("Error loading team members:", error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-electric-blue mx-auto"></div>
          <p className="text-muted-foreground">Loading hackathon...</p>
        </div>
      </div>
    )
  }

  if (!hackathon) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">Hackathon Not Found</h1>
          <p className="text-muted-foreground">The hackathon you're looking for doesn't exist.</p>
        </div>
      </div>
    )
  }

  const isCreator = currentUser?.id === hackathon.created_by
  const hackathonStarted = new Date(hackathon.start_time) <= new Date()
  const hackathonEnded = new Date(hackathon.end_time) <= new Date()
  const timeRemaining = getTimeRemaining()

  // Calculate task stats
  const unassignedTasks = tasks.filter((task) => !task.assigned_to && !task.completed)
  const assignedTasks = tasks.filter((task) => task.assigned_to && !task.completed)
  const completedTasks = tasks.filter((task) => task.completed)
  const progressPercentage = tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0

  // Get all assignable users (remove duplicates)
  const getAssignableUsers = () => {
    const users = []

    // Add current user if not already in team members
    const currentUserInTeam = teamMembers.find((member) => member.profiles?.id === currentUser?.id)
    if (currentUser && !currentUserInTeam) {
      users.push({
        id: currentUser.id,
        full_name: currentUser.user_metadata?.full_name || null,
        email: currentUser.email,
        isCurrentUser: true,
      })
    }

    // Add team members
    teamMembers.forEach((member) => {
      if (member.profiles) {
        users.push({
          id: member.profiles.id,
          full_name: member.profiles.full_name,
          email: member.profiles.email,
          isCurrentUser: member.profiles.id === currentUser?.id,
        })
      }
    })

    return users
  }

  const assignableUsers = getAssignableUsers()

  return (
    <div className="min-h-screen bg-dark-bg">
      {/* AI Features Introduction Modal */}
      {showAIIntro && <AIFeaturesIntro onClose={handleCloseAIIntro} />}

      {/* Header */}
      <div className="border-b border-dark-border bg-dark-surface/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
                className="hover:bg-dark-surface/50 text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-glow text-electric-blue">{hackathon.title}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="border-electric-blue/30 text-electric-blue">
                    {hackathon.theme}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={`${
                      hackathonEnded
                        ? "border-red-500/30 text-red-400"
                        : hackathonStarted
                          ? "border-electric-green/30 text-electric-green"
                          : "border-yellow-500/30 text-yellow-400"
                    }`}
                  >
                    {hackathonEnded ? "Ended" : hackathonStarted ? "In Progress" : "Upcoming"}
                  </Badge>
                  {isCreator && (
                    <Badge variant="outline" className="border-purple-500/30 text-purple-400">
                      Creator
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <PresenceIndicator hackathonId={hackathonId} />
              <SmartNotifications
                hackathonId={hackathonId}
                hackathon={hackathon}
                tasks={tasks}
                teamMembers={teamMembers}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content - Left Side */}
          <div className="lg:col-span-2 space-y-6">
            {/* Countdown Timer */}
            <CountdownTimer startTime={hackathon.start_time} endTime={hackathon.end_time} />

            {/* Project Overview - Fixed duplicate goal/description */}
            <Card className="border-glow bg-dark-surface/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-glow flex items-center gap-2">
                  <Target className="h-5 w-5 text-electric-blue" />
                  Project Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium text-electric-blue mb-1">Theme</h4>
                  <p className="text-foreground flex items-center gap-2">
                    <span className="text-lg">🤖</span>
                    {hackathon.theme}
                  </p>
                </div>

                <div>
                  <h4 className="font-medium text-electric-blue mb-1">Description</h4>
                  <p className="text-muted-foreground">{hackathon.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-electric-blue mb-1">Duration</h4>
                    <p className="text-muted-foreground">{hackathon.duration_hours} hours</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-electric-blue mb-1">Team Size</h4>
                    <p className="text-muted-foreground">Up to {hackathon.team_size} members</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tasks Section */}
            <EnhancedTaskList
              hackathonId={hackathonId}
              hackathon={hackathon}
                      tasks={tasks}
              teamMembers={teamMembers}
              onTasksChange={loadTasks}
              onTeamChange={loadTeamMembers}
            />
          </div>

          {/* Sidebar - Right Side */}
          <div className="space-y-6">
            {/* Team Management */}
            <EnhancedTeamManagement hackathon={hackathon} />

            {/* AI Insights */}
            <AIInsights hackathon={hackathon} tasks={tasks} teamMembers={teamMembers} timeRemaining={timeRemaining} />

            {/* AI Task Suggestions */}
            <AITaskSuggestions
              hackathon={hackathon}
              tasks={tasks}
              timeRemaining={timeRemaining}
              onTaskAdded={() => {
                window.location.reload()
              }}
            />
          </div>
        </div>
      </div>
      <AddTaskModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        hackathonId={hackathonId}
        hackathon={hackathon}
        teamMembers={teamMembers.map((m) => m.profiles).filter(Boolean)}
        onSuccess={() => {
          setIsAddModalOpen(false)
          loadTasks()
        }}
      />
      {/* AI Chat Toggle - Bottom Right */}
      <div className="fixed bottom-4 right-4 z-50">
        <AIChatToggle hackathon={hackathon} tasks={tasks} teamMembers={teamMembers} />
      </div>
    </div>
  )
}
