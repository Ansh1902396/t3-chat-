"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { Sidebar } from "./sidebar"
import { ModelDropdown } from "./model-dropdown"
import { ThemeToggle } from "./theme-toggle"
import { Menu, Sparkles, Search, Code, GraduationCap, Paperclip, ArrowUp } from "lucide-react"

interface User {
  id: string
  name: string
  email: string
  avatar: string
  plan: string
  credits: number
}

interface ChatInterfaceProps {
  user: User | null
  onLogout: () => void
}

const categoryButtons = [
  {
    icon: Sparkles,
    label: "Create",
    description: "Generate creative content",
    color: "from-blue-500/10 to-blue-600/10 border-blue-500/20",
  },
  {
    icon: Search,
    label: "Explore",
    description: "Research and discover",
    color: "from-green-500/10 to-green-600/10 border-green-500/20",
  },
  {
    icon: Code,
    label: "Code",
    description: "Programming assistance",
    color: "from-purple-500/10 to-purple-600/10 border-purple-500/20",
  },
  {
    icon: GraduationCap,
    label: "Learn",
    description: "Educational content",
    color: "from-orange-500/10 to-orange-600/10 border-orange-500/20",
  },
]

const sampleQuestions = [
  "How does AI work?",
  "Are black holes real?",
  'How many Rs are in the word "strawberry"?',
  "What is the meaning of life?",
]

export function ChatInterface({ user, onLogout }: ChatInterfaceProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [message, setMessage] = useState("")
  const [selectedModel, setSelectedModel] = useState("gemini-2.5-flash")
  const [isTyping, setIsTyping] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && !e.ctrlKey && !e.metaKey && e.target !== inputRef.current) {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [])

  const handleSendMessage = () => {
    if (!message.trim()) return
    setIsTyping(true)
    setTimeout(() => setIsTyping(false), 2000)
    setMessage("")
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        user={user}
        onLogout={onLogout}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Mobile Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/50 lg:hidden bg-background/80 backdrop-blur-xl">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
            className="hover:bg-muted/40 transition-colors rounded-full"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="font-bold tracking-tight text-lg">T3.chat</h1>
          <ThemeToggle />
        </div>

        {/* Desktop Header */}
        <div className="hidden lg:flex items-center justify-end p-6 bg-background/50 backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all rounded-full"
            >
              <span className="text-sm font-bold">$</span>
            </Button>
            <ThemeToggle />
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 max-w-6xl mx-auto w-full">
          <div className="text-center mb-12 w-full animate-fade-in">
            <h1 className="text-6xl font-black mb-4 text-balance tracking-tight bg-gradient-to-br from-foreground via-foreground to-muted-foreground bg-clip-text text-transparent">
              How can I help you{user ? `, ${user.name.split(" ")[0]}` : ""}?
            </h1>

            {/* Category Buttons */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 justify-center mb-16 max-w-4xl mx-auto">
              {categoryButtons.map((category, index) => (
                <Button
                  key={category.label}
                  variant="outline"
                  className={`flex flex-col items-center gap-4 h-auto p-8 bg-gradient-to-br ${category.color}
                           hover:bg-muted/40 hover:border-border transition-all duration-300 
                           card-t3 group animate-fade-in rounded-3xl border-2`}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <category.icon className="h-8 w-8 text-muted-foreground group-hover:text-foreground transition-colors" />
                  <div className="text-center">
                    <div className="font-bold text-base tracking-tight mb-1">{category.label}</div>
                    <div className="text-sm text-muted-foreground font-medium">{category.description}</div>
                  </div>
                </Button>
              ))}
            </div>

            {/* Sample Questions */}
            <div className="space-y-4 max-w-2xl mx-auto mb-12">
              {sampleQuestions.map((question, index) => (
                <Button
                  key={index}
                  variant="ghost"
                  className="w-full text-left justify-start h-auto p-6 text-muted-foreground 
                           hover:text-foreground hover:bg-muted/30 rounded-2xl transition-all duration-200 
                           animate-fade-in group border border-transparent hover:border-border/50"
                  onClick={() => setMessage(question)}
                  style={{ animationDelay: `${(index + 4) * 0.1}s` }}
                >
                  <span className="font-semibold text-base">{question}</span>
                  <ArrowUp className="ml-auto h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity rotate-45" />
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-8 border-t border-border/30 bg-background/80 backdrop-blur-xl">
          <div className="max-w-5xl mx-auto">
            <div className="text-center text-sm text-muted-foreground mb-8 font-semibold">
              Make sure you agree to our{" "}
              <Button
                variant="link"
                className="p-0 h-auto text-sm text-muted-foreground hover:text-foreground 
                         underline underline-offset-4 font-semibold transition-colors"
              >
                Terms
              </Button>{" "}
              and our{" "}
              <Button
                variant="link"
                className="p-0 h-auto text-sm text-muted-foreground hover:text-foreground 
                         underline underline-offset-4 font-semibold transition-colors"
              >
                Privacy Policy
              </Button>
            </div>

            {/* Message Input */}
            <div className="relative card-t3 rounded-3xl border-2 border-border/50 shadow-xl">
              <div className="flex items-center p-5 gap-4">
                <ModelDropdown selectedModel={selectedModel} onModelChange={setSelectedModel} />

                <div className="h-8 w-px bg-border/50" />

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all rounded-full"
                >
                  <Search className="h-4 w-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all rounded-full"
                >
                  <Paperclip className="h-4 w-4" />
                </Button>

                <div className="flex-1 relative">
                  <Input
                    ref={inputRef}
                    placeholder="Type your message here..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 
                             placeholder:text-muted-foreground/60 text-base font-medium pr-16 py-3"
                  />
                  {isTyping && (
                    <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                      <div className="flex space-x-1">
                        {[0, 1, 2].map((i) => (
                          <div
                            key={i}
                            className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-pulse"
                            style={{ animationDelay: `${i * 0.2}s` }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <Button
                  size="icon"
                  onClick={handleSendMessage}
                  disabled={!message.trim() || isTyping}
                  className="h-10 w-10 btn-t3-primary text-white rounded-full shadow-lg disabled:opacity-50 
                           disabled:cursor-not-allowed transition-all duration-200"
                >
                  {isTyping ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  ) : (
                    <ArrowUp className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
