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

export class AIService {
  static async generateTaskSuggestions(
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

      return object.tasks
    } catch (error) {
      console.error("Error generating task suggestions:", error)
      return []
    }
  }

  static async analyzeProjectProgress(tasks: any[], teamSize: number, timeRemaining: number, theme: string) {
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

      return object
    } catch (error) {
      console.error("Error analyzing project progress:", error)
      return null
    }
  }

  static async generateSmartTaskDescription(title: string, theme: string, goal: string) {
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

      return text.trim()
    } catch (error) {
      console.error("Error generating task description:", error)
      return ""
    }
  }

  static async suggestTeamOptimization(tasks: any[], teamMembers: any[]) {
    try {
      const { text } = await generateText({
        model: groq("llama-3.1-8b-instant"),
        prompt: `Analyze this hackathon team's task distribution and suggest optimizations:

Team Members: ${teamMembers.length}
Total Tasks: ${tasks.length}
Unassigned Tasks: ${tasks.filter((t) => !t.assigned_to).length}
High Priority Tasks: ${tasks.filter((t) => t.priority === "high").length}

Task Distribution:
${teamMembers
  .map((member) => {
    const memberTasks = tasks.filter((t) => t.assigned_to === member.id)
    return `${member.full_name || member.email}: ${memberTasks.length} tasks (${memberTasks.filter((t) => t.completed).length} completed)`
  })
  .join("\n")}

Provide 2-3 specific suggestions for better task distribution and team efficiency. Focus on:
1. Balancing workload
2. Prioritizing critical tasks
3. Identifying potential bottlenecks
4. Suggesting parallel work opportunities

Keep suggestions brief and actionable.`,
      })

      return text.trim()
    } catch (error) {
      console.error("Error generating team optimization suggestions:", error)
      return ""
    }
  }
}
