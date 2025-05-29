import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Validate environment variables
if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing Supabase environment variables")
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: NextRequest) {
  try {
    console.log("🔄 API: Task assignment request received")

    // Parse request body with error handling
    let body
    try {
      body = await request.json()
    } catch (parseError) {
      console.error("❌ Error parsing request body:", parseError)
      return NextResponse.json({ success: false, error: "Invalid JSON in request body" }, { status: 400 })
    }

    const { taskId, assignedTo, assignedBy } = body

    console.log("🔄 API: Assigning task:", { taskId, assignedTo, assignedBy })

    // Validate required fields
    if (!taskId) {
      return NextResponse.json({ success: false, error: "Task ID is required" }, { status: 400 })
    }

    // Get task details with error handling
    const { data: task, error: taskError } = await supabaseAdmin
      .from("tasks")
      .select("id, title, hackathon_id")
      .eq("id", taskId)
      .single()

    if (taskError) {
      console.error("❌ Error fetching task:", taskError)
      return NextResponse.json({ success: false, error: "Task not found" }, { status: 404 })
    }

    if (!task) {
      return NextResponse.json({ success: false, error: "Task not found" }, { status: 404 })
    }

    // If assigning to someone, verify they're a team member
    if (assignedTo) {
      const { data: teamMember, error: memberError } = await supabaseAdmin
        .from("team_members")
        .select("id")
        .eq("hackathon_id", task.hackathon_id)
        .eq("user_id", assignedTo)
        .single()

      if (memberError || !teamMember) {
        console.error("❌ User is not a team member:", memberError)
        return NextResponse.json({ success: false, error: "User is not a team member" }, { status: 400 })
      }
    }

    // Update task assignment (only update assigned_to field)
    const { data: updatedTask, error: updateError } = await supabaseAdmin
      .from("tasks")
      .update({
        assigned_to: assignedTo || null,
      })
      .eq("id", taskId)
      .select(`
        *
      `)
      .single()

    if (updateError) {
      console.error("❌ Error updating task assignment:", updateError)
      return NextResponse.json({ success: false, error: "Failed to assign task" }, { status: 500 })
    }

    // Get assignee profile data separately if task is assigned
    let assigneeData = null
    if (updatedTask.assigned_to) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name, email")
        .eq("id", updatedTask.assigned_to)
        .single()

      assigneeData = profile
    }

    console.log("✅ Task assigned successfully")

    return NextResponse.json({
      success: true,
      task: {
        ...updatedTask,
        assignee: assigneeData,
      },
      message: assignedTo ? "Task assigned successfully" : "Task unassigned successfully",
    })
  } catch (error: any) {
    console.error("❌ API Error assigning task:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

// Handle other HTTP methods
export async function GET() {
  return NextResponse.json({ success: false, error: "Method not allowed" }, { status: 405 })
}
