"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { MessageCircle } from "lucide-react"
import { AIChat } from "./ai-chat"

interface AIChatToggleProps {
  hackathon: any
  tasks: any[]
  teamMembers: any[]
}

export function AIChatToggle({ hackathon, tasks, teamMembers }: AIChatToggleProps) {
  const [isOpen, setIsOpen] = useState(false)

  if (isOpen) {
    return <AIChat hackathon={hackathon} tasks={tasks} teamMembers={teamMembers} onClose={() => setIsOpen(false)} />
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Button
        onClick={() => setIsOpen(true)}
        className="bg-electric-blue hover:bg-electric-blue/80 text-dark-bg rounded-full h-14 w-14 shadow-lg glow-effect animate-pulse"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
    </div>
  )
}
