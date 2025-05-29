// Task dependency and ordering types
export interface TaskWithOrder {
  id: string
  title: string
  description: string
  priority: "high" | "medium" | "low"
  estimated_hours: number
  dependencies?: string[]
  order_index: number
  assigned_to?: string | null
  completed: boolean
  start_date?: string
  end_date?: string
}

export interface GanttTask {
  id: string
  title: string
  start: Date
  end: Date
  progress: number
  assignee?: string
  priority: "high" | "medium" | "low"
  dependencies: string[]
  estimated_hours: number
}

export class TaskOrderingService {
  /**
   * Smart task ordering based on dependencies, priority, and estimated time
   */
  static calculateOptimalOrder(tasks: TaskWithOrder[]): TaskWithOrder[] {
    // Create a dependency graph
    const taskMap = new Map(tasks.map((task) => [task.id, task]))
    const visited = new Set<string>()
    const orderedTasks: TaskWithOrder[] = []

    // Topological sort with priority weighting
    const visit = (taskId: string, depth = 0) => {
      if (visited.has(taskId) || !taskMap.has(taskId)) return

      const task = taskMap.get(taskId)!
      visited.add(taskId)

      // Visit dependencies first
      if (task.dependencies) {
        task.dependencies.forEach((depId) => visit(depId, depth + 1))
      }

      orderedTasks.push(task)
    }

    // Sort tasks by priority and estimated time for initial ordering
    const sortedTasks = [...tasks].sort((a, b) => {
      // Priority weights
      const priorityWeight = { high: 3, medium: 2, low: 1 }
      const aPriority = priorityWeight[a.priority] || 1
      const bPriority = priorityWeight[b.priority] || 1

      if (aPriority !== bPriority) {
        return bPriority - aPriority // High priority first
      }

      // Shorter tasks first for quick wins
      return a.estimated_hours - b.estimated_hours
    })

    // Process tasks in dependency order
    sortedTasks.forEach((task) => visit(task.id))

    // Assign order indices
    return orderedTasks.map((task, index) => ({
      ...task,
      order_index: index,
    }))
  }

  /**
   * Calculate Gantt chart timeline based on task order and dependencies
   */
  static generateGanttTimeline(
    tasks: TaskWithOrder[],
    hackathonStart: Date,
    hackathonEnd: Date,
    assigneeFilter?: string,
  ): GanttTask[] {
    const filteredTasks = assigneeFilter ? tasks.filter((task) => task.assigned_to === assigneeFilter) : tasks

    const orderedTasks = this.calculateOptimalOrder(filteredTasks)
    const ganttTasks: GanttTask[] = []
    const taskSchedule = new Map<string, { start: Date; end: Date }>()

    let currentTime = new Date(hackathonStart)

    orderedTasks.forEach((task) => {
      // Calculate start time based on dependencies
      let taskStart = new Date(currentTime)

      if (task.dependencies && task.dependencies.length > 0) {
        // Start after all dependencies are complete
        const dependencyEndTimes = task.dependencies
          .map((depId) => taskSchedule.get(depId)?.end)
          .filter(Boolean) as Date[]

        if (dependencyEndTimes.length > 0) {
          taskStart = new Date(Math.max(...dependencyEndTimes.map((d) => d.getTime())))
        }
      }

      // Calculate end time
      const taskEnd = new Date(taskStart.getTime() + task.estimated_hours * 60 * 60 * 1000)

      // Ensure we don't exceed hackathon end time
      if (taskEnd > hackathonEnd) {
        taskEnd.setTime(hackathonEnd.getTime())
      }

      taskSchedule.set(task.id, { start: taskStart, end: taskEnd })

      ganttTasks.push({
        id: task.id,
        title: task.title,
        start: taskStart,
        end: taskEnd,
        progress: task.completed ? 100 : 0,
        assignee: task.assigned_to || undefined,
        priority: task.priority,
        dependencies: task.dependencies || [],
        estimated_hours: task.estimated_hours,
      })

      // Update current time for next task (parallel tasks can start at same time)
      if (!assigneeFilter) {
        currentTime = new Date(Math.max(currentTime.getTime(), taskEnd.getTime()))
      }
    })

    return ganttTasks
  }

  /**
   * Suggest optimal task insertion point
   */
  static suggestInsertionPoint(existingTasks: TaskWithOrder[], newTask: Omit<TaskWithOrder, "order_index">): number {
    const orderedTasks = this.calculateOptimalOrder([...existingTasks, { ...newTask, order_index: 0 }])

    const newTaskIndex = orderedTasks.findIndex((task) => task.id === newTask.id)
    return newTaskIndex
  }

  /**
   * Reorder tasks based on drag and drop
   */
  static reorderTasks(tasks: TaskWithOrder[], draggedTaskId: string, newIndex: number): TaskWithOrder[] {
    const tasksCopy = [...tasks]
    const draggedTaskIndex = tasksCopy.findIndex((task) => task.id === draggedTaskId)

    if (draggedTaskIndex === -1) return tasks

    // Remove dragged task
    const [draggedTask] = tasksCopy.splice(draggedTaskIndex, 1)

    // Insert at new position
    tasksCopy.splice(newIndex, 0, draggedTask)

    // Update order indices
    return tasksCopy.map((task, index) => ({
      ...task,
      order_index: index,
    }))
  }

  /**
   * Get user's timezone
   */
  static getUserTimezone(): string {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  }

  /**
   * Convert UTC time to user's local time
   */
  static toUserTime(utcDate: string | Date): Date {
    const date = typeof utcDate === "string" ? new Date(utcDate) : utcDate
    return new Date(date.toLocaleString("en-US", { timeZone: this.getUserTimezone() }))
  }

  /**
   * Convert user's local time to UTC
   */
  static toUTCTime(localDate: Date): Date {
    return new Date(localDate.toISOString())
  }
}
