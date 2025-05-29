"use server"

import { generateText, generateObject } from "ai"
import { groq } from "@ai-sdk/groq"
import { z } from "zod"

// Schema for task suggestions
const TaskSuggestionSchema = z.object({
  tasks: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
      priority: z.enum(["high", "medium", "low"]),
      estimatedHours: z.number(),
      category: z.string(),
      dependencies: z.array(z.string()).optional(),
    }),
  ),
})

// Schema for project insights
const ProjectInsightSchema = z.object({
  insights: z.array(
    z.object({
      type: z.enum(["warning", "suggestion", "achievement", "tip"]),
      title: z.string(),
      description: z.string(),
      actionable: z.boolean(),
    }),
  ),
  overallProgress: z.object({
    score: z.number().min(0).max(100),
    summary: z.string(),
    recommendations: z.array(z.string()),
  }),
})

export async function generateTaskSuggestions(
  theme: string,
  goal: string,
  existingTasks: string[],
  completedTasks: string[],
  timeRemaining: number,
) {
  try {
    const { object } = await generateObject({
      model: groq("llama-3.1-8b-instant"),
      schema: TaskSuggestionSchema,
      prompt: `You are an expert hackathon mentor. Based on the project details below, suggest 3-5 additional tasks that would improve the project.

Project Theme: ${theme}
Project Goal: ${goal}
Time Remaining: ${timeRemaining} hours
Existing Tasks: ${existingTasks.join(", ")}
Completed Tasks: ${completedTasks.join(", ")}

Focus on:
1. Tasks that fill gaps in the current plan
2. Tasks that would add polish and professionalism
3. Tasks that improve user experience
4. Tasks that are achievable in the remaining time

Each task should be specific, actionable, and realistic for a hackathon setting.`,
    })

    return { success: true, tasks: object.tasks }
  } catch (error) {
    console.error("Error generating task suggestions:", error)
    return { success: false, error: "Failed to generate task suggestions" }
  }
}

export async function analyzeProjectProgress(tasks: any[], teamSize: number, timeRemaining: number, theme: string) {
  try {
    const completedTasks = tasks.filter((t) => t.completed)
    const totalEstimatedHours = tasks.reduce((sum, t) => sum + (t.estimated_hours || 0), 0)
    const completedHours = completedTasks.reduce((sum, t) => sum + (t.estimated_hours || 0), 0)

    const { object } = await generateObject({
      model: groq("llama-3.1-8b-instant"),
      schema: ProjectInsightSchema,
      prompt: `Analyze this hackathon project progress and provide insights:

Project Theme: ${theme}
Team Size: ${teamSize}
Time Remaining: ${timeRemaining} hours
Total Tasks: ${tasks.length}
Completed Tasks: ${completedTasks.length}
Total Estimated Hours: ${totalEstimatedHours}
Completed Hours: ${completedHours}
High Priority Tasks: ${tasks.filter((t) => t.priority === "high").length}
Unassigned Tasks: ${tasks.filter((t) => !t.assigned_to).length}

Provide:
1. Specific insights about progress, bottlenecks, and opportunities
2. Actionable recommendations for the remaining time
3. An overall progress score (0-100)
4. Warnings about potential issues

Be encouraging but realistic about what can be achieved.`,
    })

    return { success: true, analysis: object }
  } catch (error) {
    console.error("Error analyzing project progress:", error)
    return { success: false, error: "Failed to analyze project progress" }
  }
}

export async function generateSmartTaskDescription(title: string, theme: string, goal: string) {
  try {
    const { text } = await generateText({
      model: groq("llama-3.1-8b-instant"),
      prompt: `Generate a detailed, actionable description for this hackathon task:

Task Title: ${title}
Project Theme: ${theme}
Project Goal: ${goal}

The description should:
1. Be specific and actionable
2. Include key deliverables
3. Mention relevant technologies or approaches
4. Be appropriate for a hackathon timeline
5. Be 2-3 sentences maximum

Focus on what needs to be done, not why it's important.`,
    })

    return { success: true, description: text.trim() }
  } catch (error) {
    console.error("Error generating task description:", error)
    return { success: false, error: "Failed to generate task description" }
  }
}

export async function generateChatResponse(
  message: string,
  hackathon: any,
  tasks: any[],
  teamMembers: any[],
  chatHistory: any[] = [],
) {
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

    return { success: true, response: text.trim() }
  } catch (error) {
    console.error("Error generating AI response:", error)
    return { success: false, error: "Failed to generate response" }
  }
}

export async function generateQuickSuggestions(hackathon: any, tasks: any[], timeRemaining: number) {
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

    const suggestions = text
      .trim()
      .split("\n")
      .filter((line) => line.trim())
      .slice(0, 4)

    return { success: true, suggestions }
  } catch (error) {
    console.error("Error generating suggestions:", error)
    return {
      success: true,
      suggestions: [
        "How should I prioritize my remaining tasks?",
        "What's the best way to prepare for the final presentation?",
        "How can our team work more efficiently?",
        "What features should we focus on with limited time?",
      ],
    }
  }
}
