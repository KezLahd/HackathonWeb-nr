import { supabase } from "./supabase"

export class PresenceService {
  private static instance: PresenceService
  private presenceInterval: NodeJS.Timeout | null = null
  private currentHackathonId: string | null = null
  private currentUserId: string | null = null

  static getInstance(): PresenceService {
    if (!PresenceService.instance) {
      PresenceService.instance = new PresenceService()
    }
    return PresenceService.instance
  }

  // Start tracking presence for a hackathon
  async startPresenceTracking(hackathonId: string, userId: string) {
    console.log("👁️ Starting presence tracking for:", hackathonId, userId)

    this.currentHackathonId = hackathonId
    this.currentUserId = userId

    // Initial presence update
    await this.updatePresence("viewing")

    // Set up periodic presence updates (every 30 seconds)
    if (this.presenceInterval) {
      clearInterval(this.presenceInterval)
    }

    this.presenceInterval = setInterval(async () => {
      if (this.currentHackathonId && this.currentUserId) {
        await this.updatePresence("viewing")
      }
    }, 30000)

    // Update presence on page visibility change
    document.addEventListener("visibilitychange", this.handleVisibilityChange.bind(this))

    // Update presence before page unload
    window.addEventListener("beforeunload", this.handleBeforeUnload.bind(this))
  }

  // Stop tracking presence
  async stopPresenceTracking() {
    console.log("👁️ Stopping presence tracking")

    if (this.presenceInterval) {
      clearInterval(this.presenceInterval)
      this.presenceInterval = null
    }

    if (this.currentHackathonId && this.currentUserId) {
      await this.markInactive()
    }

    document.removeEventListener("visibilitychange", this.handleVisibilityChange.bind(this))
    window.removeEventListener("beforeunload", this.handleBeforeUnload.bind(this))

    this.currentHackathonId = null
    this.currentUserId = null
  }

  // Update user presence
  private async updatePresence(activityType = "viewing") {
    if (!this.currentHackathonId || !this.currentUserId) return

    try {
      const { error } = await supabase.rpc("update_user_presence", {
        p_user_id: this.currentUserId,
        p_hackathon_id: this.currentHackathonId,
        p_activity_type: activityType,
      })

      if (error) {
        console.error("Error updating presence:", error)
      }
    } catch (error) {
      console.error("Error updating presence:", error)
    }
  }

  // Mark user as inactive
  private async markInactive() {
    if (!this.currentHackathonId || !this.currentUserId) return

    try {
      const { error } = await supabase.rpc("mark_user_inactive", {
        p_user_id: this.currentUserId,
        p_hackathon_id: this.currentHackathonId,
      })

      if (error) {
        console.error("Error marking inactive:", error)
      }
    } catch (error) {
      console.error("Error marking inactive:", error)
    }
  }

  // Handle visibility change
  private handleVisibilityChange() {
    if (document.hidden) {
      this.markInactive()
    } else {
      this.updatePresence("viewing")
    }
  }

  // Handle before unload
  private handleBeforeUnload() {
    // Use sendBeacon for reliable delivery
    if (this.currentHackathonId && this.currentUserId) {
      navigator.sendBeacon(
        "/api/presence/inactive",
        JSON.stringify({
          hackathonId: this.currentHackathonId,
          userId: this.currentUserId,
        }),
      )
    }
  }

  // Get active users for a hackathon
  async getActiveUsers(hackathonId: string) {
    try {
      const { data, error } = await supabase
        .from("user_presence")
        .select(`
          user_id,
          activity_type,
          last_seen,
          profiles:user_id(id, full_name, email)
        `)
        .eq("hackathon_id", hackathonId)
        .eq("is_active", true)
        .gte("last_seen", new Date(Date.now() - 5 * 60 * 1000).toISOString()) // Last 5 minutes

      if (error) throw error
      return data || []
    } catch (error) {
      console.error("Error getting active users:", error, JSON.stringify(error));
      return []
    }
  }

  // Update activity type (typing, editing, etc.)
  async updateActivity(activityType: string) {
    await this.updatePresence(activityType)
  }
}

export const presenceService = PresenceService.getInstance()
