import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    const { hackathonId, userId } = await request.json()

    if (!hackathonId || !userId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Mark user as inactive
    const { error } = await supabase.rpc("mark_user_inactive", {
      p_user_id: userId,
      p_hackathon_id: hackathonId,
    })

    if (error) {
      console.error("Error marking user inactive:", error)
      return NextResponse.json({ error: "Failed to update presence" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in presence inactive API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
