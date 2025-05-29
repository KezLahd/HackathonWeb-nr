"use server"

import { supabase } from "@/lib/supabase"
import { sendInvitationEmail, testEmailService } from "./email-actions"

// Generate a random token for invitations
function generateInvitationToken(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789"
  let result = ""
  for (let i = 0; i < 20; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export async function sendHackathonInvitation(
  hackathonId: string,
  inviterEmail: string,
  inviterName: string,
  inviteeEmail: string,
  hackathonTitle: string,
  hackathonTheme?: string,
) {
  try {
    console.log("🚀 INVITATION ACTION - Starting invitation process:", {
      hackathonId,
      inviterEmail,
      inviterName,
      inviteeEmail,
      hackathonTitle,
      hackathonTheme,
    })

    // Validate required fields
    if (!hackathonId || !inviterEmail || !inviterName || !inviteeEmail || !hackathonTitle) {
      throw new Error("Missing required parameters")
    }

    // Get inviter's user ID
    const { data: inviterProfile } = await supabase.from("profiles").select("id").eq("email", inviterEmail).single()

    if (!inviterProfile) {
      console.error("❌ Inviter profile not found for email:", inviterEmail)
      // Continue anyway, we'll use null for inviter_id
    }

    // Generate invitation token
    const invitationToken = generateInvitationToken()
    const inviteUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "https://hackathon.mjsons.net"}/shared?hackathon=${hackathonId}`

    console.log("✅ INVITATION ACTION - Creating database record...")

    // Create invitation record in database with correct column names
    const { data: invitation, error: dbError } = await supabase
      .from("invitations")
      .insert({
        hackathon_id: hackathonId,
        inviter_id: inviterProfile?.id || null,
        email: inviteeEmail,
        status: "pending",
        token: invitationToken,
        invited_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (dbError) {
      console.error("❌ INVITATION ACTION - Database error:", dbError)
      return {
        success: false,
        error: "Failed to create invitation record",
        message: "Database error occurred",
      }
    }

    console.log("✅ INVITATION ACTION - Database record created, testing email service...")

    // Test email service first
    const emailTest = await testEmailService()
    console.log("🧪 INVITATION ACTION - Email service test result:", emailTest)

    // Try to send email using Server Action
    try {
      console.log("📧 INVITATION ACTION - Attempting to send email via Server Action...")

      const emailResult = await sendInvitationEmail(
        inviteeEmail,
        inviterName,
        hackathonTitle,
        hackathonTheme || "General",
        inviteUrl,
      )

      console.log("📧 INVITATION ACTION - Email Server Action result:", emailResult)

      if (emailResult.success) {
        return {
          success: true,
          message: `Invitation sent successfully to ${inviteeEmail}! (${emailResult.debug})`,
          invitation: invitation,
        }
      } else {
        return {
          success: true,
          message: `Invitation recorded for ${inviteeEmail}! (Email service issue: ${emailResult.error})`,
          invitation: invitation,
        }
      }
    } catch (emailError: any) {
      console.error("❌ INVITATION ACTION - Email Server Action error:", emailError)

      return {
        success: true,
        message: `Invitation recorded for ${inviteeEmail}! (Email Server Action error: ${emailError.message})`,
        invitation: invitation,
      }
    }
  } catch (error: any) {
    console.error("❌ INVITATION ACTION - General error:", error)
    return {
      success: false,
      error: error.message,
      message: "Failed to send invitation",
    }
  }
}

export async function getPreviousCollaborators(userEmail: string) {
  try {
    // Get user profile
    const { data: userProfile } = await supabase.from("profiles").select("id").eq("email", userEmail).single()

    if (!userProfile) {
      return { success: false, error: "User not found" }
    }

    // Get all hackathons where the user was a team member
    const { data: userHackathons, error: hackathonError } = await supabase
      .from("team_members")
      .select("hackathon_id")
      .eq("user_id", userProfile.id)

    if (hackathonError) {
      console.error("Error fetching user hackathons:", hackathonError)
      return { success: false, error: "Failed to fetch collaboration history" }
    }

    if (!userHackathons || userHackathons.length === 0) {
      return { success: true, collaborators: [] }
    }

    const hackathonIds = userHackathons.map((h) => h.hackathon_id)

    // Get all team members from those hackathons (excluding the current user)
    const { data: collaboratorData, error: collaboratorError } = await supabase
      .from("team_members")
      .select(`
        user_id,
        hackathon_id,
        joined_at,
        profiles:user_id(email, full_name)
      `)
      .in("hackathon_id", hackathonIds)
      .neq("user_id", userProfile.id)

    if (collaboratorError) {
      console.error("Error fetching collaborators:", collaboratorError)
      return { success: false, error: "Failed to fetch collaborators" }
    }

    // Process collaborators to get unique users with collaboration stats
    const collaboratorMap = new Map()

    collaboratorData?.forEach((member) => {
      if (member.profiles?.email) {
        const email = member.profiles.email
        if (collaboratorMap.has(email)) {
          const existing = collaboratorMap.get(email)
          existing.hackathon_count += 1
          if (new Date(member.joined_at) > new Date(existing.last_collaboration)) {
            existing.last_collaboration = member.joined_at
          }
        } else {
          collaboratorMap.set(email, {
            email: member.profiles.email,
            full_name: member.profiles.full_name,
            hackathon_count: 1,
            last_collaboration: member.joined_at,
          })
        }
      }
    })

    // Convert map to array and sort by collaboration count and recency
    const collaborators = Array.from(collaboratorMap.values()).sort((a, b) => {
      // First sort by number of collaborations (descending)
      if (b.hackathon_count !== a.hackathon_count) {
        return b.hackathon_count - a.hackathon_count
      }
      // Then by recency (most recent first)
      return new Date(b.last_collaboration).getTime() - new Date(a.last_collaboration).getTime()
    })

    return { success: true, collaborators }
  } catch (error: any) {
    console.error("Error getting previous collaborators:", error)
    return { success: false, error: "Failed to get previous collaborators" }
  }
}

function generateInviteCode(): string {
  // Generate a 6-character invite code (letters and numbers)
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  let result = ""
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export async function createInviteCode(hackathonId: string, creatorId: string) {
  try {
    // Check if user is the creator of this hackathon
    const { data: hackathon } = await supabase
      .from("hackathons")
      .select("created_by, title, theme")
      .eq("id", hackathonId)
      .eq("created_by", creatorId)
      .single()

    if (!hackathon) {
      return { success: false, error: "Hackathon not found or you don't have permission" }
    }

    // Generate unique invite code
    let inviteCode = generateInviteCode()
    let attempts = 0

    // Ensure the code is unique
    while (attempts < 10) {
      const { data: existing } = await supabase.from("invite_codes").select("id").eq("code", inviteCode).single()

      if (!existing) break
      inviteCode = generateInviteCode()
      attempts++
    }

    if (attempts >= 10) {
      return { success: false, error: "Failed to generate unique invite code" }
    }

    // Create invite code record
    const { data: inviteCodeRecord, error } = await supabase
      .from("invite_codes")
      .insert({
        hackathon_id: hackathonId,
        code: inviteCode,
        created_by: creatorId,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating invite code:", error)
      return { success: false, error: "Failed to create invite code" }
    }

    return {
      success: true,
      inviteCode,
      message: `Invite code created: ${inviteCode}`,
    }
  } catch (error: any) {
    console.error("Error creating invite code:", error)
    return { success: false, error: "Failed to create invite code" }
  }
}

export async function joinHackathonWithCode(inviteCode: string, userEmail: string) {
  try {
    console.log("🔍 Attempting to join hackathon with code:", inviteCode, "for user:", userEmail)

    // Find invite code
    const { data: codeRecord, error: codeError } = await supabase
      .from("invite_codes")
      .select(`
        *,
        hackathon:hackathon_id(id, title, team_size, created_by)
      `)
      .eq("code", inviteCode.toUpperCase())
      .single()

    if (codeError || !codeRecord) {
      console.error("❌ Invalid invite code:", codeError)
      return { success: false, error: "Invalid invite code" }
    }

    console.log("✅ Invite code found:", codeRecord.hackathon.title)

    // Check if code is expired
    if (new Date(codeRecord.expires_at) < new Date()) {
      return { success: false, error: "Invite code has expired" }
    }

    // Get user profile
    const { data: userProfile } = await supabase.from("profiles").select("id").eq("email", userEmail).single()

    if (!userProfile) {
      return { success: false, error: "User profile not found" }
    }

    console.log("✅ User profile found:", userProfile.id)

    // Check if user is the creator
    if (codeRecord.hackathon.created_by === userProfile.id) {
      return { success: false, error: "You cannot join your own hackathon" }
    }

    // Check if user is already a team member
    const { data: existingMember } = await supabase
      .from("team_members")
      .select("id")
      .eq("hackathon_id", codeRecord.hackathon_id)
      .eq("user_id", userProfile.id)
      .single()

    if (existingMember) {
      console.log("⚠️ User already a member")
      return { success: false, error: "You are already a member of this hackathon" }
    }

    // Check team size limit
    const { count: currentTeamSize } = await supabase
      .from("team_members")
      .select("*", { count: "exact" })
      .eq("hackathon_id", codeRecord.hackathon_id)

    if (currentTeamSize && currentTeamSize >= codeRecord.hackathon.team_size) {
      return { success: false, error: "This hackathon team is already full" }
    }

    console.log("➕ Adding user to team...")

    // Add user to team
    const { error: teamError } = await supabase.from("team_members").insert({
      hackathon_id: codeRecord.hackathon_id,
      user_id: userProfile.id,
      role: "member",
    })

    if (teamError) {
      console.error("❌ Error adding team member:", teamError)
      return { success: false, error: "Failed to join team" }
    }

    console.log("✅ User added to team successfully")

    // Update invite code usage
    await supabase
      .from("invite_codes")
      .update({
        used_count: (codeRecord.used_count || 0) + 1,
        last_used_at: new Date().toISOString(),
      })
      .eq("id", codeRecord.id)

    console.log("✅ Invite code usage updated")

    return {
      success: true,
      hackathon: codeRecord.hackathon,
      message: `Successfully joined "${codeRecord.hackathon.title}"!`,
    }
  } catch (error: any) {
    console.error("❌ Error joining with code:", error)
    return { success: false, error: "Failed to join hackathon" }
  }
}

export async function getHackathonInviteCodes(hackathonId: string, userId: string) {
  try {
    // Check if user is the creator
    const { data: hackathon } = await supabase
      .from("hackathons")
      .select("created_by")
      .eq("id", hackathonId)
      .eq("created_by", userId)
      .single()

    if (!hackathon) {
      return { success: false, error: "Not authorized" }
    }

    // Get invite codes for this hackathon
    const { data: codes, error } = await supabase
      .from("invite_codes")
      .select("*")
      .eq("hackathon_id", hackathonId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching invite codes:", error)
      return { success: false, error: "Failed to fetch invite codes" }
    }

    return { success: true, codes: codes || [] }
  } catch (error: any) {
    console.error("Error getting invite codes:", error)
    return { success: false, error: "Failed to get invite codes" }
  }
}

export async function deleteInviteCode(codeId: string, userId: string) {
  try {
    // Check if user owns this invite code
    const { data: codeRecord } = await supabase
      .from("invite_codes")
      .select("created_by")
      .eq("id", codeId)
      .eq("created_by", userId)
      .single()

    if (!codeRecord) {
      return { success: false, error: "Invite code not found or not authorized" }
    }

    // Delete the invite code
    const { error } = await supabase.from("invite_codes").delete().eq("id", codeId)

    if (error) {
      console.error("Error deleting invite code:", error)
      return { success: false, error: "Failed to delete invite code" }
    }

    return { success: true, message: "Invite code deleted successfully" }
  } catch (error: any) {
    console.error("Error deleting invite code:", error)
    return { success: false, error: "Failed to delete invite code" }
  }
}

export async function acceptInvitation(token: string, userEmail: string) {
  try {
    // Find invitation by token
    const { data: invitation, error: inviteError } = await supabase
      .from("invitations")
      .select(`
        *,
        hackathon:hackathon_id(id, title, team_size),
        inviter:inviter_id(full_name, email)
      `)
      .eq("token", token)
      .eq("status", "pending")
      .single()

    if (inviteError || !invitation) {
      return { success: false, error: "Invalid or expired invitation" }
    }

    // Check if the user accepting matches the invited email
    if (invitation.email.toLowerCase() !== userEmail.toLowerCase()) {
      return { success: false, error: "This invitation was sent to a different email address" }
    }

    // Get user profile
    const { data: userProfile } = await supabase.from("profiles").select("id").eq("email", userEmail).single()

    if (!userProfile) {
      return { success: false, error: "User profile not found" }
    }

    // Check if user is already a team member
    const { data: existingMember } = await supabase
      .from("team_members")
      .select("id")
      .eq("hackathon_id", invitation.hackathon_id)
      .eq("user_id", userProfile.id)
      .single()

    if (existingMember) {
      // Update invitation status anyway
      await supabase
        .from("invitations")
        .update({
          status: "accepted",
          responded_at: new Date().toISOString(),
        })
        .eq("id", invitation.id)

      return { success: true, hackathon: invitation.hackathon, alreadyMember: true }
    }

    // Check team size limit
    const { count: currentTeamSize } = await supabase
      .from("team_members")
      .select("*", { count: "exact" })
      .eq("hackathon_id", invitation.hackathon_id)

    if (currentTeamSize && currentTeamSize >= invitation.hackathon.team_size) {
      return { success: false, error: "This hackathon team is already full" }
    }

    // Add user to team
    const { error: teamError } = await supabase.from("team_members").insert({
      hackathon_id: invitation.hackathon_id,
      user_id: userProfile.id,
      role: "member",
    })

    if (teamError) {
      console.error("Error adding team member:", teamError)
      return { success: false, error: "Failed to join team" }
    }

    // Update invitation status
    const { error: updateError } = await supabase
      .from("invitations")
      .update({
        status: "accepted",
        responded_at: new Date().toISOString(),
      })
      .eq("id", invitation.id)

    if (updateError) {
      console.error("Error updating invitation:", updateError)
    }

    return {
      success: true,
      hackathon: invitation.hackathon,
      message: `Successfully joined "${invitation.hackathon.title}"!`,
    }
  } catch (error: any) {
    console.error("Error accepting invitation:", error)
    return { success: false, error: "Failed to accept invitation" }
  }
}

export async function getInvitationDetails(token: string) {
  try {
    const { data: invitation, error } = await supabase
      .from("invitations")
      .select(`
        *,
        hackathon:hackathon_id(id, title, description, theme, start_time, end_time),
        inviter:inviter_id(full_name, email)
      `)
      .eq("token", token)
      .single()

    if (error || !invitation) {
      return { success: false, error: "Invitation not found" }
    }

    return { success: true, invitation }
  } catch (error: any) {
    console.error("Error getting invitation details:", error)
    return { success: false, error: "Failed to get invitation details" }
  }
}

export async function getUserSharedHackathons(userEmail: string) {
  try {
    const { data: userProfile } = await supabase.from("profiles").select("id").eq("email", userEmail).single()

    if (!userProfile) {
      return { success: false, error: "User not found" }
    }

    // Get hackathons where user is a team member (but not creator) AND pending invitations
    const [teamMemberships, pendingInvitations] = await Promise.all([
      // Get hackathons where user is already a team member
      supabase
        .from("team_members")
        .select(`
          hackathon:hackathon_id(
            id,
            title,
            description,
            theme,
            start_time,
            end_time,
            team_size,
            status,
            creator:created_by(full_name, email)
          )
        `)
        .eq("user_id", userProfile.id)
        .neq("role", "creator"),

      // Get pending invitations for this user
      supabase
        .from("invitations")
        .select(`
          *,
          hackathon:hackathon_id(
            id,
            title,
            description,
            theme,
            start_time,
            end_time,
            team_size,
            status,
            creator:created_by(full_name, email)
          ),
          inviter:inviter_id(full_name, email)
        `)
        .eq("email", userEmail)
        .eq("status", "pending"),
    ])

    if (teamMemberships.error) {
      console.error("Error fetching team memberships:", teamMemberships.error)
      return { success: false, error: "Failed to fetch shared hackathons" }
    }

    if (pendingInvitations.error) {
      console.error("Error fetching pending invitations:", pendingInvitations.error)
      return { success: false, error: "Failed to fetch pending invitations" }
    }

    // Process joined hackathons
    const joinedHackathons =
      teamMemberships.data
        ?.map((item) => item.hackathon)
        .filter((h) => h && h.status === "active")
        .map((h) => ({
          ...h,
          creator: h.creator || null,
          status: "joined" as const,
        })) || []

    // Process pending invitations
    const pendingHackathons =
      pendingInvitations.data
        ?.map((invitation) => ({
          ...invitation.hackathon,
          creator: invitation.hackathon?.creator || null,
          status: "pending" as const,
          invitation: {
            id: invitation.id,
            token: invitation.token,
            invited_at: invitation.invited_at,
            inviter: invitation.inviter,
          },
        }))
        .filter((h) => h && h.status === "active") || []

    // Combine and sort by most recent activity
    const allHackathons = [...joinedHackathons, ...pendingHackathons].sort((a, b) => {
      const aDate = a.status === "pending" ? a.invitation?.invited_at : a.start_time
      const bDate = b.status === "pending" ? b.invitation?.invited_at : b.start_time
      return new Date(bDate || 0).getTime() - new Date(aDate || 0).getTime()
    })

    return { success: true, hackathons: allHackathons }
  } catch (error: any) {
    console.error("Error getting shared hackathons:", error)
    return { success: false, error: "Failed to get shared hackathons" }
  }
}
