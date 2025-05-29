"use client"

import { useState, useEffect } from "react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { presenceService } from "@/lib/presence-service"
import { Circle, Eye, Edit, MessageCircle } from "lucide-react"

interface ActiveUser {
  user_id: string
  activity_type: string
  last_seen: string
  profiles: {
    id: string
    full_name: string
    email: string
  }
}

interface PresenceIndicatorProps {
  hackathonId: string
  currentUserId?: string
  onPresenceUpdate?: (activeUsers: ActiveUser[]) => void
}

export function PresenceIndicator({ hackathonId, currentUserId, onPresenceUpdate }: PresenceIndicatorProps) {
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([])

  useEffect(() => {
    loadActiveUsers()

    // Refresh active users every 30 seconds
    const interval = setInterval(loadActiveUsers, 30000)

    return () => clearInterval(interval)
  }, [hackathonId])

  const loadActiveUsers = async () => {
    try {
      const users = await presenceService.getActiveUsers(hackathonId)
      setActiveUsers(users)

      if (onPresenceUpdate) {
        onPresenceUpdate(users)
      }
    } catch (error) {
      console.error("Error loading active users:", error)
    }
  }

  const getActivityIcon = (activityType: string) => {
    switch (activityType) {
      case "editing":
        return <Edit className="h-3 w-3" />
      case "typing":
        return <MessageCircle className="h-3 w-3" />
      case "viewing":
      default:
        return <Eye className="h-3 w-3" />
    }
  }

  const getActivityColor = (activityType: string) => {
    switch (activityType) {
      case "editing":
        return "text-yellow-400"
      case "typing":
        return "text-blue-400"
      case "viewing":
      default:
        return "text-green-400"
    }
  }

  const getActivityText = (activityType: string) => {
    switch (activityType) {
      case "editing":
        return "Editing"
      case "typing":
        return "Typing"
      case "viewing":
      default:
        return "Viewing"
    }
  }

  // Filter out current user and get unique users
  const otherActiveUsers = activeUsers.filter((user) => user.user_id !== currentUserId)
  const uniqueUsers = otherActiveUsers.reduce((acc, user) => {
    const existing = acc.find((u) => u.user_id === user.user_id)
    if (!existing) {
      acc.push(user)
    }
    return acc
  }, [] as ActiveUser[])

  if (uniqueUsers.length === 0) {
    return null
  }

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        <div className="flex -space-x-2">
          {uniqueUsers.slice(0, 3).map((user) => (
            <Tooltip key={user.user_id}>
              <TooltipTrigger>
                <div className="relative">
                  <Avatar className="h-8 w-8 border-2 border-dark-surface">
                    <AvatarFallback className="bg-electric-blue text-dark-bg text-xs">
                      {user.profiles?.full_name?.charAt(0) || user.profiles?.email?.charAt(0) || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div
                    className={`absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-dark-surface flex items-center justify-center ${getActivityColor(user.activity_type)}`}
                  >
                    <Circle className="h-2 w-2 fill-current" />
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent className="bg-dark-surface border-dark-border">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{user.profiles?.full_name || user.profiles?.email}</span>
                  <Badge variant="outline" className={`text-xs ${getActivityColor(user.activity_type)} border-current`}>
                    {getActivityIcon(user.activity_type)}
                    <span className="ml-1">{getActivityText(user.activity_type)}</span>
                  </Badge>
                </div>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>

        {uniqueUsers.length > 3 && (
          <Badge variant="outline" className="text-xs text-muted-foreground">
            +{uniqueUsers.length - 3} more
          </Badge>
        )}

        <span className="text-xs text-muted-foreground">{uniqueUsers.length} online</span>
      </div>
    </TooltipProvider>
  )
}
