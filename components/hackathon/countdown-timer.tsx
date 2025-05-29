"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Clock, Play, Square } from "lucide-react"

interface CountdownTimerProps {
  startTime: string
  endTime: string
}

export function CountdownTimer({ startTime, endTime }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number
    hours: number
    minutes: number
    seconds: number
    status: "upcoming" | "active" | "completed"
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, status: "upcoming" })

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date().getTime()
      const start = new Date(startTime).getTime()
      const end = new Date(endTime).getTime()

      let targetTime: number
      let status: "upcoming" | "active" | "completed"

      if (now < start) {
        targetTime = start
        status = "upcoming"
      } else if (now < end) {
        targetTime = end
        status = "active"
      } else {
        status = "completed"
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, status })
        return
      }

      const difference = targetTime - now

      const days = Math.floor(difference / (1000 * 60 * 60 * 24))
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((difference % (1000 * 60)) / 1000)

      setTimeLeft({ days, hours, minutes, seconds, status })
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)

    return () => clearInterval(interval)
  }, [startTime, endTime])

  const getStatusInfo = () => {
    switch (timeLeft.status) {
      case "upcoming":
        return {
          title: "Hackathon Starts In",
          icon: <Clock className="h-6 w-6" />,
          color: "text-neon-purple",
          bgColor: "bg-neon-purple/20",
        }
      case "active":
        return {
          title: "Time Remaining",
          icon: <Play className="h-6 w-6" />,
          color: "text-electric-green",
          bgColor: "bg-electric-green/20",
        }
      case "completed":
        return {
          title: "Hackathon Completed",
          icon: <Square className="h-6 w-6" />,
          color: "text-muted-foreground",
          bgColor: "bg-muted/20",
        }
    }
  }

  const statusInfo = getStatusInfo()

  return (
    <Card className="border-glow bg-dark-surface/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className={`text-2xl text-glow flex items-center gap-2 ${statusInfo.color}`}>
          {statusInfo.icon}
          {statusInfo.title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {timeLeft.status === "completed" ? (
          <div className="text-center py-8">
            <p className="text-2xl font-bold text-muted-foreground">Great job! Time to present your project! 🎉</p>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: "Days", value: timeLeft.days },
              { label: "Hours", value: timeLeft.hours },
              { label: "Minutes", value: timeLeft.minutes },
              { label: "Seconds", value: timeLeft.seconds },
            ].map((item) => (
              <div
                key={item.label}
                className={`text-center p-4 rounded-lg ${statusInfo.bgColor} border border-current/20`}
              >
                <div className={`text-3xl font-bold ${statusInfo.color} text-glow`}>
                  {item.value.toString().padStart(2, "0")}
                </div>
                <div className="text-sm text-muted-foreground mt-1">{item.label}</div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
