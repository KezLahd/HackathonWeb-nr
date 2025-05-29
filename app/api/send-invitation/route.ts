import { type NextRequest, NextResponse } from "next/server"
import nodemailer from "nodemailer"

// Email configuration
const EMAIL_CONFIG = {
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: "hackathon@mjsons.net",
    pass: process.env.GMAIL_PASSWORD,
  },
}

export async function POST(request: NextRequest) {
  try {
    console.log("📧 EMAIL API - Received invitation request")

    // Check if GMAIL_PASSWORD is configured
    if (!process.env.GMAIL_PASSWORD) {
      console.error("❌ EMAIL API - GMAIL_PASSWORD environment variable not set")
      return NextResponse.json({ success: false, error: "Email service not configured" }, { status: 500 })
    }

    let body
    try {
      body = await request.json()
    } catch (parseError) {
      console.error("❌ EMAIL API - Failed to parse request body:", parseError)
      return NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 })
    }

    const { to, inviterName, hackathonTitle, hackathonTheme, inviteUrl } = body

    console.log("📧 EMAIL API - Parsed request body:", { to, inviterName, hackathonTitle, hackathonTheme, inviteUrl })

    // Validate required fields
    if (!to || !inviterName || !hackathonTitle || !inviteUrl) {
      console.error("❌ EMAIL API - Missing required fields:", { to, inviterName, hackathonTitle, inviteUrl })
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    console.log("📧 EMAIL API - Creating transporter...")

    let transporter
    try {
      transporter = nodemailer.createTransport(EMAIL_CONFIG)
    } catch (transportError) {
      console.error("❌ EMAIL API - Failed to create transporter:", transportError)
      return NextResponse.json({ success: false, error: "Failed to create email transporter" }, { status: 500 })
    }

    console.log("📧 EMAIL API - Preparing email options...")
    const mailOptions = {
      from: {
        name: "Hackathon Planner",
        address: "hackathon@mjsons.net",
      },
      to,
      subject: `You're Invited to ${hackathonTitle} – Hackathon Planner`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8" />
            <title>You're Invited – Hackathon Planner</title>
            <style>
              body {
                font-family: 'Segoe UI', Roboto, sans-serif;
                background-color: #f4f7fa;
                margin: 0;
                padding: 0;
                color: #333333;
              }
              .container {
                max-width: 600px;
                margin: auto;
                background-color: #ffffff;
                border-radius: 10px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
                overflow: hidden;
              }
              .header {
                background-color: #0b0c10;
                color: #ffffff;
                padding: 30px 20px;
                text-align: center;
              }
              .header h1 {
                margin: 0;
                font-size: 26px;
                letter-spacing: 1px;
              }
              .header p {
                margin: 5px 0 0;
                font-size: 14px;
                color: #cccccc;
              }
              .content {
                padding: 30px 25px;
                font-size: 16px;
                line-height: 1.6;
              }
              .highlight {
                color: #0062cf;
                font-weight: bold;
              }
              .button-container {
                text-align: center;
                margin: 40px 0 20px;
              }
              .cta-button {
                background-color: #0062cf;
                color: #ffffff;
                padding: 14px 28px;
                text-decoration: none;
                font-weight: bold;
                font-size: 16px;
                border-radius: 8px;
                display: inline-block;
              }
              .footer {
                text-align: center;
                padding: 20px;
                font-size: 13px;
                color: #999999;
              }
              .hackathon-details {
                background-color: #f8f9fa;
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🚀 You've Been Invited to a Hackathon</h1>
                <p>powered by Hackathon Planner</p>
              </div>

              <div class="content">
                <p><strong>Hello there,</strong></p>

                <p>
                  <strong>${inviterName}</strong> has invited you to join an upcoming hackathon. They think you're the perfect fit to help build something incredible.
                </p>

                <div class="hackathon-details">
                  <h3 style="margin-top: 0; color: #0062cf;">${hackathonTitle}</h3>
                  <p style="margin-bottom: 0;"><strong>Theme:</strong> ${hackathonTheme || "General"}</p>
                </div>

                <p>
                  Hackathons are all about <span class="highlight">speed, innovation, and collaboration</span> — and now it's your chance to shine.
                </p>

                <p>
                  Click below to view your shared task board, see the countdown, and start planning your sprint.
                </p>

                <div class="button-container">
                  <a href="${inviteUrl}" class="cta-button">🔗 View Your Hackathon</a>
                </div>

                <p style="text-align: center; margin-top: 20px;">
                  Let's turn ideas into reality — fast.
                </p>
              </div>

              <div class="footer">
                Hackathon Planner by MJ Sons Holdings<br />
                © 2025 All rights reserved
              </div>
            </div>
          </body>
        </html>
      `,
    }

    console.log("📧 EMAIL API - Sending email...")

    let result
    try {
      result = await transporter.sendMail(mailOptions)
      console.log("✅ EMAIL API - Email sent successfully:", result.messageId)
    } catch (sendError) {
      console.error("❌ EMAIL API - Failed to send email:", sendError)
      return NextResponse.json({ success: false, error: `Failed to send email: ${sendError.message}` }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      message: `Email sent successfully to ${to}`,
    })
  } catch (error: any) {
    console.error("❌ EMAIL API - Unexpected error:", error)
    return NextResponse.json({ success: false, error: `Unexpected error: ${error.message}` }, { status: 500 })
  }
}
