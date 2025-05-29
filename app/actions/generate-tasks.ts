"use server"

import { generateObject } from "ai"
import { groq } from "@ai-sdk/groq"
import { z } from "zod"

// Define the schema for task generation
const TasksSchema = z.object({
  tasks: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
      estimatedHours: z.number().min(1).max(24),
      priority: z.enum(["high", "medium", "low"]),
    }),
  ),
})

export async function generateTasks(theme: string, goal: string, duration: number, teamSize: number) {
  try {
    const { object } = await generateObject({
      model: groq("llama-3.1-8b-instant"),
      schema: TasksSchema,
      prompt: `Generate a detailed task list for a hackathon project with the following details:
      
Theme: ${theme}
Goal: ${goal}
Duration: ${duration} hours
Team Size: ${teamSize} people

Create a comprehensive task breakdown that includes:
1. Planning and ideation tasks
2. Technical development tasks
3. Design and UI/UX tasks
4. Testing and debugging tasks
5. Presentation preparation tasks

For each task, provide:
- A clear, actionable title
- A brief description (1-2 sentences)
- Estimated time in hours (realistic for hackathon pace)
- Priority level (high, medium, low)

Generate 5-8 tasks total. Make sure the total estimated hours don't exceed ${Math.floor(duration * 0.8)} hours to allow for buffer time.

Focus on tasks that are:
- Achievable within the hackathon timeframe
- Specific and actionable
- Appropriate for a team of ${teamSize} people
- Aligned with the theme "${theme}" and goal "${goal}"`,
    })

    return object.tasks
  } catch (error) {
    console.error("Error generating tasks:", error)

    // Fallback tasks if AI generation fails
    const fallbackTasks = [
      {
        title: "Project Planning & Ideation",
        description:
          "Define project scope, create wireframes, and plan technical architecture for the hackathon project.",
        estimatedHours: Math.max(1, Math.floor(duration * 0.1)),
        priority: "high" as const,
      },
      {
        title: "Core Feature Development",
        description: "Implement the main functionality and core features of the application.",
        estimatedHours: Math.max(3, Math.floor(duration * 0.4)),
        priority: "high" as const,
      },
      {
        title: "User Interface Design",
        description: "Create an intuitive and visually appealing user interface with good UX principles.",
        estimatedHours: Math.max(2, Math.floor(duration * 0.2)),
        priority: "medium" as const,
      },
      {
        title: "Integration & Testing",
        description: "Connect different components, test functionality, and fix critical bugs.",
        estimatedHours: Math.max(2, Math.floor(duration * 0.15)),
        priority: "medium" as const,
      },
      {
        title: "Demo Preparation",
        description: "Prepare presentation materials, demo script, and practice the final pitch.",
        estimatedHours: Math.max(1, Math.floor(duration * 0.1)),
        priority: "low" as const,
      },
    ]

    return fallbackTasks
  }
}
