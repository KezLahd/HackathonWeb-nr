// API client for making HTTP requests to our backend
export class ApiClient {
  private static baseUrl = "/api"

  // Enhanced error handling for API requests
  private static async handleResponse(response: Response) {
    const contentType = response.headers.get("content-type")

    // Check if response is JSON
    if (!contentType || !contentType.includes("application/json")) {
      const text = await response.text()
      console.error("❌ Non-JSON response received:", text.substring(0, 200))
      throw new Error(`Server returned non-JSON response: ${response.status}`)
    }

    const data = await response.json()

    if (!response.ok) {
      console.error("❌ API Error:", data)
      throw new Error(data.error || `HTTP ${response.status}`)
    }

    return data
  }

  // Team management
  static async joinTeam(hackathonId: string, userId: string, role = "member") {
    try {
      console.log("🔄 API: Joining team:", { hackathonId, userId, role })

      const response = await fetch(`${this.baseUrl}/team/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ hackathonId, userId, role }),
      })

      return await this.handleResponse(response)
    } catch (error) {
      console.error("❌ Error joining team:", error)
      throw error
    }
  }

  static async getTeamMembers(hackathonId: string) {
    try {
      console.log("🔄 API: Getting team members:", hackathonId)

      const response = await fetch(`${this.baseUrl}/team/${hackathonId}`, {
        headers: { Accept: "application/json" },
      })

      return await this.handleResponse(response)
    } catch (error) {
      console.error("❌ Error getting team members:", error)
      throw error
    }
  }

  // Task management with enhanced error handling
  static async assignTask(taskId: string, assignedTo: string | null, assignedBy: string) {
    try {
      console.log("🔄 API: Assigning task:", { taskId, assignedTo, assignedBy })

      const response = await fetch(`${this.baseUrl}/tasks/assign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ taskId, assignedTo, assignedBy }),
      })

      return await this.handleResponse(response)
    } catch (error) {
      console.error("❌ Error assigning task:", error)
      throw error
    }
  }

  static async completeTask(taskId: string, completed: boolean, completedBy: string) {
    try {
      console.log("🔄 API: Completing task:", { taskId, completed, completedBy })

      const response = await fetch(`${this.baseUrl}/tasks/complete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ taskId, completed, completedBy }),
      })

      return await this.handleResponse(response)
    } catch (error) {
      console.error("❌ Error completing task:", error)
      throw error
    }
  }

  static async getTasks(hackathonId: string) {
    try {
      console.log("🔄 API: Getting tasks:", hackathonId)

      const response = await fetch(`${this.baseUrl}/tasks/${hackathonId}`, {
        headers: { Accept: "application/json" },
      })

      return await this.handleResponse(response)
    } catch (error) {
      console.error("❌ Error getting tasks:", error)
      throw error
    }
  }
}
