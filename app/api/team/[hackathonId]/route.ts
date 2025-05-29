import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: NextRequest, { params }: { params: { hackathonId: string } }) {
  try {
    const { hackathonId } = params

    console.log("🔄 API: Getting team members for hackathon:", hackathonId)

    // Get team members with full profile data using our database function
    const { data: teamMembers, error } = await supabaseAdmin.rpc("get_team_members_with_profiles", {
      hackathon_uuid: hackathonId,
    })

    if (error) {
      console.error("❌ Error fetching team members:", error)
      return NextResponse.json({ success: false, error: "Failed to fetch team members" }, { status: 500 })
    }

    // Transform data to match frontend interface
    const formattedMembers = teamMembers.map((member: any) => ({
      id: member.id,
      user_id: member.user_id,
      role: member.role,
      joined_at: member.joined_at,
      profiles: {
        id: member.user_id,
        full_name: member.full_name,
        email: member.email,
      },
    }))

    console.log("✅ Team members fetched:", formattedMembers.length)

    return NextResponse.json({
      success: true,
      members: formattedMembers,
      count: formattedMembers.length,
    })
  } catch (error: any) {
    console.error("❌ API Error fetching team:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
