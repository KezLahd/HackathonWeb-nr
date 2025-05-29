"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Bell, X, AlertTriangle, Clock, CheckCircle, Lightbulb } from "lucide-react"

interface SmartNotification {
  id: string
  type: "warning" | "reminder" | "achievement" | "suggestion"
  title: string
  message: string
  timestamp: Date
  actionable?: boolean
  dismissed?: boolean
}

interface SmartNotificationsProps {
  hackathonId: string
  hackathon?: any
  tasks?: any[]
  teamMembers?: any[]
}

export function SmartNotifications({ hackathonId, hackathon, tasks = [], teamMembers = [] }: SmartNotificationsProps) {
  const [notifications, setNotifications] = useState<SmartNotification[]>([])
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (hackathon) {
      generateSmartNotifications()

      // Check for new notifications every 5 minutes
      const interval = setInterval(generateSmartNotifications, 5 * 60 * 1000)
      return () => clearInterval(interval)
    }
  }, [tasks, hackathon, teamMembers])

  const generateSmartNotifications = () => {
    if (!hackathon || !hackathon.end_time) return

    const newNotifications: SmartNotification[] = []
    const now = new Date()
    const endTime = new Date(hackathon.end_time)
    const startTime = new Date(hackathon.start_time)
    const timeRemaining = Math.max(0, Math.floor((endTime.getTime() - now.getTime()) / (1000 * 60 * 60)))
    const hackathonStarted = now >= startTime
    const hackathonEnded = now >= endTime

    // Don't generate notifications if hackathon hasn't started or has ended
    if (!hackathonStarted || hackathonEnded) return

    const completedTasks = tasks.filter((t) => t.status === "completed")
    const highPriorityTasks = tasks.filter((t) => t.priority === "high" && t.status !== "completed")
    const unassignedTasks = tasks.filter((t) => !t.assigned_to)

    // Time-based warnings
    if (timeRemaining <= 2 && timeRemaining > 0) {
      newNotifications.push({
        id: "time-critical",
        type: "warning",
        title: "⏰ Final Hours!",
        message: `Only ${timeRemaining} hours left! Focus on high-priority tasks and presentation prep.`,
        timestamp: now,
        actionable: true,
      })
    } else if (timeRemaining <= 6 && timeRemaining > 2) {
      newNotifications.push({
        id: "time-warning",
        type: "reminder",
        title: "🚨 Time Running Low",
        message: `${timeRemaining} hours remaining. Consider wrapping up features and starting presentation prep.`,
        timestamp: now,
        actionable: true,
      })
    } else if (timeRemaining <= 12 && timeRemaining > 6) {
      newNotifications.push({
        id: "time-reminder",
        type: "reminder",
        title: "⏳ Halfway Point",
        message: `${timeRemaining} hours remaining. Good time to review progress and adjust priorities.`,
        timestamp: now,
        actionable: true,
      })
    }

    // High priority task warnings
    if (highPriorityTasks.length > 0 && timeRemaining <= 12) {
      newNotifications.push({
        id: "high-priority-tasks",
        type: "warning",
        title: "🔥 High Priority Tasks Pending",
        message: `${highPriorityTasks.length} high-priority tasks still need attention. Consider reassigning or simplifying.`,
        timestamp: now,
        actionable: true,
      })
    }

    // Unassigned tasks
    if (unassignedTasks.length > 2) {
      newNotifications.push({
        id: "unassigned-tasks",
        type: "suggestion",
        title: "👥 Tasks Need Assignment",
        message: `${unassignedTasks.length} tasks are unassigned. Better distribution could improve efficiency.`,
        timestamp: now,
        actionable: true,
      })
    }

    // Progress achievements
    const progressPercentage = tasks.length > 0 ? (completedTasks.length / tasks.length) * 100 : 0
    if (progressPercentage >= 50 && progressPercentage < 60) {
      newNotifications.push({
        id: "halfway-achievement",
        type: "achievement",
        title: "🎉 Halfway There!",
        message: "Great progress! You've completed over 50% of your tasks. Keep up the momentum!",
        timestamp: now,
      })
    } else if (progressPercentage >= 80) {
      newNotifications.push({
        id: "almost-done",
        type: "achievement",
        title: "🚀 Almost Done!",
        message: "Excellent work! 80%+ complete. Time to focus on polish and presentation!",
        timestamp: now,
      })
    }

    // Team size suggestions
    if (teamMembers.length === 1 && tasks.length > 5) {
      newNotifications.push({
        id: "team-size-suggestion",
        type: "suggestion",
        title: "👥 Consider Adding Team Members",
        message: "You have many tasks for a solo project. Consider inviting collaborators to help!",
        timestamp: now,
        actionable: true,
      })
    }

    // Presentation reminder
    if (timeRemaining <= 4 && timeRemaining > 0) {
      const presentationTasks = tasks.filter(
        (t) =>
          t.title.toLowerCase().includes("presentation") ||
          t.title.toLowerCase().includes("demo") ||
          t.title.toLowerCase().includes("pitch") ||
          t.title.toLowerCase().includes("slides"),
      )

      if (presentationTasks.length === 0) {
        newNotifications.push({
          id: "presentation-reminder",
          type: "reminder",
          title: "🎤 Presentation Prep",
          message: "Don't forget to prepare your presentation! Create a demo task if you haven't already.",
          timestamp: now,
          actionable: true,
        })
      }
    }

    // No tasks warning
    if (tasks.length === 0 && hackathonStarted) {
      newNotifications.push({
        id: "no-tasks-warning",
        type: "warning",
        title: "📝 No Tasks Created",
        message: "Get started by creating your first task! Break down your project into manageable pieces.",
        timestamp: now,
        actionable: true,
      })
    }

    // Filter out existing notifications and add new ones
    const existingIds = notifications.map((n) => n.id)
    const filteredNew = newNotifications.filter((n) => !existingIds.includes(n.id))

    if (filteredNew.length > 0) {
      setNotifications((prev) => [...prev, ...filteredNew])
    }
  }

  const dismissNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  const clearAllNotifications = () => {
    setNotifications([])
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-red-400" />
      case "reminder":
        return <Clock className="h-4 w-4 text-yellow-400" />
      case "achievement":
        return <CheckCircle className="h-4 w-4 text-electric-green" />
      case "suggestion":
        return <Lightbulb className="h-4 w-4 text-electric-blue" />
      default:
        return <Bell className="h-4 w-4" />
    }
  }

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "warning":
        return "border-red-500/30 bg-red-500/10"
      case "reminder":
        return "border-yellow-500/30 bg-yellow-500/10"
      case "achievement":
        return "border-electric-green/30 bg-electric-green/10"
      case "suggestion":
        return "border-electric-blue/30 bg-electric-blue/10"
      default:
        return "border-electric-blue/30 bg-electric-blue/10"
    }
  }

  const unreadCount = notifications.filter((n) => !n.dismissed).length

  return (
    <>
      {/* Notification Bell */}
      <div className="relative">
        <Button
          onClick={() => setIsOpen(!isOpen)}
          variant="ghost"
          size="sm"
          className="relative bg-dark-surface/80 backdrop-blur-sm border border-dark-border hover:bg-dark-surface"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 bg-electric-blue text-dark-bg text-xs">
              {unreadCount}
            </Badge>
          )}
        </Button>

        {/* Notifications Panel */}
        {isOpen && (
          <div className="absolute top-12 right-0 z-50 w-80 max-w-[calc(100vw-2rem)]">
            <Card className="border-glow bg-dark-surface/95 backdrop-blur-sm shadow-2xl max-h-96 overflow-hidden">
              <CardContent className="p-0">
                <div className="p-4 border-b border-dark-border">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-glow">Smart Notifications</h3>
                    <div className="flex items-center gap-2">
                      {notifications.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={clearAllNotifications}
                          className="text-xs text-muted-foreground hover:text-foreground"
                        >
                          Clear All
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)} className="h-8 w-8 p-0">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                      <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No notifications yet</p>
                      <p className="text-xs mt-1">
                        Smart notifications will appear here to help guide your hackathon progress
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 p-2">
                      {notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`p-3 rounded-lg border ${getNotificationColor(notification.type)}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2 flex-1">
                              {getNotificationIcon(notification.type)}
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-sm">{notification.title}</h4>
                                <p className="text-xs text-muted-foreground mt-1">{notification.message}</p>
                                <p className="text-xs text-muted-foreground mt-2">
                                  {notification.timestamp.toLocaleTimeString()}
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => dismissNotification(notification.id)}
                              className="h-6 w-6 p-0 opacity-50 hover:opacity-100"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </>
  )
}
