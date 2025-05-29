import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("📧 EMAIL API - Received request")

    // Parse request body
    const body = await request.json()
    const { to, inviterName, hackathonTitle, hackathonTheme, inviteUrl } = body

    console.log("📧 EMAIL API - Request data:", { to, inviterName, hackathonTitle })

    // For now, let's just return success to test the route
    // We'll add the actual email sending once we confirm the route works
    return NextResponse.json({
      success: true,
      message: `Email would be sent to ${to}`,
      debug: "Route is working correctly",
    })
  } catch (error: any) {
    console.error("❌ EMAIL API - Error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ message: "Email API is running" })
}
