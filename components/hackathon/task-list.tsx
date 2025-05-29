"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { supabase } from "@/lib/supabase"
import { ApiClient } from "@/lib/api-client"
import {
  CheckCircle2,
  Clock,
  User,
  Plus,
  Wifi,
  WifiOff,
  ListTodo,
  UserCheck,
  CheckSquare,
  Edit,
  Trash2,
} from "lucide-react"
import { AddTaskModal } from "./add-task-modal"
import { useToast } from "@/hooks/use-toast"

interface Task {
  id: string
  title: string
  description: string
  completed: boolean
  priority: string
  estimated_hours: number
  assigned_to: string | null
  completed_at: string | null
  assignee?: {
    id: string
    full_name: string
    email: string
  }
}

interface TaskListProps {
  hackathonId: string
  hackathon?: any
}

export function TaskList({ hackathonId, hackathon }: TaskListProps) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [teamMembers, setTeamMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isConnected, setIsConnected] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [activeTab, setActiveTab] = useState("unassigned")
  const { toast } = useToast()

  // Use refs to track subscription state
  const channelRef = useRef<any>(null)
  const mountedRef = useRef(true)

  // Smart task sorting function
  const sortTasks = useCallback((tasksToSort: Task[]) => {
    return [...tasksToSort].sort((a, b) => {
      // Priority weights: high = 3, medium = 2, low = 1
      const priorityWeight = { high: 3, medium: 2, low: 1 }
      const aPriority = priorityWeight[a.priority as keyof typeof priorityWeight] || 1
      const bPriority = priorityWeight[b.priority as keyof typeof priorityWeight] || 1

      // First sort by priority (high to low)
      if (aPriority !== bPriority) {
        return bPriority - aPriority
      }

      // Then by estimated hours (shorter tasks first for quick wins)
      const aHours = a.estimated_hours || 0
      const bHours = b.estimated_hours || 0
      if (aHours !== bHours) {
        return aHours - bHours
      }

      // Finally by creation time (older tasks first)
      return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
    })
  }, [])

  // Categorize tasks into tabs
  const categorizedTasks = useCallback(() => {
    const unassigned = tasks.filter((task) => !task.assigned_to && !task.completed)
    const assigned = tasks.filter((task) => task.assigned_to && !task.completed)
    const completed = tasks.filter((task) => task.completed)

    return {
      unassigned: sortTasks(unassigned),
      assigned: sortTasks(assigned),
      completed: sortTasks(completed),
    }
  }, [tasks, sortTasks])

  // Enhanced task loading using API endpoint
  const loadTasks = useCallback(
    async (forceRefresh = false) => {
      if (!mountedRef.current) return

      try {
        console.log(`🔄 Loading tasks via API for hackathon: ${hackathonId} ${forceRefresh ? "(forced)" : ""}`)

        const result = await ApiClient.getTasks(hackathonId)

        if (mountedRef.current) {
          setTasks(result.tasks)
          setLastUpdate(new Date())
          setIsConnected(true)
          console.log("✅ Tasks loaded via API:", result.tasks.length)
        }
      } catch (error: any) {
        console.error("Error loading tasks via API:", error)
        if (mountedRef.current) {
          setIsConnected(false)
          toast({
            title: "Connection Error",
            description: "Failed to load tasks. Please check your connection.",
            variant: "destructive",
          })
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false)
        }
      }
    },
    [hackathonId, toast],
  )

  const loadTeamMembers = useCallback(async () => {
    if (!mountedRef.current) return

    try {
      const result = await ApiClient.getTeamMembers(hackathonId)
      if (result.success && mountedRef.current) {
        setTeamMembers(result.members.map((member: any) => member.profiles).filter(Boolean))
      }
    } catch (error: any) {
      console.error("Error loading team members:", error)
      if (mountedRef.current) {
        toast({
          title: "Error",
          description: "Failed to load team members",
          variant: "destructive",
        })
      }
    }
  }, [hackathonId, toast])

  // Setup real-time subscription for tasks
  const setupTasksRealtimeSubscription = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }

    console.log("🔌 Setting up real-time subscription for tasks:", hackathonId)

    const channel = supabase
      .channel(`tasks-realtime-${hackathonId}-${Date.now()}`, {
        config: {
          broadcast: { self: true },
          presence: { key: currentUser?.id || "anonymous" },
        },
      })
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
          filter: `hackathon_id=eq.${hackathonId}`,
        },
        (payload) => {
          console.log(
            "🔄 REAL-TIME: Task change detected:",
            payload.eventType,
            payload.new?.title || payload.old?.title,
          )
          setIsConnected(true)

          // Reload tasks via API for consistency
          setTimeout(() => {
            if (mountedRef.current) {
              loadTasks(true)
            }
          }, 100)
        },
      )
      .subscribe((status) => {
        console.log("📡 Tasks subscription status:", status)
        setIsConnected(status === "SUBSCRIBED")

        if (status === "CHANNEL_ERROR") {
          console.error("❌ Tasks subscription error")
          setIsConnected(false)
          // Retry subscription after delay
          setTimeout(() => {
            if (mountedRef.current) {
              setupTasksRealtimeSubscription()
            }
          }, 3000)
        }
      })

    channelRef.current = channel
  }, [hackathonId, currentUser?.id, loadTasks])

  useEffect(() => {
    mountedRef.current = true

    const initializeComponent = async () => {
      // Load current user
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (mountedRef.current) {
        setCurrentUser(user)
      }

      // Initial data load
      await loadTasks()
      await loadTeamMembers()

      // Setup real-time subscription
      if (user && mountedRef.current) {
        setupTasksRealtimeSubscription()
      }
    }

    initializeComponent()

    // Cleanup function
    return () => {
      console.log("🧹 TaskList unmounting, cleaning up...")
      mountedRef.current = false

      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [hackathonId])

  // Re-setup subscription when user changes
  useEffect(() => {
    if (currentUser && mountedRef.current) {
      setupTasksRealtimeSubscription()
    }
  }, [currentUser, setupTasksRealtimeSubscription])

  // Enhanced task completion using API
  const toggleTaskCompletion = async (taskId: string, completed: boolean) => {
    try {
      // Optimistic update
      setTasks((prev) =>
        prev.map((task) =>
          task.id === taskId ? { ...task, completed, completed_at: completed ? new Date().toISOString() : null } : task,
        ),
      )

      const result = await ApiClient.completeTask(taskId, completed, currentUser?.id || "")

      console.log("✅ Task completion updated via API")

      // Auto-switch to appropriate tab after completion/reopening
      if (completed) {
        setTimeout(() => setActiveTab("completed"), 500)
      } else {
        // If reopened, switch to assigned or unassigned based on assignment
        const task = tasks.find((t) => t.id === taskId)
        setTimeout(() => setActiveTab(task?.assigned_to ? "assigned" : "unassigned"), 500)
      }

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

  // Enhanced task assignment using API with better error handling
  const assignTask = async (taskId: string, userId: string | null) => {
    try {
      // Optimistic update
      const assignee = userId ? teamMembers.find((member) => member.id === userId) : null
      setTasks((prev) => prev.map((task) => (task.id === taskId ? { ...task, assigned_to: userId, assignee } : task)))

      const result = await ApiClient.assignTask(taskId, userId, currentUser?.id || "")

      console.log("✅ Task assigned via API")

      // Auto-switch to appropriate tab after assignment
      setTimeout(() => setActiveTab(userId ? "assigned" : "unassigned"), 500)

      const assigneeName = assignee?.full_name || assignee?.email || "someone"
      toast({
        title: userId ? "Task Assigned!" : "Task Unassigned",
        description: userId ? `Task assigned to ${assigneeName}` : "Task has been unassigned",
        variant: "default",
      })
    } catch (error: any) {
      console.error("Error assigning task:", error)

      // Revert optimistic update on error
      loadTasks(true)

      toast({
        title: "Assignment Failed",
        description: error.message || "Failed to assign task. Please try again.",
        variant: "destructive",
      })
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-500/20 text-red-400 border-red-500/30"
      case "medium":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
      case "low":
        return "bg-green-500/20 text-green-400 border-green-500/30"
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30"
    }
  }

  const editTask = (task: Task) => {
    // You can implement a modal or inline editing here
    const newTitle = prompt("Edit task title:", task.title)
    if (newTitle && newTitle !== task.title) {
      updateTask(task.id, { title: newTitle })
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

  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    try {
      const { error } = await supabase.from("tasks").update(updates).eq("id", taskId)
      if (error) throw error

      // Reload tasks
      loadTasks(true)

      toast({
        title: "Task Updated",
        description: "Task has been updated successfully",
        variant: "default",
      })
    } catch (error: any) {
      console.error("Error updating task:", error)
      toast({
        title: "Error",
        description: "Failed to update task. Please try again.",
        variant: "destructive",
      })
    }
  }

  const renderTaskCard = (task: Task) => (
    <div
      key={`${task.id}-${task.completed}-${task.assigned_to}`}
      className={`p-4 rounded-lg border transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 ${
        task.completed
          ? "bg-dark-bg/50 border-electric-green/30"
          : "bg-dark-bg border-dark-border hover:border-electric-blue/50"
      }`}
    >
      <div className="flex items-start gap-3">
        <Checkbox
          checked={task.completed}
          onCheckedChange={(checked) => toggleTaskCompletion(task.id, checked as boolean)}
          className="mt-1 border-electric-blue data-[state=checked]:bg-electric-blue"
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
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
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline" className={getPriorityColor(task.priority)}>
                {task.priority}
              </Badge>
              {task.estimated_hours && (
                <Badge variant="outline" className="border-electric-blue/30 text-electric-blue">
                  <Clock className="h-3 w-3 mr-1" />
                  {task.estimated_hours}h
                </Badge>
              )}

              {/* Edit and Delete buttons for creators */}
              {hackathon?.created_by === currentUser?.id && (
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editTask(task)}
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
                      {task.assignee?.full_name?.charAt(0) || task.assignee?.email?.charAt(0) || "?"}
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

            {!task.completed && (
              <Select
                value={task.assigned_to || "unassigned"}
                onValueChange={(value) => assignTask(task.id, value === "unassigned" ? null : value)}
              >
                <SelectTrigger className="w-32 h-8 bg-dark-bg border-dark-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-dark-surface border-dark-border">
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {teamMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.full_name || member.email}
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
  )

  const taskCategories = categorizedTasks()
  const completedTasks = taskCategories.completed.length
  const totalTasks = tasks.length
  const progressPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0

  if (loading) {
    return (
      <Card className="border-glow bg-dark-surface/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-glow flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-electric-blue" />
            Tasks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-dark-bg rounded-lg"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className="border-glow bg-dark-surface/80 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-glow flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-electric-blue" />
              Tasks ({completedTasks}/{totalTasks})
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setIsAddModalOpen(true)}
                size="sm"
                className="bg-electric-blue hover:bg-electric-blue/80 text-dark-bg"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Task
              </Button>
              {isConnected ? (
                <Wifi className="h-4 w-4 text-electric-green" title="Real-time connected" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-400" title="Connection lost" />
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
              <span>Progress</span>
              <div className="flex items-center gap-2">
                <span>{Math.round(progressPercentage)}%</span>
                <span className="text-xs">Updated: {lastUpdate.toLocaleTimeString()}</span>
              </div>
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
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-dark-bg border-dark-border">
              <TabsTrigger
                value="unassigned"
                className="flex items-center gap-2 data-[state=active]:bg-electric-blue data-[state=active]:text-dark-bg"
              >
                <ListTodo className="h-4 w-4" />
                Unassigned ({taskCategories.unassigned.length})
              </TabsTrigger>
              <TabsTrigger
                value="assigned"
                className="flex items-center gap-2 data-[state=active]:bg-electric-blue data-[state=active]:text-dark-bg"
              >
                <UserCheck className="h-4 w-4" />
                Assigned ({taskCategories.assigned.length})
              </TabsTrigger>
              <TabsTrigger
                value="completed"
                className="flex items-center gap-2 data-[state=active]:bg-electric-green data-[state=active]:text-dark-bg"
              >
                <CheckSquare className="h-4 w-4" />
                Completed ({taskCategories.completed.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="unassigned" className="mt-4">
              {taskCategories.unassigned.length === 0 ? (
                <div className="text-center py-8">
                  <ListTodo className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    No unassigned tasks. All tasks are either assigned or completed!
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-sm text-muted-foreground mb-4">
                    Sorted by priority (high → low) and estimated time (quick wins first)
                  </div>
                  {taskCategories.unassigned.map(renderTaskCard)}
                </div>
              )}
            </TabsContent>

            <TabsContent value="assigned" className="mt-4">
              {taskCategories.assigned.length === 0 ? (
                <div className="text-center py-8">
                  <UserCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    No assigned tasks. Assign tasks to team members to get started!
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-sm text-muted-foreground mb-4">
                    Sorted by priority (high → low) and estimated time (quick wins first)
                  </div>
                  {taskCategories.assigned.map(renderTaskCard)}
                </div>
              )}
            </TabsContent>

            <TabsContent value="completed" className="mt-4">
              {taskCategories.completed.length === 0 ? (
                <div className="text-center py-8">
                  <CheckSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No completed tasks yet. Complete some tasks to see them here!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-sm text-electric-green mb-4">
                    🎉 Great progress! {taskCategories.completed.length} task
                    {taskCategories.completed.length !== 1 ? "s" : ""} completed
                  </div>
                  {taskCategories.completed.map(renderTaskCard)}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <AddTaskModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        hackathonId={hackathonId}
        hackathon={hackathon}
        teamMembers={teamMembers}
        onSuccess={() => {
          setIsAddModalOpen(false)
          loadTasks(true)
        }}
      />
    </>
  )
}
