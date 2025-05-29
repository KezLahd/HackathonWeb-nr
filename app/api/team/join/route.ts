import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: NextRequest) {
  try {
    const { hackathonId, userId, role = "member" } = await request.json()

    console.log("🔄 API: Adding user to team:", { hackathonId, userId, role })

    // Validate required fields
    if (!hackathonId || !userId) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    // Check if hackathon exists
    const { data: hackathon, error: hackathonError } = await supabaseAdmin
      .from("hackathons")
      .select("id, title, team_size, created_by")
      .eq("id", hackathonId)
      .single()

    if (hackathonError || !hackathon) {
      return NextResponse.json({ success: false, error: "Hackathon not found" }, { status: 404 })
    }

    // Check if user is already a team member
    const { data: existingMember } = await supabaseAdmin
      .from("team_members")
      .select("id")
      .eq("hackathon_id", hackathonId)
      .eq("user_id", userId)
      .single()

    if (existingMember) {
      return NextResponse.json({ success: false, error: "User is already a team member" }, { status: 409 })
    }

    // Check team size limit
    const { count: currentTeamSize } = await supabaseAdmin
      .from("team_members")
      .select("*", { count: "exact" })
      .eq("hackathon_id", hackathonId)

    if (currentTeamSize && currentTeamSize >= hackathon.team_size) {
      return NextResponse.json({ success: false, error: "Team is full" }, { status: 409 })
    }

    // Add user to team
    const { data: newMember, error: teamError } = await supabaseAdmin
      .from("team_members")
      .insert({
        hackathon_id: hackathonId,
        user_id: userId,
        role: role,
        joined_at: new Date().toISOString(),
      })
      .select(`
        *,
        profiles:user_id(id, full_name, email)
      `)
      .single()

    if (teamError) {
      console.error("❌ Error adding team member:", teamError)
      return NextResponse.json({ success: false, error: "Failed to join team" }, { status: 500 })
    }

    // Get updated team count
    const { count: newTeamSize } = await supabaseAdmin
      .from("team_members")
      .select("*", { count: "exact" })
      .eq("hackathon_id", hackathonId)

    console.log("✅ User added to team successfully. New team size:", newTeamSize)

    return NextResponse.json({
      success: true,
      member: newMember,
      teamSize: newTeamSize,
      message: `Successfully joined "${hackathon.title}"!`,
    })
  } catch (error: any) {
    console.error("❌ API Error joining team:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
