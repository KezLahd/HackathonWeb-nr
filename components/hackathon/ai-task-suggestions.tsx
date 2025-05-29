"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { generateTaskSuggestions } from "@/app/actions/ai-actions"
import { supabase } from "@/lib/supabase"
import { Lightbulb, Plus, Clock, Loader2, Sparkles } from "lucide-react"

interface AITaskSuggestionsProps {
  hackathon: any
  tasks: any[]
  timeRemaining: number
  onTaskAdded: () => void
}

export function AITaskSuggestions({ hackathon, tasks, timeRemaining, onTaskAdded }: AITaskSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [addingTasks, setAddingTasks] = useState<Set<number>>(new Set())

  const generateSuggestions = async () => {
    setLoading(true)
    try {
      const existingTasks = tasks.map((t) => t.title)
      const completedTasks = tasks.filter((t) => t.completed).map((t) => t.title)

      const result = await generateTaskSuggestions(
        hackathon.theme,
        hackathon.goal,
        existingTasks,
        completedTasks,
        timeRemaining,
      )

      if (result.success) {
        setSuggestions(result.tasks)
      } else {
        console.error("Failed to generate suggestions:", result.error)
      }
    } catch (error) {
      console.error("Error generating suggestions:", error)
    } finally {
      setLoading(false)
    }
  }

  const addSuggestedTask = async (suggestion: any, index: number) => {
    setAddingTasks((prev) => new Set(prev).add(index))

    try {
      const { error } = await supabase.from("tasks").insert({
        hackathon_id: hackathon.id,
        title: suggestion.title,
        description: suggestion.description,
        priority: suggestion.priority,
        estimated_hours: suggestion.estimatedHours,
      })

      if (error) throw error

      // Remove the added suggestion from the list
      setSuggestions((prev) => prev.filter((_, i) => i !== index))
      onTaskAdded()
    } catch (error: any) {
      console.error("Error adding suggested task:", error)
      alert(error.message)
    } finally {
      setAddingTasks((prev) => {
        const newSet = new Set(prev)
        newSet.delete(index)
        return newSet
      })
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-500/20 text-red-400 border-red-500/30"
      case "medium":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
      case "low":
        return "bg-green-500/20 text-green-400 border-green-500/30"
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30"
    }
  }

  return (
    <Card className="border-glow bg-dark-surface/80 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-glow flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-electric-blue" />
            AI Task Suggestions
          </CardTitle>
          <Button
            onClick={generateSuggestions}
            disabled={loading}
            size="sm"
            className="bg-electric-blue hover:bg-electric-blue/80 text-dark-bg"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-20 bg-dark-bg rounded-lg"></div>
              </div>
            ))}
          </div>
        ) : suggestions.length > 0 ? (
          <div className="space-y-3">
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                className="p-3 rounded-lg border border-dark-border bg-dark-bg hover:border-electric-blue/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <h4 className="font-medium text-sm mb-1">{suggestion.title}</h4>
                    <p className="text-xs text-muted-foreground mb-2">{suggestion.description}</p>

                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={getPriorityColor(suggestion.priority)}>
                        {suggestion.priority}
                      </Badge>
                      <Badge variant="outline" className="border-electric-blue/30 text-electric-blue">
                        <Clock className="h-3 w-3 mr-1" />
                        {suggestion.estimatedHours}h
                      </Badge>
                      {suggestion.category && (
                        <Badge variant="outline" className="border-neon-purple/30 text-neon-purple">
                          {suggestion.category}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <Button
                    onClick={() => addSuggestedTask(suggestion, index)}
                    disabled={addingTasks.has(index)}
                    size="sm"
                    className="bg-electric-blue hover:bg-electric-blue/80 text-dark-bg"
                  >
                    {addingTasks.has(index) ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <Lightbulb className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground text-sm mb-3">
              Get AI-powered task suggestions to improve your project
            </p>
            <Button onClick={generateSuggestions} className="bg-electric-blue hover:bg-electric-blue/80 text-dark-bg">
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Suggestions
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
