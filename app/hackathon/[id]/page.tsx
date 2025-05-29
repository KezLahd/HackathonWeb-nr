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
            <Card className="border-glow bg-dark-surface/80 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-glow flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-electric-blue" />
                    Tasks ({completedTasks.length}/{tasks.length})
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={optimizeTaskOrder}
                      size="sm"
                      variant="outline"
                      className="border-electric-blue/30 text-electric-blue hover:bg-electric-blue/20"
                    >
                      <Zap className="h-4 w-4 mr-2" />
                      AI Optimize
                    </Button>
                    <Button
                      onClick={() => setShowGantt(!showGantt)}
                      size="sm"
                      variant={showGantt ? "default" : "outline"}
                      className={
                        showGantt
                          ? "bg-electric-blue hover:bg-electric-blue/80 text-dark-bg"
                          : "border-electric-blue/30 text-electric-blue hover:bg-electric-blue/20"
                      }
                    >
                      <BarChart3 className="h-4 w-4 mr-2" />
                      {showGantt ? "Hide" : "Show"} Gantt
                    </Button>
                    <Button
                      onClick={() => setIsAddModalOpen(true)}
                      size="sm"
                      className="bg-electric-blue hover:bg-electric-blue/80 text-dark-bg"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Task
                    </Button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                    <span>Progress</span>
                    <span>
                      {progressPercentage}% Updated: {new Date().toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="w-full bg-dark-bg rounded-full h-2">
                    <div
                      className="bg-electric-blue h-2 rounded-full transition-all duration-300 glow-effect"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                {showGantt && (
                  <div className="mb-6">
                    <GanttChart
                      tasks={tasks}
                      teamMembers={teamMembers.map((m) => m.profiles).filter(Boolean)}
                      hackathonStart={hackathon.start_time}
                      hackathonEnd={hackathon.end_time}
                      currentUserId={currentUser?.id}
                    />
                  </div>
                )}

                <Tabs defaultValue="unassigned" className="w-full">
                  <TabsList className="grid w-full grid-cols-3 bg-dark-bg border-dark-border">
                    <TabsTrigger
                      value="unassigned"
                      className="flex items-center gap-2 data-[state=active]:bg-electric-blue data-[state=active]:text-dark-bg"
                    >
                      <ListTodo className="h-4 w-4" />
                      Unassigned ({unassignedTasks.length})
                    </TabsTrigger>
                    <TabsTrigger
                      value="assigned"
                      className="flex items-center gap-2 data-[state=active]:bg-electric-blue data-[state=active]:text-dark-bg"
                    >
                      <UserCheck className="h-4 w-4" />
                      Assigned ({assignedTasks.length})
                    </TabsTrigger>
                    <TabsTrigger
                      value="completed"
                      className="flex items-center gap-2 data-[state=active]:bg-electric-green data-[state=active]:text-dark-bg"
                    >
                      <CheckSquare className="h-4 w-4" />
                      Completed ({completedTasks.length})
                    </TabsTrigger>
                  </TabsList>

                  {/* Enhanced Task Rendering Function */}
                  {[
                    {
                      key: "unassigned",
                      tasks: unassignedTasks,
                      icon: ListTodo,
                      emptyMessage: "No unassigned tasks. All tasks are either assigned or completed!",
                    },
                    {
                      key: "assigned",
                      tasks: assignedTasks,
                      icon: UserCheck,
                      emptyMessage: "No assigned tasks. Assign tasks to team members to get started!",
                    },
                    {
                      key: "completed",
                      tasks: completedTasks,
                      icon: CheckSquare,
                      emptyMessage: "No completed tasks yet. Complete some tasks to see them here!",
                    },
                  ].map(({ key, tasks: tabTasks, icon: Icon, emptyMessage }) => (
                    <TabsContent key={key} value={key} className="mt-4">
                      {tabTasks.length === 0 ? (
                        <div className="text-center py-8">
                          <Icon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                          <p className="text-muted-foreground">{emptyMessage}</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {key === "completed" && (
                            <div className="text-sm text-electric-green mb-4">
                              🎉 Great progress! {tabTasks.length} task{tabTasks.length !== 1 ? "s" : ""} completed
                            </div>
                          )}
                          {tabTasks.map((task, index) => (
                            <div
                              key={task.id}
                              className={`p-4 rounded-lg border transition-all duration-300 ${
                                task.completed
                                  ? "bg-dark-bg/50 border-electric-green/30"
                                  : "bg-dark-bg border-dark-border hover:border-electric-blue/50"
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-electric-blue/20 flex items-center justify-center text-xs font-bold text-electric-blue">
                                    {index + 1}
                                  </div>
                                  <Checkbox
                                    checked={task.completed}
                                    onCheckedChange={(checked) => toggleTaskCompletion(task.id, checked as boolean)}
                                    className="border-electric-blue data-[state=checked]:bg-electric-blue"
                                  />
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1">
                                      {editingTask === task.id ? (
                                        <div className="space-y-2">
                                          <Input
                                            value={editValues.title}
                                            onChange={(e) => setEditValues({ ...editValues, title: e.target.value })}
                                            className="bg-dark-bg border-dark-border"
                                          />
                                          <div className="flex items-center gap-2">
                                            <Input
                                              type="number"
                                              value={editValues.estimated_hours}
                                              onChange={(e) =>
                                                setEditValues({
                                                  ...editValues,
                                                  estimated_hours: Number.parseInt(e.target.value),
                                                })
                                              }
                                              className="w-20 bg-dark-bg border-dark-border"
                                              min="1"
                                              max="24"
                                            />
                                            <span className="text-sm text-muted-foreground">hours</span>
                                            <Button
                                              size="sm"
                                              onClick={saveEdit}
                                              className="bg-electric-blue hover:bg-electric-blue/80"
                                            >
                                              Save
                                            </Button>
                                            <Button size="sm" variant="outline" onClick={() => setEditingTask(null)}>
                                              Cancel
                                            </Button>
                                          </div>
                                        </div>
                                      ) : (
                                        <>
                                          <h4
                                            className={`font-medium ${task.completed ? "line-through text-muted-foreground" : "text-foreground"}`}
                                          >
                                            {task.title}
                                          </h4>
                                          {task.description && (
                                            <p
                                              className={`text-sm mt-1 ${task.completed ? "line-through text-muted-foreground" : "text-muted-foreground"}`}
                                            >
                                              {task.description}
                                            </p>
                                          )}
                                        </>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-2">
                                      {/* Replace the priority badge rendering with proper colors */}
                                      <Badge
                                        variant="outline"
                                        className={`${
                                          task.priority === "high"
                                            ? "border-red-500/50 text-red-400 bg-red-500/10"
                                            : task.priority === "medium"
                                              ? "border-yellow-500/50 text-yellow-400 bg-yellow-500/10"
                                              : "border-green-500/50 text-green-400 bg-green-500/10"
                                        }`}
                                      >
                                        {task.priority}
                                      </Badge>

                                      {task.estimated_hours && (
                                        <Badge variant="outline" className="border-electric-blue/30 text-electric-blue">
                                          <Clock className="h-3 w-3 mr-1" />
                                          {task.estimated_hours}h
                                        </Badge>
                                      )}

                                      {/* Task controls */}
                                      {!task.completed && editingTask !== task.id && (
                                        <div className="flex items-center gap-1">
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => startEditing(task)}
                                            className="h-8 w-8 p-0 hover:bg-electric-blue/20 hover:text-electric-blue"
                                            title="Edit task"
                                          >
                                            <Edit className="h-4 w-4" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => deleteTask(task.id)}
                                            className="h-8 w-8 p-0 hover:bg-red-500/20 hover:text-red-400"
                                            title="Delete task"
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-between mt-3">
                                    <div className="flex items-center gap-2">
                                      {task.assignee ? (
                                        <div className="flex items-center gap-2">
                                          <Avatar className="h-6 w-6">
                                            <AvatarFallback className="text-xs bg-electric-blue text-dark-bg">
                                              {task.assignee?.full_name?.charAt(0) ||
                                                task.assignee?.email?.charAt(0) ||
                                                "?"}
                                            </AvatarFallback>
                                          </Avatar>
                                          <span className="text-sm text-muted-foreground">
                                            {task.assignee?.full_name || task.assignee?.email || "Unknown User"}
                                          </span>
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                          <User className="h-4 w-4" />
                                          <span className="text-sm">Unassigned</span>
                                        </div>
                                      )}
                                    </div>

                                    {!task.completed && editingTask !== task.id && (
                                      <Select
                                        value={task.assigned_to || "unassigned"}
                                        onValueChange={(value) =>
                                          assignTask(task.id, value === "unassigned" ? null : value)
                                        }
                                      >
                                        <SelectTrigger className="w-32 h-8 bg-dark-bg border-dark-border">
                                          <SelectValue />
                                        </SelectTrigger>
                                        {/* Fixed duplicate user issue */}
                                        <SelectContent className="bg-dark-surface border-dark-border">
                                          <SelectItem value="unassigned">Unassigned</SelectItem>
                                          {assignableUsers.map((user) => (
                                            <SelectItem key={user.id} value={user.id}>
                                              {user.full_name || user.email}
                                              {user.isCurrentUser ? " (You)" : ""}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    )}
                                  </div>

                                  {task.completed_at && (
                                    <div className="text-xs text-electric-green mt-2">
                                      Completed {new Date(task.completed_at).toLocaleDateString()}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </TabsContent>
                  ))}
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Right Side */}
          <div className="space-y-6">
            {/* Team Management */}
            <EnhancedTeamManagement hackathonId={hackathonId} hackathon={hackathon} />

            {/* AI Insights */}
            <AIInsights hackathon={hackathon} tasks={tasks} teamMembers={teamMembers} timeRemaining={timeRemaining} />

            {/* AI Task Suggestions */}
            <AITaskSuggestions
              hackathon={hackathon}
              tasks={tasks}
              teamMembers={teamMembers}
              timeRemaining={timeRemaining}
              onTaskAdded={() => {
                // Reload tasks when a new task is added
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
