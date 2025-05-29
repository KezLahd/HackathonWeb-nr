"use client"

import type React from "react"

import { useMemo } from "react"

import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { supabase } from "@/lib/supabase"
import { ApiClient } from "@/lib/api-client"
import { TaskOrderingService, type TaskWithOrder } from "@/lib/task-ordering-service"
import { GanttChart } from "./gantt-chart"
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
  GripVertical,
  BarChart3,
  ArrowUp,
  ArrowDown,
  Timer,
} from "lucide-react"
import { AddTaskModal } from "./add-task-modal"
import { useToast } from "@/hooks/use-toast"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

interface Task extends TaskWithOrder {
  assignee?: {
    id: string
    full_name: string
    email: string
  }
}

interface EnhancedTaskListProps {
  hackathonId: string
  hackathon?: any
}

export function EnhancedTaskList({ hackathonId, hackathon }: EnhancedTaskListProps) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [teamMembers, setTeamMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isConnected, setIsConnected] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [activeTab, setActiveTab] = useState("ordered")
  const [showGantt, setShowGantt] = useState(false)
  const [draggedTask, setDraggedTask] = useState<string | null>(null)
  const [editingTask, setEditingTask] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<{
    title: string
    estimated_hours: number
    priority: string
    description: string
  }>({
    title: "",
    estimated_hours: 0,
    priority: "medium",
    description: "",
  })
  const { toast } = useToast()

  // Use refs to track subscription state
  const channelRef = useRef<any>(null)
  const mountedRef = useRef(true)

  // Smart task ordering
  const orderedTasks = useMemo(() => {
    return TaskOrderingService.calculateOptimalOrder(tasks)
  }, [tasks])

  // Categorize tasks
  const categorizedTasks = useCallback(() => {
    const unassigned = orderedTasks.filter((task) => !task.assigned_to && !task.completed)
    const assigned = orderedTasks.filter((task) => task.assigned_to && !task.completed)
    const completed = orderedTasks.filter((task) => task.completed)

    return {
      ordered: orderedTasks.filter((task) => !task.completed),
      unassigned,
      assigned,
      completed,
    }
  }, [orderedTasks])

  // Enhanced task loading using API endpoint
  const loadTasks = useCallback(
    async (forceRefresh = false) => {
      if (!mountedRef.current) return

      try {
        console.log(`🔄 Loading tasks via API for hackathon: ${hackathonId} ${forceRefresh ? "(forced)" : ""}`)

        const result = await ApiClient.getTasks(hackathonId)

        if (mountedRef.current) {
          // Add order_index if missing and apply smart ordering
          const tasksWithOrder = result.tasks.map((task: any, index: number) => ({
            ...task,
            order_index: task.order_index ?? index,
            dependencies: task.dependencies || [],
          }))

          setTasks(tasksWithOrder)
          setLastUpdate(new Date())
          setIsConnected(true)
          console.log("✅ Tasks loaded via API:", tasksWithOrder.length)
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
      console.log("🧹 Enhanced TaskList unmounting, cleaning up...")
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
        setTimeout(() => setActiveTab("ordered"), 500)
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

  // Enhanced task assignment using API
  const assignTask = async (taskId: string, userId: string | null) => {
    try {
      // Optimistic update
      const assignee = userId ? teamMembers.find((member) => member.id === userId) : null
      setTasks((prev) => prev.map((task) => (task.id === taskId ? { ...task, assigned_to: userId, assignee } : task)))

      const result = await ApiClient.assignTask(taskId, userId, currentUser?.id || "")

      console.log("✅ Task assigned via API")

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

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTask(taskId)
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }

  const handleDrop = async (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault()

    if (!draggedTask) return

    const reorderedTasks = TaskOrderingService.reorderTasks(tasks, draggedTask, targetIndex)

    // Optimistic update
    setTasks(reorderedTasks)
    setDraggedTask(null)

    // Update database
    try {
      await Promise.all(
        reorderedTasks.map((task) =>
          supabase.from("tasks").update({ order_index: task.order_index }).eq("id", task.id),
        ),
      )

      toast({
        title: "Task Order Updated",
        description: "Task order has been saved successfully",
        variant: "default",
      })
    } catch (error) {
      console.error("Error updating task order:", error)
      loadTasks(true) // Reload on error
      toast({
        title: "Error",
        description: "Failed to save task order",
        variant: "destructive",
      })
    }
  }

  // Task editing
  const startEditing = (task: Task) => {
    setEditingTask(task.id)
    setEditValues({
      title: task.title,
      estimated_hours: task.estimated_hours,
      priority: task.priority,
      description: task.description || "",
    })
  }

  const saveEdit = async () => {
    if (!editingTask) return

    try {
      const { error } = await supabase
        .from("tasks")
        .update({
          title: editValues.title,
          description: editValues.description,
          estimated_hours: editValues.estimated_hours,
          priority: editValues.priority,
        })
        .eq("id", editingTask)

      if (error) throw error

      setEditingTask(null)
      loadTasks(true)

      toast({
        title: "Task Updated Successfully! ✨",
        description: "All changes have been saved",
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

  const moveTaskUp = async (taskId: string) => {
    const currentIndex = tasks.findIndex((task) => task.id === taskId)
    if (currentIndex <= 0) return

    const reorderedTasks = TaskOrderingService.reorderTasks(tasks, taskId, currentIndex - 1)
    setTasks(reorderedTasks)

    // Update database
    try {
      await Promise.all(
        reorderedTasks.map((task) =>
          supabase.from("tasks").update({ order_index: task.order_index }).eq("id", task.id),
        ),
      )
    } catch (error) {
      console.error("Error updating task order:", error)
      loadTasks(true)
    }
  }

  const moveTaskDown = async (taskId: string) => {
    const currentIndex = tasks.findIndex((task) => task.id === taskId)
    if (currentIndex >= tasks.length - 1) return

    const reorderedTasks = TaskOrderingService.reorderTasks(tasks, taskId, currentIndex + 1)
    setTasks(reorderedTasks)

    // Update database
    try {
      await Promise.all(
        reorderedTasks.map((task) =>
          supabase.from("tasks").update({ order_index: task.order_index }).eq("id", task.id),
        ),
      )
    } catch (error) {
      console.error("Error updating task order:", error)
      loadTasks(true)
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

  const renderTaskCard = (task: Task, index: number) => (
    <div
      key={`${task.id}-${task.completed}-${task.assigned_to}-${task.order_index}`}
      className={`p-4 rounded-lg border transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 ${
        task.completed
          ? "bg-dark-bg/50 border-electric-green/30"
          : "bg-dark-bg border-dark-border hover:border-electric-blue/50"
      } ${draggedTask === task.id ? "opacity-50" : ""}`}
      draggable={!task.completed && hackathon?.created_by === currentUser?.id}
      onDragStart={(e) => handleDragStart(e, task.id)}
      onDragOver={handleDragOver}
      onDrop={(e) => handleDrop(e, index)}
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
                <div className="space-y-4 p-4 bg-dark-bg/50 rounded-lg border border-electric-blue/30">
                  <div>
                    <Label htmlFor="edit-title" className="text-sm font-medium text-electric-blue">
                      Task Title
                    </Label>
                    <Input
                      id="edit-title"
                      value={editValues.title}
                      onChange={(e) => setEditValues({ ...editValues, title: e.target.value })}
                      className="bg-dark-bg border-dark-border focus:border-electric-blue mt-1"
                      placeholder="Enter task title..."
                    />
                  </div>

                  <div>
                    <Label htmlFor="edit-description" className="text-sm font-medium text-electric-blue">
                      Description
                    </Label>
                    <Textarea
                      id="edit-description"
                      value={editValues.description}
                      onChange={(e) => setEditValues({ ...editValues, description: e.target.value })}
                      className="bg-dark-bg border-dark-border focus:border-electric-blue mt-1"
                      placeholder="Enter task description..."
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="edit-hours" className="text-sm font-medium text-electric-blue">
                        Time to Complete (hours)
                      </Label>
                      <Input
                        id="edit-hours"
                        type="number"
                        value={editValues.estimated_hours}
                        onChange={(e) =>
                          setEditValues({ ...editValues, estimated_hours: Number.parseInt(e.target.value) || 1 })
                        }
                        className="bg-dark-bg border-dark-border focus:border-electric-blue mt-1"
                        min="1"
                        max="24"
                      />
                    </div>

                    <div>
                      <Label htmlFor="edit-priority" className="text-sm font-medium text-electric-blue">
                        Difficulty Level
                      </Label>
                      <Select
                        value={editValues.priority}
                        onValueChange={(value) => setEditValues({ ...editValues, priority: value })}
                      >
                        <SelectTrigger className="bg-dark-bg border-dark-border mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-dark-surface border-dark-border">
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <Button
                      size="sm"
                      onClick={saveEdit}
                      className="bg-electric-blue hover:bg-electric-blue/80 text-dark-bg font-medium px-4"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Save Changes
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingTask(null)}
                      className="border-dark-border hover:bg-dark-surface px-4"
                    >
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
              <Badge variant="outline" className={getPriorityColor(task.priority)}>
                {task.priority}
              </Badge>
              {task.estimated_hours && (
                <Badge variant="outline" className="border-electric-blue/30 text-electric-blue">
                  <Clock className="h-3 w-3 mr-1" />
                  {task.estimated_hours}h
                </Badge>
              )}

              {/* Task controls for creators */}
              {hackathon?.created_by === currentUser?.id && !task.completed && editingTask !== task.id && (
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => moveTaskUp(task.id)}
                    disabled={index === 0}
                    className="h-8 w-8 p-0 hover:bg-electric-blue/20 hover:text-electric-blue"
                    title="Move up"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => moveTaskDown(task.id)}
                    disabled={index === tasks.length - 1}
                    className="h-8 w-8 p-0 hover:bg-electric-blue/20 hover:text-electric-blue"
                    title="Move down"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
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
                  <div className="cursor-grab hover:cursor-grabbing" title="Drag to reorder">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                  </div>
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

            {!task.completed && editingTask !== task.id && (
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
            Smart Task Management
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
              Smart Task Management ({completedTasks}/{totalTasks})
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setShowGantt(!showGantt)}
                size="sm"
                variant={showGantt ? "default" : "outline"}
                className={
                  showGantt
                    ? "bg-electric-blue hover:bg-electric-blue/80 text-dark-bg"
                    : "border-dark-border hover:bg-dark-surface"
                }
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                {showGantt ? "Hide Timeline" : "Show Timeline"}
              </Button>
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
                <span className="text-xs">Timezone: {TaskOrderingService.getUserTimezone()}</span>
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
          {showGantt && hackathon && (
            <div className="mb-6">
              <GanttChart
                tasks={tasks}
                teamMembers={teamMembers}
                hackathonStart={hackathon.start_time}
                hackathonEnd={hackathon.end_time}
                currentUserId={currentUser?.id}
              />
            </div>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-dark-bg border-dark-border">
              <TabsTrigger
                value="ordered"
                className="flex items-center gap-2 data-[state=active]:bg-electric-blue data-[state=active]:text-dark-bg"
              >
                <Timer className="h-4 w-4" />
                Optimal Order ({taskCategories.ordered.length})
              </TabsTrigger>
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

            <TabsContent value="ordered" className="mt-4">
              {taskCategories.ordered.length === 0 ? (
                <div className="text-center py-8">
                  <Timer className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">All tasks are completed! Great job! 🎉</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-sm text-electric-blue mb-4 p-3 bg-electric-blue/10 rounded-lg border border-electric-blue/30">
                    📋 <strong>Smart Ordering:</strong> Tasks are automatically ordered by priority, dependencies, and
                    estimated time for optimal completion.
                    {hackathon?.created_by === currentUser?.id && (
                      <span className="block mt-1">
                        💡 <strong>Creator Controls:</strong> Drag tasks to reorder, or use arrow buttons to adjust the
                        sequence.
                      </span>
                    )}
                  </div>
                  {taskCategories.ordered.map((task, index) => renderTaskCard(task, index))}
                </div>
              )}
            </TabsContent>

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
                  {taskCategories.unassigned.map((task, index) => renderTaskCard(task, index))}
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
                  {taskCategories.assigned.map((task, index) => renderTaskCard(task, index))}
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
                  {taskCategories.completed.map((task, index) => renderTaskCard(task, index))}
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
