"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { generateChatResponse, generateQuickSuggestions } from "@/app/actions/ai-actions"
import { MessageCircle, Send, Loader2, Bot, User, Lightbulb, Minimize2 } from "lucide-react"

export interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

interface AIChatProps {
  hackathon: any
  tasks: any[]
  teamMembers: any[]
}

export function AIChat({ hackathon, tasks, teamMembers }: AIChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputMessage, setInputMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [quickSuggestions, setQuickSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(true)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Add welcome message
    const welcomeMessage: ChatMessage = {
      id: "welcome",
      role: "assistant",
      content: `Hi! I'm your AI hackathon mentor. I'm here to help you with technical questions, project management, team coordination, and anything else you need for "${hackathon.title}". What can I help you with?`,
      timestamp: new Date(),
    }
    setMessages([welcomeMessage])

    // Load quick suggestions
    loadQuickSuggestions()
  }, [])

  useEffect(() => {
    // Scroll to bottom when new messages are added
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages])

  const loadQuickSuggestions = async () => {
    const now = new Date()
    const endTime = new Date(hackathon.end_time)
    const timeRemaining = Math.max(0, Math.floor((endTime.getTime() - now.getTime()) / (1000 * 60 * 60)))

    try {
      const result = await generateQuickSuggestions(hackathon, tasks, timeRemaining)
      if (result.success) {
        setQuickSuggestions(result.suggestions)
      }
    } catch (error) {
      console.error("Error loading suggestions:", error)
    }
  }

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: content.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputMessage("")
    setIsLoading(true)
    setShowSuggestions(false)

    try {
      const result = await generateChatResponse(content.trim(), hackathon, tasks, teamMembers, messages)

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: result.success ? result.response : "I'm sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      console.error("Error sending message:", error)
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "I'm sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(inputMessage)
  }

  const handleSuggestionClick = (suggestion: string) => {
    sendMessage(suggestion)
  }

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsMinimized(false)}
          className="bg-electric-blue hover:bg-electric-blue/80 text-dark-bg rounded-full h-12 w-12 shadow-lg glow-effect"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      </div>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 max-w-[calc(100vw-2rem)]">
      <Card className="border-glow bg-dark-surface/95 backdrop-blur-sm shadow-2xl">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg text-glow flex items-center gap-2">
              <Bot className="h-5 w-5 text-electric-blue" />
              AI Mentor
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-electric-green/30 text-electric-green text-xs">
                Online
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMinimized(true)}
                className="h-8 w-8 p-0 hover:bg-dark-bg"
              >
                <Minimize2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {/* Messages */}
          <ScrollArea className="h-80 px-4" ref={scrollAreaRef}>
            <div className="space-y-4 pb-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {message.role === "assistant" && (
                    <div className="flex-shrink-0">
                      <div className="h-8 w-8 rounded-full bg-electric-blue/20 flex items-center justify-center">
                        <Bot className="h-4 w-4 text-electric-blue" />
                      </div>
                    </div>
                  )}

                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                      message.role === "user" ? "bg-electric-blue text-dark-bg" : "bg-dark-bg border border-dark-border"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    <p
                      className={`text-xs mt-1 opacity-70 ${
                        message.role === "user" ? "text-dark-bg/70" : "text-muted-foreground"
                      }`}
                    >
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>

                  {message.role === "user" && (
                    <div className="flex-shrink-0">
                      <div className="h-8 w-8 rounded-full bg-neon-purple/20 flex items-center justify-center">
                        <User className="h-4 w-4 text-neon-purple" />
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-3 justify-start">
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 rounded-full bg-electric-blue/20 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-electric-blue" />
                    </div>
                  </div>
                  <div className="bg-dark-bg border border-dark-border rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-electric-blue" />
                      <span className="text-sm text-muted-foreground">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Quick Suggestions */}
          {showSuggestions && quickSuggestions.length > 0 && (
            <div className="px-4 py-3 border-t border-dark-border">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="h-4 w-4 text-electric-blue" />
                <span className="text-xs text-muted-foreground">Quick questions:</span>
              </div>
              <div className="space-y-2">
                {quickSuggestions.map((suggestion, index) => (
                  <Button
                    key={index}
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="w-full text-left justify-start h-auto p-2 text-xs hover:bg-dark-bg border border-dark-border"
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-4 border-t border-dark-border">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input
                ref={inputRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Ask me anything about your hackathon..."
                disabled={isLoading}
                className="bg-dark-bg border-dark-border focus:border-electric-blue text-sm"
              />
              <Button
                type="submit"
                disabled={isLoading || !inputMessage.trim()}
                size="sm"
                className="bg-electric-blue hover:bg-electric-blue/80 text-dark-bg px-3"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
