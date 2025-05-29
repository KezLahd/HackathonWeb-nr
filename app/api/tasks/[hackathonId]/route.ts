import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: NextRequest, { params }: { params: { hackathonId: string } }) {
  try {
    const { hackathonId } = params

    console.log("🔄 API: Getting tasks for hackathon:", hackathonId)

    // Get tasks with assignee data using our database function
    const { data: tasks, error } = await supabaseAdmin.rpc("get_tasks_with_assignees", {
      hackathon_uuid: hackathonId,
    })

    if (error) {
      console.error("❌ Error fetching tasks:", error)
      return NextResponse.json({ success: false, error: "Failed to fetch tasks" }, { status: 500 })
    }

    // Transform data to match frontend interface
    const formattedTasks = tasks.map((task: any) => ({
      id: task.id,
      title: task.title,
      description: task.description,
      completed: task.completed,
      priority: task.priority,
      estimated_hours: task.estimated_hours,
      assigned_to: task.assigned_to,
      completed_at: task.completed_at,
      created_at: task.created_at,
      assignee: task.assigned_to
        ? {
            id: task.assigned_to,
            full_name: task.assignee_name,
            email: task.assignee_email,
          }
        : null,
    }))

    console.log("✅ Tasks fetched:", formattedTasks.length)

    return NextResponse.json({
      success: true,
      tasks: formattedTasks,
      count: formattedTasks.length,
    })
  } catch (error: any) {
    console.error("❌ API Error fetching tasks:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
