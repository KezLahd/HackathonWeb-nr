"use client"

import type React from "react"
import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { joinHackathonWithCode } from "@/app/actions/invitation-actions"
import { Loader2, Hash, CheckCircle, AlertCircle } from "lucide-react"

interface JoinHackathonModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  userEmail: string
}

export function JoinHackathonModal({ open, onOpenChange, onSuccess, userEmail }: JoinHackathonModalProps) {
  const [inviteCode, setInviteCode] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [isSuccess, setIsSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteCode.trim()) return

    setIsLoading(true)
    setMessage("")
    setIsSuccess(false)

    try {
      const result = await joinHackathonWithCode(inviteCode.trim().toUpperCase(), userEmail)

      if (result.success) {
        setIsSuccess(true)
        setMessage(result.message || "Successfully joined the hackathon!")
        setInviteCode("")

        // Close modal and refresh after 2 seconds
        setTimeout(() => {
          onSuccess()
          onOpenChange(false)
          setMessage("")
          setIsSuccess(false)
        }, 2000)
      } else {
        setIsSuccess(false)
        setMessage(result.error || "Failed to join hackathon")
      }
    } catch (error: any) {
      console.error("Error joining hackathon:", error)
      setIsSuccess(false)
      setMessage("An unexpected error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setInviteCode("")
    setMessage("")
    setIsSuccess(false)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px] bg-dark-surface border-dark-border">
        <DialogHeader>
          <DialogTitle className="text-xl text-glow text-electric-blue flex items-center gap-2">
            <Hash className="h-5 w-5" />
            Join Hackathon
          </DialogTitle>
          <DialogDescription>Enter an invite code to join a hackathon team</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="inviteCode">Invite Code</Label>
            <Input
              id="inviteCode"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder="Enter 6-character code (e.g., ABC123)"
              maxLength={6}
              className="bg-dark-bg border-dark-border focus:border-electric-blue font-mono text-center text-lg tracking-wider"
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground mt-1">Ask the hackathon creator for their invite code</p>
          </div>

          {message && (
            <Alert
              className={
                isSuccess ? "border-electric-green/30 bg-electric-green/10" : "border-red-500/30 bg-red-500/10"
              }
            >
              {isSuccess ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              <AlertDescription className={isSuccess ? "text-electric-green" : "text-red-400"}>
                {message}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-4 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1 border-dark-border hover:bg-dark-surface"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !inviteCode.trim() || inviteCode.length !== 6}
              className="flex-1 bg-electric-blue hover:bg-electric-blue/80 text-dark-bg font-semibold"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Joining...
                </>
              ) : (
                <>
                  <Hash className="h-4 w-4 mr-2" />
                  Join Hackathon
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
