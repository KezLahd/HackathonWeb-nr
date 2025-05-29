"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { analyzeProjectProgress } from "@/app/actions/ai-actions"
import { Brain, Lightbulb, AlertTriangle, Trophy, TrendingUp, Loader2, Sparkles } from "lucide-react"

interface AIInsightsProps {
  hackathon: any
  tasks: any[]
  teamMembers: any[]
  timeRemaining: number
}

export function AIInsights({ hackathon, tasks, teamMembers, timeRemaining }: AIInsightsProps) {
  const [insights, setInsights] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [lastAnalyzed, setLastAnalyzed] = useState<Date | null>(null)

  const analyzeProgress = async () => {
    setLoading(true)
    try {
      const result = await analyzeProjectProgress(tasks, teamMembers.length, timeRemaining, hackathon.theme)
      if (result.success) {
        setInsights(result.analysis)
        setLastAnalyzed(new Date())
      } else {
        console.error("Analysis failed:", result.error)
      }
    } catch (error) {
      console.error("Error analyzing progress:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Auto-analyze when component mounts or when significant changes occur
    if (tasks.length > 0 && !lastAnalyzed) {
      analyzeProgress()
    }
  }, [tasks.length])

  const getInsightIcon = (type: string) => {
    switch (type) {
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-400" />
      case "suggestion":
        return <Lightbulb className="h-4 w-4 text-electric-blue" />
      case "achievement":
        return <Trophy className="h-4 w-4 text-electric-green" />
      case "tip":
        return <TrendingUp className="h-4 w-4 text-neon-purple" />
      default:
        return <Brain className="h-4 w-4 text-electric-blue" />
    }
  }

  const getInsightColor = (type: string) => {
    switch (type) {
      case "warning":
        return "border-yellow-500/30 bg-yellow-500/10"
      case "suggestion":
        return "border-electric-blue/30 bg-electric-blue/10"
      case "achievement":
        return "border-electric-green/30 bg-electric-green/10"
      case "tip":
        return "border-neon-purple/30 bg-neon-purple/10"
      default:
        return "border-electric-blue/30 bg-electric-blue/10"
    }
  }

  return (
    <Card className="border-glow bg-dark-surface/80 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-glow flex items-center gap-2">
            <Brain className="h-5 w-5 text-electric-blue" />
            AI Insights
          </CardTitle>
          <Button
            onClick={analyzeProgress}
            disabled={loading}
            size="sm"
            className="bg-electric-blue hover:bg-electric-blue/80 text-dark-bg"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          </Button>
        </div>
        {lastAnalyzed && (
          <p className="text-xs text-muted-foreground">Last analyzed: {lastAnalyzed.toLocaleTimeString()}</p>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-dark-bg rounded-lg"></div>
              </div>
            ))}
          </div>
        ) : insights ? (
          <>
            {/* Overall Progress Score */}
            <div className="p-4 rounded-lg border border-electric-blue/30 bg-electric-blue/10">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-electric-blue">Progress Score</h4>
                <Badge className="bg-electric-blue text-dark-bg font-bold">{insights.overallProgress.score}/100</Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-3">{insights.overallProgress.summary}</p>

              {/* Progress Bar */}
              <div className="w-full bg-dark-bg rounded-full h-2 mb-3">
                <div
                  className="bg-electric-blue h-2 rounded-full transition-all duration-500 glow-effect"
                  style={{ width: `${insights.overallProgress.score}%` }}
                />
              </div>

              {/* Recommendations */}
              {insights.overallProgress.recommendations.length > 0 && (
                <div className="space-y-1">
                  <h5 className="text-xs font-medium text-electric-blue">Key Recommendations:</h5>
                  {insights.overallProgress.recommendations.map((rec: string, index: number) => (
                    <p key={index} className="text-xs text-muted-foreground">
                      • {rec}
                    </p>
                  ))}
                </div>
              )}
            </div>

            {/* Individual Insights */}
            <div className="space-y-3">
              {insights.insights.map((insight: any, index: number) => (
                <div key={index} className={`p-3 rounded-lg border ${getInsightColor(insight.type)}`}>
                  <div className="flex items-start gap-3">
                    {getInsightIcon(insight.type)}
                    <div className="flex-1">
                      <h4 className="font-medium text-sm mb-1">{insight.title}</h4>
                      <p className="text-xs text-muted-foreground">{insight.description}</p>
                      {insight.actionable && (
                        <Badge variant="outline" className="mt-2 text-xs border-electric-blue/30 text-electric-blue">
                          Actionable
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-6">
            <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground text-sm mb-3">Get AI-powered insights about your project progress</p>
            <Button onClick={analyzeProgress} className="bg-electric-blue hover:bg-electric-blue/80 text-dark-bg">
              <Sparkles className="h-4 w-4 mr-2" />
              Analyze Progress
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
