import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: NextRequest) {
  try {
    console.log("🔄 API: Task completion request received")

    // Parse request body with error handling
    let body
    try {
      body = await request.json()
    } catch (parseError) {
      console.error("❌ Error parsing request body:", parseError)
      return NextResponse.json({ success: false, error: "Invalid JSON in request body" }, { status: 400 })
    }

    const { taskId, completed, completedBy } = body

    console.log("🔄 API: Updating task completion:", { taskId, completed, completedBy })

    // Validate required fields
    if (!taskId || typeof completed !== "boolean") {
      return NextResponse.json({ success: false, error: "Task ID and completion status are required" }, { status: 400 })
    }

    // Get task details
    const { data: task, error: taskError } = await supabaseAdmin
      .from("tasks")
      .select("id, title, hackathon_id")
      .eq("id", taskId)
      .single()

    if (taskError || !task) {
      console.error("❌ Error fetching task:", taskError)
      return NextResponse.json({ success: false, error: "Task not found" }, { status: 404 })
    }

    // Update task completion (only update completion fields)
    const updateData: any = {
      completed: completed,
    }

    // Set completed_at timestamp if marking as complete, null if reopening
    if (completed) {
      updateData.completed_at = new Date().toISOString()
    } else {
      updateData.completed_at = null
    }

    const { data: updatedTask, error: updateError } = await supabaseAdmin
      .from("tasks")
      .update(updateData)
      .eq("id", taskId)
      .select(`
        *
      `)
      .single()

    if (updateError) {
      console.error("❌ Error updating task completion:", updateError)
      return NextResponse.json({ success: false, error: "Failed to update task completion" }, { status: 500 })
    }

    // Get assignee profile data if task is assigned
    let assigneeData = null
    if (updatedTask.assigned_to) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name, email")
        .eq("id", updatedTask.assigned_to)
        .single()

      assigneeData = profile
    }

    console.log("✅ Task completion updated successfully")

    return NextResponse.json({
      success: true,
      task: {
        ...updatedTask,
        assignee: assigneeData,
      },
      message: completed ? "Task marked as complete" : "Task reopened",
    })
  } catch (error: any) {
    console.error("❌ API Error updating task completion:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

// Handle other HTTP methods
export async function GET() {
  return NextResponse.json({ success: false, error: "Method not allowed" }, { status: 405 })
}
