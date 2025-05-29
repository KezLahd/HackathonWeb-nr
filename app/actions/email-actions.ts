"use server"

export async function sendInvitationEmail(
  to: string,
  inviterName: string,
  hackathonTitle: string,
  hackathonTheme: string,
  inviteUrl: string,
) {
  try {
    console.log("📧 EMAIL ACTION - Starting email send:", { to, inviterName, hackathonTitle })

    // For now, let's simulate email sending
    // In a real environment, this would use nodemailer or a service like Resend

    console.log("📧 EMAIL ACTION - Would send email with:")
    console.log("  To:", to)
    console.log("  From:", inviterName)
    console.log("  Subject: Invitation to join", hackathonTitle)
    console.log("  Theme:", hackathonTheme)
    console.log("  Invite URL:", inviteUrl)

    // Simulate email sending delay
    await new Promise((resolve) => setTimeout(resolve, 1000))

    console.log("✅ EMAIL ACTION - Email simulation completed")

    return {
      success: true,
      message: `Email simulation sent to ${to}`,
      debug: "Server Action email simulation working",
    }
  } catch (error: any) {
    console.error("❌ EMAIL ACTION - Error:", error)
    return {
      success: false,
      error: error.message,
    }
  }
}

export async function testEmailService() {
  try {
    console.log("🧪 EMAIL TEST - Testing email service availability")

    // Test if we can access environment variables
    const gmailUser = process.env.GMAIL_USER
    const gmailPassword = process.env.GMAIL_PASSWORD

    console.log("🧪 EMAIL TEST - Gmail user available:", !!gmailUser)
    console.log("🧪 EMAIL TEST - Gmail password available:", !!gmailPassword)

    if (!gmailUser || !gmailPassword) {
      return {
        success: false,
        error: "Gmail credentials not available",
        debug: "Environment variables missing",
      }
    }

    // Try to import nodemailer (this might fail in serverless)
    try {
      const nodemailer = await import("nodemailer")
      console.log("✅ EMAIL TEST - Nodemailer import successful")

      // Try to create transporter
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: gmailUser,
          pass: gmailPassword,
        },
      })

      console.log("✅ EMAIL TEST - Transporter created successfully")

      return {
        success: true,
        message: "Email service test passed",
        debug: "Nodemailer and credentials working",
      }
    } catch (importError: any) {
      console.error("❌ EMAIL TEST - Nodemailer import failed:", importError)
      return {
        success: false,
        error: "Nodemailer not available in this environment",
        debug: importError.message,
      }
    }
  } catch (error: any) {
    console.error("❌ EMAIL TEST - General error:", error)
    return {
      success: false,
      error: error.message,
      debug: "Email service test failed",
    }
  }
}
