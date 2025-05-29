"use server"

import { generateText } from "ai"
import { groq } from "@ai-sdk/groq"

export async function summarizeDescription(description: string, maxLength = 150) {
  if (description.length <= maxLength) {
    return description
  }

  try {
    const { text } = await generateText({
      model: groq("llama-3.1-8b-instant"),
      prompt: `Summarize this hackathon project description in one concise sentence (max ${maxLength} characters). Focus on the main goal and key technology:

"${description}"`,
      maxTokens: 50,
    })

    return text.trim()
  } catch (error) {
    console.error("Error summarizing description:", error)
    // Fallback to simple truncation
    return description.substring(0, maxLength) + "..."
  }
}
