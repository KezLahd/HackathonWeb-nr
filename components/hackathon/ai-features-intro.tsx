"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { X, MessageCircle, Brain, Bell, Sparkles } from "lucide-react"

interface AIFeaturesIntroProps {
  onClose: () => void
}

export function AIFeaturesIntro({ onClose }: AIFeaturesIntroProps) {
  const [currentStep, setCurrentStep] = useState(0)

  const features = [
    {
      icon: <MessageCircle className="h-8 w-8 text-electric-blue" />,
      title: "AI Chat Assistant",
      description:
        "Get instant help with technical questions, project management, and team coordination. Your personal hackathon mentor is always available!",
      location: "Bottom right corner",
    },
    {
      icon: <Brain className="h-8 w-8 text-neon-purple" />,
      title: "Smart Insights",
      description:
        "AI analyzes your progress and provides actionable recommendations to optimize your workflow and increase success chances.",
      location: "Right sidebar",
    },
    {
      icon: <Sparkles className="h-8 w-8 text-electric-green" />,
      title: "Task Suggestions",
      description:
        "Get AI-powered task recommendations based on your project theme, current progress, and remaining time.",
      location: "Right sidebar",
    },
    {
      icon: <Bell className="h-8 w-8 text-yellow-400" />,
      title: "Smart Notifications",
      description:
        "Receive intelligent alerts about deadlines, task priorities, and important milestones throughout your hackathon.",
      location: "Top right corner",
    },
  ]

  const nextStep = () => {
    if (currentStep < features.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      onClose()
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-glow bg-dark-surface/95 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-6 w-6 text-electric-blue" />
              <CardTitle className="text-xl text-glow text-electric-blue">AI Features</CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-electric-blue/30 text-electric-blue">
              {currentStep + 1} of {features.length}
            </Badge>
            <div className="flex gap-1">
              {features.map((_, index) => (
                <div
                  key={index}
                  className={`h-2 w-2 rounded-full ${index === currentStep ? "bg-electric-blue" : "bg-dark-border"}`}
                />
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="text-center">
            <div className="flex justify-center mb-4">{features[currentStep].icon}</div>
            <h3 className="text-lg font-semibold text-glow mb-2">{features[currentStep].title}</h3>
            <p className="text-muted-foreground text-sm mb-4">{features[currentStep].description}</p>
            <Badge variant="outline" className="border-neon-purple/30 text-neon-purple">
              📍 {features[currentStep].location}
            </Badge>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 0}
              className="flex-1 border-dark-border hover:bg-dark-surface"
            >
              Previous
            </Button>
            <Button onClick={nextStep} className="flex-1 bg-electric-blue hover:bg-electric-blue/80 text-dark-bg">
              {currentStep === features.length - 1 ? "Get Started" : "Next"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
