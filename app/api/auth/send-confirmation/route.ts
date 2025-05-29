import { type NextRequest, NextResponse } from "next/server"
import { sendConfirmationEmail } from "@/lib/email-service"

export async function POST(request: NextRequest) {
  try {
    const { to, confirmationUrl, fullName } = await request.json()

    console.log("📧 Sending confirmation email to:", to)

    const result = await sendConfirmationEmail(to, confirmationUrl, fullName)

    if (result.success) {
      return NextResponse.json({
        success: true,
        messageId: result.messageId,
        message: "Confirmation email sent successfully",
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 500 },
      )
    }
  } catch (error: any) {
    console.error("❌ Email API error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to send email",
      },
      { status: 500 },
    )
  }
}
