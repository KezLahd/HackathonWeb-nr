import { supabase } from "./supabase"
import { presenceService } from "./presence-service"

export class EnhancedRealtimeService {
  private static instance: EnhancedRealtimeService
  private channels: Map<string, any> = new Map()
  private listeners: Map<string, Set<Function>> = new Map()
  private presenceListeners: Map<string, Set<Function>> = new Map()

  static getInstance(): EnhancedRealtimeService {
    if (!EnhancedRealtimeService.instance) {
      EnhancedRealtimeService.instance = new EnhancedRealtimeService()
    }
    return EnhancedRealtimeService.instance
  }

  // Subscribe to all hackathon changes (simplified version)
  subscribeToHackathon(
    hackathonId: string,
    userId: string,
    callbacks: {
      onTeamChange?: (payload: any) => void
      onTaskChange?: (payload: any) => void
      onPresenceChange?: (payload: any) => void
      onProfileChange?: (payload: any) => void
    },
  ): () => void {
    const channelKey = `hackathon-${hackathonId}`

    console.log("🔌 Setting up simplified hackathon subscription:", channelKey)

    // Initialize listeners
    if (!this.listeners.has(channelKey)) {
      this.listeners.set(channelKey, new Set())
      this.presenceListeners.set(channelKey, new Set())
    }

    // Add callbacks to listeners
    if (callbacks.onTeamChange) this.listeners.get(channelKey)!.add(callbacks.onTeamChange)
    if (callbacks.onTaskChange) this.listeners.get(channelKey)!.add(callbacks.onTaskChange)
    if (callbacks.onPresenceChange) this.presenceListeners.get(channelKey)!.add(callbacks.onPresenceChange)
    if (callbacks.onProfileChange) this.listeners.get(channelKey)!.add(callbacks.onProfileChange)

    // Create channel if it doesn't exist
    if (!this.channels.has(channelKey)) {
      try {
        const channel = supabase
          .channel(channelKey, {
            config: {
              broadcast: { self: false },
              presence: { key: userId },
            },
          })
          // Listen to team member changes
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "team_members",
              filter: `hackathon_id=eq.${hackathonId}`,
            },
            (payload) => {
              console.log("🔄 ENHANCED REALTIME: Team member change:", payload)
              this.notifyListeners(channelKey, { ...payload, type: "team_change" })
            },
          )
          // Listen to task changes
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "tasks",
              filter: `hackathon_id=eq.${hackathonId}`,
            },
            (payload) => {
              console.log("🔄 ENHANCED REALTIME: Task change:", payload)
              this.notifyListeners(channelKey, { ...payload, type: "task_change" })
            },
          )
          // Listen to profile updates (simplified)
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "profiles",
            },
            (payload) => {
              console.log("🔄 ENHANCED REALTIME: Profile update:", payload)
              this.notifyListeners(channelKey, { ...payload, type: "profile_change" })
            },
          )
          // Listen to broadcast messages
          .on("broadcast", { event: "team_sync" }, (payload) => {
            console.log("📡 BROADCAST: Team sync received:", payload)
            this.notifyListeners(channelKey, { ...payload, type: "broadcast" })
          })
          .on("broadcast", { event: "activity_update" }, (payload) => {
            console.log("📡 BROADCAST: Activity update:", payload)
            this.notifyPresenceListeners(channelKey, { ...payload, type: "activity_broadcast" })
          })

        channel.subscribe((status) => {
          console.log(`📡 Enhanced channel ${channelKey} status:`, status)

          if (status === "SUBSCRIBED") {
            console.log("✅ Enhanced subscription successful")

            // Start presence tracking (simplified)
            try {
              presenceService.startPresenceTracking(hackathonId, userId)
            } catch (error) {
              console.warn("⚠️ Presence tracking failed:", error)
            }

            // Track presence in the channel (simplified)
            try {
              channel.track({
                user_id: userId,
                hackathon_id: hackathonId,
                online_at: new Date().toISOString(),
                activity: "viewing",
              })
            } catch (error) {
              console.warn("⚠️ Channel tracking failed:", error)
            }

            // Broadcast that we're online
            try {
              channel.send({
                type: "broadcast",
                event: "activity_update",
                payload: {
                  type: "user_online",
                  hackathon_id: hackathonId,
                  user_id: userId,
                  timestamp: Date.now(),
                },
              })
            } catch (error) {
              console.warn("⚠️ Broadcast failed:", error)
            }
          } else if (status === "CHANNEL_ERROR") {
            console.error("❌ Enhanced subscription error")
            // Clean up and retry after delay
            setTimeout(() => {
              if (this.channels.has(channelKey)) {
                console.log("🔄 Retrying enhanced subscription...")
                this.cleanup()
                this.subscribeToHackathon(hackathonId, userId, callbacks)
              }
            }, 5000)
          } else if (status === "TIMED_OUT") {
            console.warn("⏰ Enhanced subscription timed out")
            // Retry connection
            setTimeout(() => {
              if (this.channels.has(channelKey)) {
                console.log("🔄 Retrying after timeout...")
                channel.subscribe()
              }
            }, 3000)
          } else if (status === "CLOSED") {
            console.log("🔒 Enhanced subscription closed")
          }
        })

        this.channels.set(channelKey, channel)
      } catch (error) {
        console.error("❌ Error creating enhanced channel:", error)
        // Fallback to basic subscription
        return this.createBasicSubscription(hackathonId, userId, callbacks)
      }
    }

    // Return unsubscribe function
    return () => {
      if (callbacks.onTeamChange) this.listeners.get(channelKey)?.delete(callbacks.onTeamChange)
      if (callbacks.onTaskChange) this.listeners.get(channelKey)?.delete(callbacks.onTaskChange)
      if (callbacks.onPresenceChange) this.presenceListeners.get(channelKey)?.delete(callbacks.onPresenceChange)
      if (callbacks.onProfileChange) this.listeners.get(channelKey)?.delete(callbacks.onProfileChange)

      // If no more listeners, cleanup channel
      const hasListeners =
        (this.listeners.get(channelKey)?.size || 0) > 0 || (this.presenceListeners.get(channelKey)?.size || 0) > 0

      if (!hasListeners) {
        const channel = this.channels.get(channelKey)
        if (channel) {
          try {
            presenceService.stopPresenceTracking()
            supabase.removeChannel(channel)
          } catch (error) {
            console.warn("⚠️ Error cleaning up channel:", error)
          }
          this.channels.delete(channelKey)
          this.listeners.delete(channelKey)
          this.presenceListeners.delete(channelKey)
          console.log("🧹 Cleaned up enhanced channel:", channelKey)
        }
      }
    }
  }

  // Fallback basic subscription
  private createBasicSubscription(
    hackathonId: string,
    userId: string,
    callbacks: {
      onTeamChange?: (payload: any) => void
      onTaskChange?: (payload: any) => void
      onPresenceChange?: (payload: any) => void
      onProfileChange?: (payload: any) => void
    },
  ): () => void {
    console.log("🔄 Creating basic fallback subscription for:", hackathonId)

    const channelKey = `basic-${hackathonId}`

    try {
      const channel = supabase
        .channel(channelKey)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "team_members",
            filter: `hackathon_id=eq.${hackathonId}`,
          },
          (payload) => {
            console.log("🔄 BASIC: Team member change:", payload)
            if (callbacks.onTeamChange) callbacks.onTeamChange(payload)
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
            console.log("🔄 BASIC: Task change:", payload)
            if (callbacks.onTaskChange) callbacks.onTaskChange(payload)
          },
        )
        .subscribe((status) => {
          console.log(`📡 Basic subscription status:`, status)
        })

      this.channels.set(channelKey, channel)

      return () => {
        try {
          supabase.removeChannel(channel)
          this.channels.delete(channelKey)
        } catch (error) {
          console.warn("⚠️ Error cleaning up basic channel:", error)
        }
      }
    } catch (error) {
      console.error("❌ Error creating basic subscription:", error)
      return () => {} // Return empty cleanup function
    }
  }

  // Broadcast activity update
  broadcastActivity(hackathonId: string, activityData: any) {
    const channelKey = `hackathon-${hackathonId}`
    const channel = this.channels.get(channelKey)

    if (channel) {
      try {
        console.log("📡 Broadcasting activity:", activityData)
        channel.send({
          type: "broadcast",
          event: "activity_update",
          payload: { ...activityData, hackathon_id: hackathonId, timestamp: Date.now() },
        })
      } catch (error) {
        console.warn("⚠️ Broadcast activity failed:", error)
      }
    }
  }

  // Broadcast team sync
  broadcastTeamSync(hackathonId: string, data: any) {
    const channelKey = `hackathon-${hackathonId}`
    const channel = this.channels.get(channelKey)

    if (channel) {
      try {
        console.log("📡 Broadcasting team sync:", data)
        channel.send({
          type: "broadcast",
          event: "team_sync",
          payload: { ...data, hackathon_id: hackathonId, timestamp: Date.now() },
        })
      } catch (error) {
        console.warn("⚠️ Broadcast team sync failed:", error)
      }
    }
  }

  private notifyListeners(channelKey: string, payload: any) {
    const listeners = this.listeners.get(channelKey)
    if (listeners) {
      listeners.forEach((callback) => {
        try {
          callback(payload)
        } catch (error) {
          console.error("Error in realtime listener:", error)
        }
      })
    }
  }

  private notifyPresenceListeners(channelKey: string, payload: any) {
    const listeners = this.presenceListeners.get(channelKey)
    if (listeners) {
      listeners.forEach((callback) => {
        try {
          callback(payload)
        } catch (error) {
          console.error("Error in presence listener:", error)
        }
      })
    }
  }

  // Cleanup all channels
  cleanup() {
    console.log("🧹 Cleaning up all enhanced realtime channels")
    try {
      presenceService.stopPresenceTracking()
    } catch (error) {
      console.warn("⚠️ Error stopping presence tracking:", error)
    }

    this.channels.forEach((channel, key) => {
      try {
        supabase.removeChannel(channel)
      } catch (error) {
        console.warn(`⚠️ Error removing channel ${key}:`, error)
      }
    })

    this.channels.clear()
    this.listeners.clear()
    this.presenceListeners.clear()
  }
}

export const enhancedRealtimeService = EnhancedRealtimeService.getInstance()
