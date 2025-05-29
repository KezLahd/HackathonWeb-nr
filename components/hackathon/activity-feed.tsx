"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { Activity, UserPlus, CheckCircle2, UserCheck, Clock, Zap, Target, Wifi, WifiOff } from "lucide-react"

interface ActivityItem {
  id: string
  type: "team_join" | "task_assigned" | "task_completed" | "task_created"
  user_name: string
  user_email: string
  description: string
  timestamp: string
  metadata?: any
}

interface ActivityFeedProps {
  hackathonId: string
  currentUserId?: string
}

export function ActivityFeed({ hackathonId, currentUserId }: ActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const channelRef = useRef<any>(null)
  const mountedRef = useRef(true)

  // Load recent activities
  const loadActivities = useCallback(async () => {
    if (!mountedRef.current) return

    try {
      console.log("🔄 Loading recent activities for hackathon:", hackathonId)

      // Get recent team member activities
      const { data: teamActivities, error: teamError } = await supabase
        .from("team_members")
        .select(`
          id,
          user_id,
          role,
          joined_at,
          profiles:user_id(full_name, email)
        `)
        .eq("hackathon_id", hackathonId)
        .order("joined_at", { ascending: false })
        .limit(10)

      if (teamError) throw teamError

      // Get recent task activities
      const { data: taskActivities, error: taskError } = await supabase
        .from("tasks")
        .select(`
          id,
          title,
          completed,
          assigned_to,
          completed_at,
          created_at,
          assignee:assigned_to(full_name, email)
        `)
        .eq("hackathon_id", hackathonId)
        .order("created_at", { ascending: false })
        .limit(10)

      if (taskError) throw taskError

      // Transform activities
      const activities: ActivityItem[] = []

      // Add team join activities
      teamActivities?.forEach((member) => {
        if (member.profiles) {
          activities.push({
            id: `team-${member.id}`,
            type: "team_join",
            user_name: member.profiles[0]?.full_name || member.profiles[0]?.email || "Unknown",
            user_email: member.profiles[0]?.email || "",
            description: `${member.role === "creator" ? "Created" : "Joined"} the team`,
            timestamp: member.joined_at,
            metadata: { role: member.role },
          })
        }
      })

      // Add task activities
      taskActivities?.forEach((task) => {
        // Task creation
        activities.push({
          id: `task-created-${task.id}`,
          type: "task_created",
          user_name: "System",
          user_email: "",
          description: `Task "${task.title}" was created`,
          timestamp: task.created_at,
          metadata: { taskTitle: task.title },
        })

        // Task completion
        if (task.completed && task.completed_at) {
          activities.push({
            id: `task-completed-${task.id}`,
            type: "task_completed",
            user_name: task.assignee[0]?.full_name || "Someone",
            user_email: task.assignee[0]?.email || "",
            description: `Completed task "${task.title}"`,
            timestamp: task.completed_at,
            metadata: { taskTitle: task.title },
          })
        }

        // Task assignment
        if (task.assigned_to && task.assignee) {
          activities.push({
            id: `task-assigned-${task.id}`,
            type: "task_assigned",
            user_name: task.assignee[0]?.full_name || task.assignee[0]?.email || "Unknown",
            user_email: task.assignee[0]?.email || "",
            description: `Was assigned task "${task.title}"`,
            timestamp: task.created_at,
            metadata: { taskTitle: task.title },
          })
        }
      })

      // Sort by timestamp and take most recent
      const sortedActivities = activities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 15)

      if (mountedRef.current) {
        setActivities(sortedActivities)
        setLoading(false)
      }
    } catch (error) {
      console.error("Error loading activities:", error)
      if (mountedRef.current) {
        setLoading(false)
      }
    }
  }, [hackathonId])

  // Setup real-time subscription for activity updates
  const setupActivitySubscription = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }

    console.log("🔌 Setting up activity feed subscription:", hackathonId)

    const channel = supabase
      .channel(`activity-feed-${hackathonId}-${Date.now()}`, {
        config: {
          broadcast: { self: true },
          presence: { key: currentUserId || "anonymous" },
        },
      })
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "team_members",
          filter: `hackathon_id=eq.${hackathonId}`,
        },
        (payload) => {
          console.log("🔄 ACTIVITY: Team member change:", payload)
          setIsConnected(true)

          if (payload.eventType === "INSERT" && payload.new) {
            // Show toast notification for new team member
            if (payload.new.user_id !== currentUserId) {
              toast({
                variant: "success",
                title: "New Team Member!",
                description: `Someone joined the team`,
              })
            }
          }

          // Reload activities
          setTimeout(() => {
            if (mountedRef.current) {
              loadActivities()
            }
          }, 500)
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
          filter: `hackathon_id=eq.${hackathonId}`,
        },
        (payload) => {
          console.log("🔄 ACTIVITY: Task change:", payload)
          setIsConnected(true)

          if (payload.eventType === "INSERT" && payload.new) {
            // Show toast for new task
            toast({
              variant: "info",
              title: "New Task Created!",
              description: `"${payload.new.title}" was added`,
            })
          } else if (payload.eventType === "UPDATE" && payload.new && payload.old) {
            // Show toast for task completion
            if (!payload.old.completed && payload.new.completed) {
              toast({
                variant: "success",
                title: "Task Completed! 🎉",
                description: `"${payload.new.title}" was marked as done`,
              })
            }
            // Show toast for task assignment
            if (!payload.old.assigned_to && payload.new.assigned_to) {
              toast({
                variant: "info",
                title: "Task Assigned",
                description: `"${payload.new.title}" was assigned to a team member`,
              })
            }
          }

          // Reload activities
          setTimeout(() => {
            if (mountedRef.current) {
              loadActivities()
            }
          }, 500)
        },
      )
      .subscribe((status) => {
        console.log("📡 Activity feed subscription status:", status)
        setIsConnected(status === "SUBSCRIBED")

        if (status === "CHANNEL_ERROR") {
          console.error("❌ Activity feed subscription error")
          setIsConnected(false)
          // Retry subscription after delay
          setTimeout(() => {
            if (mountedRef.current) {
              setupActivitySubscription()
            }
          }, 3000)
        }
      })

    channelRef.current = channel
  }, [hackathonId, currentUserId, toast, loadActivities])

  useEffect(() => {
    mountedRef.current = true

    const initializeActivityFeed = async () => {
      await loadActivities()
      setupActivitySubscription()
    }

    initializeActivityFeed()

    return () => {
      console.log("🧹 Activity feed unmounting, cleaning up...")
      mountedRef.current = false

      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [hackathonId])

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "team_join":
        return <UserPlus className="h-4 w-4 text-electric-blue" />
      case "task_assigned":
        return <UserCheck className="h-4 w-4 text-yellow-400" />
      case "task_completed":
        return <CheckCircle2 className="h-4 w-4 text-electric-green" />
      case "task_created":
        return <Target className="h-4 w-4 text-neon-purple" />
      default:
        return <Activity className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getActivityColor = (type: string) => {
    switch (type) {
      case "team_join":
        return "border-electric-blue/30 bg-electric-blue/10"
      case "task_assigned":
        return "border-yellow-500/30 bg-yellow-500/10"
      case "task_completed":
        return "border-electric-green/30 bg-electric-green/10"
      case "task_created":
        return "border-neon-purple/30 bg-neon-purple/10"
      default:
        return "border-dark-border bg-dark-bg"
    }
  }

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date()
    const time = new Date(timestamp)
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60))

    if (diffInMinutes < 1) return "Just now"
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    return `${Math.floor(diffInMinutes / 1440)}d ago`
  }

  if (loading) {
    return (
      <Card className="border-glow bg-dark-surface/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-glow flex items-center gap-2">
            <Activity className="h-5 w-5 text-electric-blue" />
            Activity Feed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
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
            <Activity className="h-5 w-5 text-electric-blue" />
            Activity Feed
          </CardTitle>
          <div className="flex items-center gap-2">
            {isConnected ? (
              <div className="flex items-center gap-1">
                <Wifi className="h-4 w-4 text-electric-green" />
                <Zap className="h-3 w-3 text-electric-green animate-pulse" />
              </div>
            ) : (
              <WifiOff className="h-4 w-4 text-red-400" />
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          {activities.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No recent activity</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activities.map((activity) => (
                <div
                  key={activity.id}
                  className={`p-3 rounded-lg border transition-all duration-200 animate-in fade-in ${getActivityColor(
                    activity.type,
                  )}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">{getActivityIcon(activity.type)}</div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {activity.user_email && (
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs bg-electric-blue text-dark-bg">
                                {activity.user_name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          <span className="font-medium text-sm">{activity.user_name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">{formatTimeAgo(activity.timestamp)}</span>
                        </div>
                      </div>

                      <p className="text-sm text-muted-foreground mt-1">{activity.description}</p>

                      {activity.metadata?.role === "creator" && (
                        <Badge className="mt-2 bg-neon-purple text-white text-xs">Creator</Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
