import { generateText } from "ai"
import { groq } from "@ai-sdk/groq"

export interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

export class AIChatService {
  static async generateResponse(
    message: string,
    hackathon: any,
    tasks: any[],
    teamMembers: any[],
    chatHistory: ChatMessage[] = [],
  ): Promise<string> {
    try {
      // Build context about the project
      const completedTasks = tasks.filter((t) => t.completed)
      const highPriorityTasks = tasks.filter((t) => t.priority === "high" && !t.completed)
      const unassignedTasks = tasks.filter((t) => !t.assigned_to)

      const now = new Date()
      const endTime = new Date(hackathon.end_time)
      const timeRemaining = Math.max(0, Math.floor((endTime.getTime() - now.getTime()) / (1000 * 60 * 60)))

      // Get recent chat context (last 6 messages)
      const recentHistory = chatHistory
        .slice(-6)
        .map((msg) => `${msg.role}: ${msg.content}`)
        .join("\n")

      const { text } = await generateText({
        model: groq("llama-3.1-8b-instant"),
        prompt: `You are an expert hackathon mentor and AI assistant helping a team with their project. You provide practical, actionable advice and answer questions about their hackathon progress.

CURRENT PROJECT CONTEXT:
- Title: ${hackathon.title}
- Theme: ${hackathon.theme}
- Goal: ${hackathon.goal}
- Time Remaining: ${timeRemaining} hours
- Team Size: ${teamMembers.length}
- Total Tasks: ${tasks.length}
- Completed Tasks: ${completedTasks.length}
- High Priority Pending: ${highPriorityTasks.length}
- Unassigned Tasks: ${unassignedTasks.length}

RECENT CONVERSATION:
${recentHistory}

USER QUESTION: ${message}

Provide helpful, specific advice based on their project context. Be encouraging but realistic about what can be achieved in the remaining time. If they ask about:

1. TECHNICAL QUESTIONS: Provide specific implementation guidance
2. PROJECT MANAGEMENT: Suggest task prioritization and time management
3. TEAM COORDINATION: Recommend collaboration strategies
4. PRESENTATION PREP: Help with demo and pitch preparation
5. DEBUGGING: Offer troubleshooting approaches
6. FEATURE DECISIONS: Help prioritize features based on time constraints

Keep responses concise (2-3 paragraphs max) and actionable. Use a friendly, supportive tone like an experienced mentor.`,
      })

      return text.trim()
    } catch (error) {
      console.error("Error generating AI response:", error)
      return "I'm having trouble processing your request right now. Please try again in a moment."
    }
  }

  static async generateQuickSuggestions(hackathon: any, tasks: any[], timeRemaining: number): Promise<string[]> {
    try {
      const completedTasks = tasks.filter((t) => t.completed)
      const progressPercentage = tasks.length > 0 ? (completedTasks.length / tasks.length) * 100 : 0

      const { text } = await generateText({
        model: groq("llama-3.1-8b-instant"),
        prompt: `Generate 4 quick question suggestions for a hackathon team to ask their AI mentor.

Project Context:
- Theme: ${hackathon.theme}
- Progress: ${Math.round(progressPercentage)}% complete
- Time Remaining: ${timeRemaining} hours
- Total Tasks: ${tasks.length}

Generate practical questions they might want to ask about:
1. Technical implementation
2. Time management
3. Feature prioritization
4. Presentation preparation

Format as a simple list of questions, one per line. Keep questions specific and actionable.`,
      })

      return text
        .trim()
        .split("\n")
        .filter((line) => line.trim())
        .slice(0, 4)
    } catch (error) {
      console.error("Error generating suggestions:", error)
      return [
        "How should I prioritize my remaining tasks?",
        "What's the best way to prepare for the final presentation?",
        "How can our team work more efficiently?",
        "What features should we focus on with limited time?",
      ]
    }
  }
}
