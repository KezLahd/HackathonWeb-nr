"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, Users, ArrowRight } from "lucide-react"
import { useRouter } from "next/navigation"
import { AIDescriptionSummarizer } from "./ai-description-summarizer"

interface Hackathon {
  id: string
  title: string
  description: string
  theme: string
  start_time: string
  end_time: string
  team_size: number
}

interface HackathonCardProps {
  hackathon: Hackathon
  onUpdate: () => void
}

export function HackathonCard({ hackathon, onUpdate }: HackathonCardProps) {
  const router = useRouter()

  const startTime = new Date(hackathon.start_time)
  const endTime = new Date(hackathon.end_time)
  const now = new Date()

  const isActive = now >= startTime && now <= endTime
  const isUpcoming = now < startTime
  const isCompleted = now > endTime

  const getStatusBadge = () => {
    if (isActive) {
      return <Badge className="bg-electric-green text-dark-bg px-3 py-1 text-sm">Live</Badge>
    } else if (isUpcoming) {
      return <Badge className="bg-neon-purple text-white px-3 py-1 text-sm">Upcoming</Badge>
    } else {
      return (
        <Badge variant="secondary" className="px-3 py-1 text-sm">
          Completed
        </Badge>
      )
    }
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <Card className="border-glow bg-dark-surface/80 backdrop-blur-sm hover:bg-dark-surface/90 transition-all duration-300 group">
      <CardHeader className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-xl text-glow group-hover:text-electric-blue transition-colors mb-2">
              {hackathon.title}
            </CardTitle>
            <div className="mt-2">
              <AIDescriptionSummarizer description={hackathon.description} maxLength={120} />
            </div>
          </div>
          {getStatusBadge()}
        </div>
        <Badge variant="outline" className="w-fit border-electric-blue text-electric-blue mt-3 px-3 py-1 text-sm">
          {hackathon.theme}
        </Badge>
      </CardHeader>

      <CardContent className="p-6 pt-0">
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-base text-muted-foreground">
            <Calendar className="h-5 w-5" />
            <span>
              {formatDate(startTime)} - {formatDate(endTime)}
            </span>
          </div>

          <div className="flex items-center gap-3 text-base text-muted-foreground">
            <Clock className="h-5 w-5" />
            <span>{Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60))} hours</span>
          </div>

          <div className="flex items-center gap-3 text-base text-muted-foreground">
            <Users className="h-5 w-5" />
            <span>Team of {hackathon.team_size}</span>
          </div>
        </div>

        <Button
          onClick={() => router.push(`/hackathon/${hackathon.id}`)}
          className="w-full mt-6 bg-electric-blue hover:bg-electric-blue/80 text-dark-bg font-semibold group py-3 text-base"
        >
          Open Project
          <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
        </Button>
      </CardContent>
    </Card>
  )
}
