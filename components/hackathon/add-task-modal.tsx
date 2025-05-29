"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { supabase } from "@/lib/supabase"
import { Loader2, Plus, Wand2 } from "lucide-react"
import { generateSmartTaskDescription } from "@/app/actions/ai-actions"

interface AddTaskModalProps {
  isOpen: boolean
  onClose: () => void
  hackathonId: string
  teamMembers: any[]
  hackathon?: any
  onSuccess: () => void
}

export function AddTaskModal({ isOpen, onClose, hackathonId, teamMembers, hackathon, onSuccess }: AddTaskModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "medium",
    estimatedHours: 1,
    assignedTo: "",
  })
  const [generatingDescription, setGeneratingDescription] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const { error } = await supabase.from("tasks").insert({
        hackathon_id: hackathonId,
        title: formData.title,
        description: formData.description,
        priority: formData.priority,
        estimated_hours: formData.estimatedHours,
        assigned_to: formData.assignedTo || null,
      })

      if (error) throw error

      setFormData({
        title: "",
        description: "",
        priority: "medium",
        estimatedHours: 1,
        assignedTo: "",
      })
      onSuccess()
    } catch (error: any) {
      console.error("Error creating task:", error)
      alert(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const generateAIDescription = async () => {
    if (!formData.title.trim()) {
      alert("Please enter a task title first")
      return
    }

    setGeneratingDescription(true)
    try {
      const result = await generateSmartTaskDescription(formData.title, hackathon?.theme || "", hackathon?.goal || "")
      if (result.success) {
        setFormData({ ...formData, description: result.description })
      } else {
        console.error("Failed to generate description:", result.error)
      }
    } catch (error) {
      console.error("Error generating description:", error)
    } finally {
      setGeneratingDescription(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] bg-dark-surface border-dark-border">
        <DialogHeader>
          <DialogTitle className="text-xl text-glow text-electric-blue flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add New Task
          </DialogTitle>
          <DialogDescription>Create a new task for your hackathon project</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Task Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Implement user authentication"
              required
              className="bg-dark-bg border-dark-border focus:border-electric-blue"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="description">Description</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={generateAIDescription}
                disabled={generatingDescription || !formData.title.trim()}
                className="h-6 px-2 text-xs text-electric-blue hover:text-electric-blue/80"
              >
                {generatingDescription ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
                AI Generate
              </Button>
            </div>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Set up login/signup functionality with email validation..."
              className="bg-dark-bg border-dark-border focus:border-electric-blue"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData({ ...formData, priority: value })}
              >
                <SelectTrigger className="bg-dark-bg border-dark-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-dark-surface border-dark-border">
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="estimatedHours">Estimated Hours</Label>
              <Input
                id="estimatedHours"
                type="number"
                value={formData.estimatedHours}
                onChange={(e) => setFormData({ ...formData, estimatedHours: Number.parseInt(e.target.value) })}
                min="1"
                max="24"
                className="bg-dark-bg border-dark-border focus:border-electric-blue"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="assignedTo">Assign To</Label>
            <Select
              value={formData.assignedTo}
              onValueChange={(value) => setFormData({ ...formData, assignedTo: value })}
            >
              <SelectTrigger className="bg-dark-bg border-dark-border">
                <SelectValue placeholder="Select team member (optional)" />
              </SelectTrigger>
              <SelectContent className="bg-dark-surface border-dark-border">
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {teamMembers.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.full_name || member.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-4 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 border-dark-border hover:bg-dark-surface"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-electric-blue hover:bg-electric-blue/80 text-dark-bg font-semibold"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Task
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
