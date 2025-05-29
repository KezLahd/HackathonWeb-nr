"use server"

import { EmailService } from "@/lib/email-service"

export async function sendInvitationEmail(
  to: string,
  inviterName: string,
  hackathonTitle: string,
  hackathonTheme: string,
  inviteUrl: string,
) {
  try {
    console.log("📧 EMAIL ACTION - Starting email send:", { to, inviterName, hackathonTitle })

    // Use the EmailService to actually send the email
    const result = await EmailService.sendHackathonInvitation(
      to,
      inviterName,
      hackathonTitle,
      hackathonTheme,
      inviteUrl
    )

    if (result.success) {
      console.log("✅ EMAIL ACTION - Email sent successfully")
      return {
        success: true,
        message: `Email sent to ${to}`,
        messageId: result.messageId
      }
    } else {
      console.error("❌ EMAIL ACTION - Failed to send email:", result.error)
      return {
        success: false,
        error: result.error
      }
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

    console.log("🧪 EMAIL TEST - Gmail user:", gmailUser)
    console.log("🧪 EMAIL TEST - Gmail password length:", gmailPassword?.length)
    console.log("🧪 EMAIL TEST - Gmail password first 4 chars:", gmailPassword?.substring(0, 4))

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

      // Use the same transporter creation as the main email service
      const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: {
          user: gmailUser,
          pass: gmailPassword,
        },
      })

      // Verify the connection
      await transporter.verify()
      console.log("✅ EMAIL TEST - Transporter verified successfully")

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
