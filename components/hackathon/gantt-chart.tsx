"use client"

import type React from "react"

import { useState, useMemo, useRef, useEffect } from "react"
import { createPortal } from "react-dom"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TaskOrderingService, type GanttTask } from "@/lib/task-ordering-service"
import { Calendar, Clock, Users, User, BarChart3, ChevronDown } from "lucide-react"

interface GanttChartProps {
  tasks: any[]
  teamMembers: any[]
  hackathonStart: string
  hackathonEnd: string
  currentUserId?: string
}

export function GanttChart({ tasks, teamMembers, hackathonStart, hackathonEnd, currentUserId }: GanttChartProps) {
  const [viewMode, setViewMode] = useState<"team" | "user">("team")
  const [selectedUser, setSelectedUser] = useState<string>(currentUserId || "")
  const [hoveredTask, setHoveredTask] = useState<string | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })
  const [mounted, setMounted] = useState(false)
  const chartRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Convert hackathon times to user's timezone
  const hackathonStartLocal = TaskOrderingService.toUserTime(hackathonStart)
  const hackathonEndLocal = TaskOrderingService.toUserTime(hackathonEnd)

  // Calculate project duration in days
  const totalDuration = hackathonEndLocal.getTime() - hackathonStartLocal.getTime()
  const totalDays = totalDuration / (1000 * 60 * 60 * 24)
  const totalHours = totalDuration / (1000 * 60 * 60)

  // Smart time scale - use days if longer than 3 days, otherwise hours
  const useHourScale = totalDays <= 3

  // Generate Gantt timeline
  const ganttTasks = useMemo(() => {
    const tasksWithOrder = tasks.map((task, index) => ({
      ...task,
      order_index: task.order_index ?? index,
      dependencies: task.dependencies || [],
    }))

    const assigneeFilter = viewMode === "user" ? selectedUser : undefined
    return TaskOrderingService.generateGanttTimeline(
      tasksWithOrder,
      hackathonStartLocal,
      hackathonEndLocal,
      assigneeFilter,
    )
  }, [tasks, hackathonStartLocal, hackathonEndLocal, viewMode, selectedUser])

  const formatTime = (date: Date) => {
    if (useHourScale) {
      return date.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: TaskOrderingService.getUserTimezone(),
      })
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        timeZone: TaskOrderingService.getUserTimezone(),
      })
    }
  }

  const formatStartEndTime = (date: Date) => {
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: TaskOrderingService.getUserTimezone(),
    })
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return {
          bg: "bg-red-500",
          border: "border-red-600",
          hover: "hover:bg-red-600",
        }
      case "medium":
        return {
          bg: "bg-orange-500",
          border: "border-orange-600",
          hover: "hover:bg-orange-600",
        }
      case "low":
        return {
          bg: "bg-green-500",
          border: "border-green-600",
          hover: "hover:bg-green-600",
        }
      default:
        return {
          bg: "bg-gray-500",
          border: "border-gray-600",
          hover: "hover:bg-gray-600",
        }
    }
  }

  const getTaskWidth = (task: GanttTask) => {
    const taskDuration = task.end.getTime() - task.start.getTime()
    return Math.max((taskDuration / totalDuration) * 100, 4) // Minimum 4% width
  }

  const getTaskLeft = (task: GanttTask) => {
    const taskStart = task.start.getTime() - hackathonStartLocal.getTime()
    return (taskStart / totalDuration) * 100
  }

  const getAssigneeName = (assigneeId?: string) => {
    if (!assigneeId) return "Unassigned"
    const member = teamMembers.find((m) => m.id === assigneeId)
    return member?.full_name || member?.email || "Unknown"
  }

  const getAssigneeInitials = (assigneeId?: string) => {
    if (!assigneeId) return "?"
    const member = teamMembers.find((m) => m.id === assigneeId)
    const name = member?.full_name || member?.email || "Unknown"
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  // Dynamic icon size based on task width
  const getIconSize = (taskWidth: number) => {
    if (taskWidth < 4) return { size: "w-3 h-3", text: "text-xs" }
    if (taskWidth < 6) return { size: "w-4 h-4", text: "text-xs" }
    return { size: "w-5 h-5", text: "text-xs" }
  }

  // Handle task hover with precise positioning
  const handleTaskHover = (taskId: string, event: React.MouseEvent) => {
    const rect = event.currentTarget.getBoundingClientRect()
    setTooltipPosition({
      x: rect.right + 10,
      y: rect.top + rect.height / 2,
    })
    setHoveredTask(taskId)
  }

  // Generate time markers for the timeline with smart scaling
  const timelineMarkers = useMemo(() => {
    const markers = []

    if (useHourScale) {
      // Hour-based markers
      const totalHours = Math.ceil(totalDuration / (1000 * 60 * 60))
      const interval = Math.max(1, Math.floor(totalHours / 8)) // Show max 8 markers

      for (let i = 0; i <= totalHours; i += interval) {
        const markerTime = new Date(hackathonStartLocal.getTime() + i * 60 * 60 * 1000)
        const position = (i / totalHours) * 100

        if (position <= 100) {
          markers.push({
            time: markerTime,
            position,
            label: markerTime.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            }),
          })
        }
      }
    } else {
      // Day-based markers
      const totalDays = Math.ceil(totalDuration / (1000 * 60 * 60 * 24))
      const interval = Math.max(1, Math.floor(totalDays / 7)) // Show max 7 markers

      for (let i = 0; i <= totalDays; i += interval) {
        const markerTime = new Date(hackathonStartLocal.getTime() + i * 24 * 60 * 60 * 1000)
        const position = (i / totalDays) * 100

        if (position <= 100) {
          markers.push({
            time: markerTime,
            position,
            label: markerTime.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            }),
          })
        }
      }
    }

    return markers
  }, [hackathonStartLocal, totalDuration, useHourScale])

  // Get the hovered task data
  const hoveredTaskData = hoveredTask ? ganttTasks.find((task) => task.id === hoveredTask) : null

  // Tooltip component that renders in a portal
  const TooltipPortal = () => {
    if (!mounted || !hoveredTaskData) return null

    return createPortal(
      <div
        className="fixed bg-gray-900 text-white text-sm rounded-lg px-4 py-3 shadow-2xl border border-gray-700 pointer-events-none min-w-64 max-w-xs transform -translate-y-1/2"
        style={{
          left: `${Math.min(tooltipPosition.x, window.innerWidth - 300)}px`,
          top: `${Math.max(tooltipPosition.y, 50)}px`,
          zIndex: 999999999, // Extremely high z-index
        }}
      >
        <div className="font-bold text-white mb-2">{hoveredTaskData.title}</div>
        {hoveredTaskData.description && (
          <div className="text-gray-300 text-xs mb-2 break-words">{hoveredTaskData.description}</div>
        )}
        <div className="text-gray-300 text-xs space-y-1">
          <div>
            Priority: <span className="font-medium capitalize">{hoveredTaskData.priority}</span>
          </div>
          <div>
            Duration: <span className="font-medium">{hoveredTaskData.estimated_hours}h</span>
          </div>
          <div>
            Assignee: <span className="font-medium">{getAssigneeName(hoveredTaskData.assignee)}</span>
          </div>
          <div>
            Progress: <span className="font-medium">{Math.round(hoveredTaskData.progress)}%</span>
          </div>
          <div className="pt-1 border-t border-gray-700 text-xs">
            {formatTime(hoveredTaskData.start)} → {formatTime(hoveredTaskData.end)}
          </div>
        </div>
        {/* Left-pointing Arrow */}
        <div className="absolute right-full top-1/2 transform -translate-y-1/2 w-0 h-0 border-t-4 border-b-4 border-r-4 border-transparent border-r-gray-900"></div>
      </div>,
      document.body,
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden" ref={chartRef}>
      {/* Compact Header */}
      <div className="bg-gradient-to-r from-slate-50 to-gray-50 border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <BarChart3 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Project Timeline</h3>
              <p className="text-xs text-gray-600">Visual project schedule and task dependencies</p>
            </div>
          </div>

          {/* Controls with Dark Styling */}
          <div className="flex items-center gap-4">
            <Select value={viewMode} onValueChange={(value: "team" | "user") => setViewMode(value)}>
              <SelectTrigger className="w-36 bg-gray-800 border-gray-700 text-white shadow-sm hover:bg-gray-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="team" className="text-white hover:bg-gray-700 focus:bg-gray-700">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Team View
                  </div>
                </SelectItem>
                <SelectItem value="user" className="text-white hover:bg-gray-700 focus:bg-gray-700">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Personal View
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            {viewMode === "user" && (
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger className="w-44 bg-gray-800 border-gray-700 text-white shadow-sm hover:bg-gray-700">
                  <SelectValue placeholder="Select team member" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  {teamMembers.map((member) => (
                    <SelectItem
                      key={member.id}
                      value={member.id}
                      className="text-white hover:bg-gray-700 focus:bg-gray-700"
                    >
                      {member.full_name || member.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <div className="flex items-center gap-3 text-sm text-gray-600">
              <div className="flex items-center gap-1 bg-white rounded px-2 py-1 shadow-sm border">
                <Calendar className="h-3 w-3" />
                <span className="font-medium text-xs">
                  {formatTime(hackathonStartLocal)} - {formatTime(hackathonEndLocal)}
                </span>
              </div>
              <div className="flex items-center gap-1 bg-white rounded px-2 py-1 shadow-sm border">
                <Clock className="h-3 w-3" />
                <span className="font-medium text-xs">
                  {useHourScale ? `${Math.round(totalHours)}h` : `${Math.round(totalDays)}d`}
                </span>
              </div>
              <div className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-semibold border border-blue-200">
                {useHourScale ? "Hourly" : "Daily"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chart Content */}
      <div className="p-4">
        {ganttTasks.length === 0 ? (
          <div className="text-center py-12">
            <div className="p-4 bg-gray-50 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
              <BarChart3 className="h-10 w-10 text-gray-400" />
            </div>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">No Tasks to Display</h4>
            <p className="text-gray-600 mb-4">
              {viewMode === "user"
                ? "No tasks assigned to the selected team member."
                : "Create tasks to see them in the timeline view."}
            </p>
            {viewMode === "user" && (
              <button
                onClick={() => setViewMode("team")}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Users className="h-4 w-4" />
                Switch to Team View
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Timeline Header with Start/End Times */}
            <div className="flex items-center justify-between text-sm font-semibold text-gray-700">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span>Start: {formatStartEndTime(hackathonStartLocal)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span>End: {formatStartEndTime(hackathonEndLocal)}</span>
                <div className="w-2 h-2 bg-red-500 rounded-full" />
              </div>
            </div>

            {/* Chart Area with Overlay Legend */}
            <div className="relative bg-gray-50 rounded-lg p-4 border overflow-visible">
              {/* Overlay Legend - Top Right */}
              <div className="absolute top-4 right-4 z-10 bg-white/95 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg border border-gray-200">
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-red-500 rounded-sm" />
                    <span className="font-medium text-gray-700">High</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-orange-500 rounded-sm" />
                    <span className="font-medium text-gray-700">Medium</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-sm" />
                    <span className="font-medium text-gray-700">Low</span>
                  </div>
                  <div className="w-px h-3 bg-gray-300" />
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-white border border-gray-300 rounded-sm relative">
                      <div className="absolute inset-0 bg-blue-200 rounded-sm" style={{ width: "60%" }} />
                    </div>
                    <span className="font-medium text-gray-700">Progress</span>
                  </div>
                </div>
              </div>

              {/* Y-Axis Label */}
              <div className="absolute -left-2 top-1/2 transform -translate-y-1/2 -rotate-90">
                <div className="flex items-center gap-1 text-sm font-semibold text-gray-700 whitespace-nowrap">
                  <span>Task Sequence</span>
                  <ChevronDown className="h-3 w-3 transform rotate-90" />
                </div>
              </div>

              {/* Task Numbers Column */}
              <div className="absolute left-4 top-4 flex flex-col gap-1">
                {ganttTasks.map((task, index) => (
                  <div key={task.id} className="h-12 flex items-center justify-center w-8">
                    <div className="w-6 h-6 bg-white rounded-full border-2 border-gray-300 flex items-center justify-center text-xs font-bold text-gray-700 shadow-sm">
                      {index + 1}
                    </div>
                  </div>
                ))}
              </div>

              {/* Chart Grid and Tasks */}
              <div className="ml-16 relative">
                {/* Grid Background */}
                <div className="absolute inset-0 pointer-events-none">
                  {timelineMarkers.map((marker, index) => (
                    <div
                      key={index}
                      className="absolute top-0 bottom-0 w-px bg-gray-200"
                      style={{ left: `${marker.position}%` }}
                    />
                  ))}
                </div>

                {/* Task Bars - Better Spacing and Sizing */}
                <div className="space-y-1 relative">
                  {ganttTasks.map((task, index) => {
                    const colors = getPriorityColor(task.priority)
                    const taskWidth = getTaskWidth(task)
                    const taskLeft = getTaskLeft(task)
                    const iconConfig = getIconSize(taskWidth)

                    return (
                      <div key={task.id} className="relative h-12 flex items-center">
                        <div
                          className={`relative h-8 rounded-md border cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-lg ${colors.bg} ${colors.border} ${colors.hover} shadow-sm`}
                          style={{
                            left: `${taskLeft}%`,
                            width: `${taskWidth}%`,
                          }}
                          onMouseEnter={(e) => handleTaskHover(task.id, e)}
                          onMouseLeave={() => setHoveredTask(null)}
                        >
                          {/* Progress Overlay */}
                          <div
                            className="absolute top-0 left-0 h-full bg-black bg-opacity-20 rounded-md"
                            style={{ width: `${task.progress}%` }}
                          />

                          {/* User Icon/Initials - Always show, adaptive size */}
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div
                              className={`${iconConfig.size} bg-white bg-opacity-90 rounded-full flex items-center justify-center ${iconConfig.text} font-bold text-gray-800 shadow-sm`}
                            >
                              {getAssigneeInitials(task.assignee)}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Timeline Footer */}
            <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
              <div className="relative h-8 bg-gradient-to-r from-gray-50 to-gray-100 rounded border overflow-hidden">
                {timelineMarkers.map((marker, index) => (
                  <div
                    key={index}
                    className="absolute top-0 h-full flex flex-col justify-between"
                    style={{ left: `${marker.position}%` }}
                  >
                    <div className="w-px h-2 bg-gray-400" />
                    <div className="absolute top-2 left-1 text-xs font-medium text-gray-600 whitespace-nowrap transform -translate-x-1/2">
                      {marker.label}
                    </div>
                    <div className="w-px h-2 bg-gray-400" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Portal-based Tooltip */}
      <TooltipPortal />
    </div>
  )
}
