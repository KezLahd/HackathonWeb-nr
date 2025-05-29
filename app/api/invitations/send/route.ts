import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { EmailService } from "@/lib/email-service"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log("📧 EMAIL API - Received invitation request:", body)

    // Extract fields with multiple possible names
    const inviteeEmail = body.to || body.inviteeEmail || body.email
    const inviterName = body.inviterName || body.inviter_name || body.from_name
    const hackathonTitle = body.hackathonTitle || body.hackathon_title || body.title
    const hackathonTheme = body.hackathonTheme || body.hackathon_theme || body.theme
    const inviteUrl = body.inviteUrl || body.invite_url || body.url
    const hackathonId = body.hackathonId || body.hackathon_id
    const inviterEmail = body.inviterEmail || body.inviter_email

    console.log("📧 EMAIL API - Extracted fields:", {
      inviteeEmail,
      inviterName,
      hackathonTitle,
      hackathonTheme,
      inviteUrl,
      hackathonId,
      inviterEmail,
    })

    // Validate essential fields for email sending
    if (!inviteeEmail || !inviterName || !hackathonTitle) {
      console.error("❌ EMAIL API - Missing essential fields for email")
      return NextResponse.json(
        {
          success: false,
          error: "Missing essential fields for email sending",
          details: {
            missing: {
              inviteeEmail: !inviteeEmail,
              inviterName: !inviterName,
              hackathonTitle: !hackathonTitle,
            },
            received: Object.keys(body),
          },
        },
        { status: 400 },
      )
    }

    // Generate invite code
    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase()

    // Create invitation record if we have hackathon ID
    if (hackathonId && inviterEmail) {
      try {
        const { data: invitation, error: dbError } = await supabase
          .from("hackathon_invitations")
          .insert({
            hackathon_id: hackathonId,
            inviter_email: inviterEmail,
            invitee_email: inviteeEmail,
            invite_code: inviteCode,
            status: "pending",
          })
          .select()
          .single()

        if (dbError) {
          console.error("❌ EMAIL API - Database error:", dbError)
        } else {
          console.log("✅ EMAIL API - Invitation record created")
        }
      } catch (dbError) {
        console.error("❌ EMAIL API - Database operation failed:", dbError)
      }
    }

    // Send email invitation
    try {
      console.log("📧 EMAIL API - Attempting to send email...")

      const result = await EmailService.sendHackathonInvitation(
        inviteeEmail,
        inviterName,
        hackathonTitle,
        hackathonTheme || "Join us for an exciting hackathon!",
        inviteUrl || `${process.env.NEXT_PUBLIC_SITE_URL}/invite/${inviteCode}`,
      )

      if (result.success) {
        console.log("✅ EMAIL API - Email sent successfully to:", inviteeEmail)
        return NextResponse.json({
          success: true,
          message: "Invitation email sent successfully",
          inviteCode,
          emailSent: true,
        })
      } else {
        console.error("❌ EMAIL API - Email sending failed:", result.error)
        return NextResponse.json(
          {
            success: false,
            error: "Failed to send email",
            details: result.error,
          },
          { status: 500 },
        )
      }
    } catch (emailError) {
      console.error("❌ EMAIL API - Email sending exception:", emailError)
      return NextResponse.json(
        {
          success: false,
          error: "Email service error",
          details: emailError.message,
        },
        { status: 500 },
      )
    }
  } catch (error: any) {
    console.error("❌ EMAIL API - General error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
