"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Sparkles, Loader2, Check, X } from "lucide-react"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

interface AiDescriptionEnhancerProps {
  currentDescription: string
  theme: string
  onSelect: (enhancedDescription: string) => void
  onClose: () => void
}

export function AiDescriptionEnhancer({ currentDescription, theme, onSelect, onClose }: AiDescriptionEnhancerProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])

  const generateSuggestions = async () => {
    if (!currentDescription.trim()) return

    setIsGenerating(true)
    try {
      const { text } = await generateText({
        model: openai("gpt-4o"),
        prompt: `Based on this brief hackathon description: "${currentDescription}" and theme: "${theme}", generate 3 enhanced, detailed descriptions that would help AI generate better tasks. Each should be comprehensive, specific, and include clear goals, target audience, and technical requirements.

Format as JSON array of strings:
["description1", "description2", "description3"]

Make each description:
- 2-3 sentences long
- Include specific technical goals
- Mention target users/audience
- Include measurable outcomes
- Be inspiring and clear`,
      })

      const parsed = JSON.parse(text)
      if (Array.isArray(parsed)) {
        setSuggestions(parsed)
      }
    } catch (error) {
      console.error("Error generating suggestions:", error)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Card className="border-electric-blue/30 bg-dark-surface/80 backdrop-blur-sm">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-electric-blue" />
            <span classNameName="font-medium text-electric-blue">AI Enhancement</span>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {suggestions.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-muted-foreground mb-4">
              Get AI-enhanced descriptions that help generate better tasks and provide clearer project direction.
            </p>
            <Button
              onClick={generateSuggestions}
              disabled={isGenerating || !currentDescription.trim()}
              className="bg-electric-blue hover:bg-electric-blue/80 text-dark-bg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Enhance Description
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Choose an enhanced version:</p>
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                className="p-3 border border-dark-border rounded-lg hover:border-electric-blue/50 cursor-pointer transition-colors"
                onClick={() => onSelect(suggestion)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <Badge variant="outline" className="mb-2 text-xs">
                      Option {index + 1}
                    </Badge>
                    <p className="text-sm text-foreground">{suggestion}</p>
                  </div>
                  <Button size="sm" variant="ghost" className="text-electric-blue hover:bg-electric-blue/20">
                    <Check className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={generateSuggestions}
              disabled={isGenerating}
              className="w-full border-dark-border hover:bg-dark-bg"
            >
              Generate New Options
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
