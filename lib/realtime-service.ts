import { supabase } from "./supabase"

export class RealtimeService {
  private static instance: RealtimeService
  private channels: Map<string, any> = new Map()
  private listeners: Map<string, Set<Function>> = new Map()

  static getInstance(): RealtimeService {
    if (!RealtimeService.instance) {
      RealtimeService.instance = new RealtimeService()
    }
    return RealtimeService.instance
  }

  // Subscribe to team member changes for a specific hackathon
  subscribeToTeamChanges(hackathonId: string, callback: (payload: any) => void): () => void {
    const channelKey = `team-${hackathonId}`

    if (!this.listeners.has(channelKey)) {
      this.listeners.set(channelKey, new Set())
    }

    this.listeners.get(channelKey)!.add(callback)

    // Create channel if it doesn't exist
    if (!this.channels.has(channelKey)) {
      console.log("🔌 Creating new team realtime channel:", channelKey)

      const channel = supabase
        .channel(channelKey, {
          config: {
            broadcast: { self: true },
            presence: { key: hackathonId },
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
            console.log("🔄 REALTIME: Team member change detected:", payload)
            this.notifyListeners(channelKey, payload)
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
            console.log("🔄 REALTIME: Profile updated:", payload.new?.id)
            // Notify team listeners about profile updates
            this.notifyListeners(channelKey, { ...payload, table: "profiles" })
          },
        )
        .on("broadcast", { event: "team_sync" }, (payload) => {
          console.log("📡 BROADCAST: Team sync received:", payload)
          this.notifyListeners(channelKey, payload)
        })

      channel.subscribe((status) => {
        console.log(`📡 Team channel ${channelKey} status:`, status)
        if (status === "SUBSCRIBED") {
          // Broadcast that we're online
          channel.send({
            type: "broadcast",
            event: "team_sync",
            payload: { type: "user_online", hackathon_id: hackathonId },
          })
        }
      })

      this.channels.set(channelKey, channel)
    }

    // Return unsubscribe function
    return () => {
      this.listeners.get(channelKey)?.delete(callback)

      // If no more listeners, cleanup channel
      if (this.listeners.get(channelKey)?.size === 0) {
        const channel = this.channels.get(channelKey)
        if (channel) {
          supabase.removeChannel(channel)
          this.channels.delete(channelKey)
          this.listeners.delete(channelKey)
          console.log("🧹 Cleaned up team channel:", channelKey)
        }
      }
    }
  }

  // Subscribe to task changes for a specific hackathon
  subscribeToTaskChanges(hackathonId: string, callback: (payload: any) => void): () => void {
    const channelKey = `tasks-${hackathonId}`

    if (!this.listeners.has(channelKey)) {
      this.listeners.set(channelKey, new Set())
    }

    this.listeners.get(channelKey)!.add(callback)

    // Create channel if it doesn't exist
    if (!this.channels.has(channelKey)) {
      console.log("🔌 Creating new tasks realtime channel:", channelKey)

      const channel = supabase.channel(channelKey).on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
          filter: `hackathon_id=eq.${hackathonId}`,
        },
        (payload) => {
          console.log("🔄 REALTIME: Task change detected:", payload)
          this.notifyListeners(channelKey, payload)
        },
      )

      channel.subscribe((status) => {
        console.log(`📡 Tasks channel ${channelKey} status:`, status)
      })

      this.channels.set(channelKey, channel)
    }

    // Return unsubscribe function
    return () => {
      this.listeners.get(channelKey)?.delete(callback)

      // If no more listeners, cleanup channel
      if (this.listeners.get(channelKey)?.size === 0) {
        const channel = this.channels.get(channelKey)
        if (channel) {
          supabase.removeChannel(channel)
          this.channels.delete(channelKey)
          this.listeners.delete(channelKey)
          console.log("🧹 Cleaned up tasks channel:", channelKey)
        }
      }
    }
  }

  // Broadcast team sync to all connected users
  broadcastTeamSync(hackathonId: string, data: any) {
    const channelKey = `team-${hackathonId}`
    const channel = this.channels.get(channelKey)

    if (channel) {
      console.log("📡 Broadcasting team sync:", data)
      channel.send({
        type: "broadcast",
        event: "team_sync",
        payload: { ...data, hackathon_id: hackathonId, timestamp: Date.now() },
      })
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

  // Cleanup all channels
  cleanup() {
    console.log("🧹 Cleaning up all realtime channels")
    this.channels.forEach((channel) => {
      supabase.removeChannel(channel)
    })
    this.channels.clear()
    this.listeners.clear()
  }
}

export const realtimeService = RealtimeService.getInstance()
