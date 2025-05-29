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

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransport(EMAIL_CONFIG)
}

// Send confirmation email with your custom template
// Update the sendConfirmationEmail function to use the correct domain
export async function sendConfirmationEmail(to: string, confirmationUrl: string, fullName: string) {
  try {
    const transporter = createTransporter()

    // Replace localhost with the correct domain
    const correctedUrl = confirmationUrl.replace(/localhost:\d+/, "hackathon.mjsons.net")

    const mailOptions = {
      from: {
        name: "Hackathon Planner",
        address: "hackathon@mjsons.net",
      },
      to,
      subject: "You're Invited – Hackathon Planner",
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
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🚀 Welcome to Hackathon Planner</h1>
                <p>powered by MJ Sons Holdings</p>
              </div>

              <div class="content">
                <p><strong>Hello ${fullName},</strong></p>

                <p>
                  Welcome to Hackathon Planner! You're now part of an exclusive early access group ready to build something incredible.
                </p>

                <p>
                  To complete your account setup, please confirm your email address by clicking the button below.
                </p>

                <p>
                  Once confirmed, you'll have access to <span class="highlight">AI-powered task management, real-time collaboration, and smart insights</span> — everything you need to turn ideas into reality.
                </p>

                <div class="button-container">
                  <a href="${correctedUrl}" class="cta-button">🔗 Confirm My Account</a>
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

    const result = await transporter.sendMail(mailOptions)
    console.log("✅ Confirmation email sent:", result.messageId)
    return { success: true, messageId: result.messageId }
  } catch (error) {
    console.error("❌ Email sending failed:", error)
    return { success: false, error: error.message }
  }
}

// Send password reset email
export async function sendPasswordResetEmail(to: string, resetUrl: string, fullName: string) {
  try {
    const transporter = createTransporter()

    const mailOptions = {
      from: {
        name: "Hackathon Planner",
        address: "hackathon@mjsons.net",
      },
      to,
      subject: "Reset Your Hackathon Planner Password",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Password</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #dc3545; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Password Reset Request</h1>
            </div>
            <div class="content">
              <h2>Hi ${fullName}!</h2>
              <p>We received a request to reset your Hackathon Planner password.</p>
              
              <div style="text-align: center;">
                <a href="${resetUrl}" class="button">Reset My Password</a>
              </div>
              
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; background: #e9ecef; padding: 10px; border-radius: 5px;">
                ${resetUrl}
              </p>
              
              <div class="warning">
                <strong>⚠️ Security Notice:</strong>
                <ul>
                  <li>This link will expire in 1 hour</li>
                  <li>If you didn't request this reset, please ignore this email</li>
                  <li>Your password won't change until you click the link above</li>
                </ul>
              </div>
            </div>
            <div class="footer">
              <p>© 2024 Hackathon Planner | Powered by Innovation</p>
            </div>
          </div>
        </body>
        </html>
      `,
    }

    const result = await transporter.sendMail(mailOptions)
    console.log("✅ Password reset email sent:", result.messageId)
    return { success: true, messageId: result.messageId }
  } catch (error) {
    console.error("❌ Email sending failed:", error)
    return { success: false, error: error.message }
  }
}

// Send hackathon invitation email
export async function sendHackathonInvitationEmail(
  to: string,
  inviterName: string,
  hackathonTitle: string,
  hackathonTheme: string,
  inviteUrl: string,
) {
  try {
    console.log("📧 EMAIL SERVICE - Creating transporter...")
    const transporter = createTransporter()

    console.log("📧 EMAIL SERVICE - Preparing email options...")
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
                  <p style="margin-bottom: 0;"><strong>Theme:</strong> ${hackathonTheme}</p>
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

    console.log("📧 EMAIL SERVICE - Sending email...")
    const result = await transporter.sendMail(mailOptions)
    console.log("✅ Hackathon invitation email sent:", result.messageId)
    return { success: true, messageId: result.messageId }
  } catch (error) {
    console.error("❌ Hackathon invitation email failed:", error)
    return { success: false, error: error.message }
  }
}

// EmailService class for consistent API
export class EmailService {
  static async sendConfirmation(to: string, confirmationUrl: string, fullName: string) {
    return await sendConfirmationEmail(to, confirmationUrl, fullName)
  }

  static async sendPasswordReset(to: string, resetUrl: string, fullName: string) {
    return await sendPasswordResetEmail(to, resetUrl, fullName)
  }

  static async sendHackathonInvitation(
    to: string,
    inviterName: string,
    hackathonTitle: string,
    hackathonTheme: string,
    inviteUrl: string,
  ) {
    return await sendHackathonInvitationEmail(to, inviterName, hackathonTitle, hackathonTheme, inviteUrl)
  }
}
