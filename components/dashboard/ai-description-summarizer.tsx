"use client"

import { useState, useEffect } from "react"
import { summarizeDescription } from "@/app/actions/summarize-description"

interface AIDescriptionSummarizerProps {
  description: string
  maxLength?: number
}

export function AIDescriptionSummarizer({ description, maxLength = 150 }: AIDescriptionSummarizerProps) {
  const [summary, setSummary] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [showFull, setShowFull] = useState(false)

  useEffect(() => {
    if (description.length > maxLength) {
      handleSummarization()
    } else {
      setSummary(description)
    }
  }, [description, maxLength])

  const handleSummarization = async () => {
    setIsLoading(true)
    try {
      const result = await summarizeDescription(description, maxLength)
      setSummary(result)
    } catch (error) {
      console.error("Error summarizing description:", error)
      // Fallback to simple truncation
      setSummary(description.substring(0, maxLength) + "...")
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-base text-muted-foreground">
        <div className="animate-pulse">Summarizing...</div>
      </div>
    )
  }

  if (description.length <= maxLength) {
    return <span className="text-base">{description}</span>
  }

  return (
    <div className="text-base">
      {showFull ? (
        <div>
          {description}
          <button
            onClick={() => setShowFull(false)}
            className="ml-2 text-electric-blue hover:text-electric-blue/80 underline"
          >
            Show less
          </button>
        </div>
      ) : (
        <div>
          {summary}
          <button
            onClick={() => setShowFull(true)}
            className="ml-2 text-electric-blue hover:text-electric-blue/80 underline"
          >
            Show more
          </button>
        </div>
      )}
    </div>
  )
}
