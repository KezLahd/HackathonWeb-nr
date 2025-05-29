import { createClient } from "@/utils/supabase/server"

export async function signUp(formData: FormData) {
  const supabase = createClient()

  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const fullName = formData.get("fullName") as string

  console.log("🚀 Starting signup process for:", email)

  try {
    // Sign up the user with Supabase
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      },
    })

    if (error) {
      console.error("❌ Supabase signup error:", error)
      return { success: false, error: error.message }
    }

    console.log("✅ Supabase signup successful:", data.user?.id)

    // Send custom confirmation email
    if (data.user && !data.user.email_confirmed_at) {
      console.log("📧 Sending custom confirmation email...")

      // Generate confirmation URL (you might want to create a custom token system)
      const confirmationUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm?email=${encodeURIComponent(email)}`

      // Send the email using our custom service
      const emailResult = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/send-confirmation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: email,
          confirmationUrl,
          fullName,
        }),
      })

      const emailResponse = await emailResult.json()

      if (emailResponse.success) {
        console.log("✅ Custom confirmation email sent successfully")
      } else {
        console.error("❌ Failed to send custom email:", emailResponse.error)
      }
    }

    return {
      success: true,
      message: "Account created! Please check your email to confirm your account.",
      user: data.user,
    }
  } catch (error: any) {
    console.error("❌ Signup error:", error)
    return { success: false, error: "Failed to create account" }
  }
}
