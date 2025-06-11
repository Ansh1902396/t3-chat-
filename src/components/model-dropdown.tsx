"use client"
import { Button } from "~/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "~/components/ui/dropdown-menu"
import { Badge } from "~/components/ui/badge"
import { ChevronDown, Eye, FileText, Info, Crown, Sparkles } from "lucide-react"
import { useState } from "react"

// Static model data for UI - this could be moved to a config file
const staticModels = [
  {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    icon: "⚡",
    features: ["eye", "link", "file"],
    available: true,
    premium: false,
    description: "Fast and efficient responses",
    provider: "google" as const,
  },
  {
    id: "gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    icon: "⚡",
    features: ["eye", "link", "file", "info"],
    available: false,
    premium: true,
    description: "Advanced reasoning capabilities",
    provider: "google" as const,
  },
  {
    id: "gpt-4",
    name: "GPT-4",
    icon: "🤖",
    features: ["eye", "link", "file", "info"],
    available: true,
    premium: false,
    description: "Most capable GPT model",
    provider: "openai" as const,
  },
  {
    id: "gpt-imagegen",
    name: "GPT ImageGen",
    icon: "🎨",
    features: ["eye"],
    available: true,
    premium: false,
    description: "AI-powered image generation",
    provider: "openai" as const,
  },
  {
    id: "o4-mini",
    name: "GPT-4o Mini",
    icon: "🔷",
    features: ["eye", "info"],
    available: true,
    premium: false,
    description: "Compact and efficient model",
    provider: "openai" as const,
  },
  {
    id: "claude-4-sonnet",
    name: "Claude 4 Sonnet",
    icon: "🤖",
    features: ["eye", "file"],
    available: true,
    premium: false,
    description: "Balanced performance and accuracy",
    provider: "anthropic" as const,
  },
  {
    id: "claude-4-sonnet-reasoning",
    name: "Claude 4 Sonnet (Reasoning)",
    icon: "🤖",
    features: ["eye", "file", "info"],
    available: false,
    premium: true,
    description: "Enhanced logical reasoning",
    provider: "anthropic" as const,
  },
  {
    id: "deepseek-r1",
    name: "DeepSeek R1 (Llama Distilled)",
    icon: "🔍",
    features: ["info"],
    available: false,
    premium: true,
    description: "Research-focused model",
    provider: "openai" as const,
  },
]

interface ModelDropdownProps {
  selectedModel: string
  onModelChange: (modelId: string) => void
  availableModels?: Array<{
    id: string
    name: string
    provider: string
    available: boolean
  }>
}

export function ModelDropdown({ selectedModel, onModelChange, availableModels }: ModelDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  
  // Merge static model data with available models from the API
  const mergedModels = staticModels.map(staticModel => {
    const availableModel = availableModels?.find(am => am.id === staticModel.id)
    return {
      ...staticModel,
      available: availableModel?.available ?? staticModel.available
    }
  })

  const currentModel = mergedModels.find((m) => m.id === selectedModel) || mergedModels[0]!

  const handleModelSelect = (modelId: string, available: boolean) => {
    if (!available) return
    onModelChange(modelId)
    setIsOpen(false)
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-10 px-4 text-sm font-semibold text-foreground hover:text-foreground 
                   hover:bg-gradient-to-r hover:from-muted/40 hover:to-muted/20 transition-all duration-200 group rounded-full"
        >
          <span className="mr-2 text-base">{currentModel.icon}</span>
          {currentModel.name}
          <ChevronDown className={`ml-2 h-3 w-3 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-[420px] p-0 animate-scale-in border-border/50 shadow-2xl card-t3 rounded-3xl"
      >
        {/* Premium Banner */}
        <div className="p-6 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-b border-border/30 rounded-t-3xl">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <h4 className="font-bold text-base tracking-tight">Unlock all models + higher limits</h4>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black gradient-text-t3">$8</span>
                <span className="text-sm text-muted-foreground font-semibold">/month</span>
              </div>
            </div>
            <Button className="bg-gradient-to-r from-primary via-primary to-primary/80 hover:from-primary/90 hover:via-primary/90 hover:to-primary/70 text-white font-bold tracking-wide shadow-lg rounded-full px-6 hover:scale-[1.02] transition-all">
              <Crown className="mr-2 h-4 w-4" />
              Upgrade now
            </Button>
          </div>
        </div>

        {/* Model List */}
        <div className="p-3 max-h-80 overflow-y-auto custom-scrollbar">
          {mergedModels.map((model, index) => (
            <DropdownMenuItem
              key={model.id}
              className={`flex items-center justify-between p-4 cursor-pointer rounded-2xl m-1
                       transition-all duration-200 animate-slide-in ${
                         !model.available
                           ? "opacity-40 cursor-not-allowed"
                           : "hover:bg-gradient-to-r hover:from-muted/40 hover:to-muted/20"
                       } ${
                         selectedModel === model.id
                           ? "bg-gradient-to-r from-muted/60 to-muted/40 shadow-sm border border-border/50"
                           : ""
                       }`}
              onClick={() => handleModelSelect(model.id, model.available)}
              disabled={!model.available}
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="flex items-center gap-4 flex-1">
                <span className="text-xl">{model.icon}</span>
                <div className="flex flex-col items-start min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm tracking-tight truncate">{model.name}</span>
                    {!model.available && (
                      <Badge
                        variant="secondary"
                        className="text-xs px-2 py-1 bg-gradient-to-r from-primary/20 to-primary/10 text-primary border-primary/20 rounded-full font-bold"
                      >
                        <Crown className="mr-1 h-2.5 w-2.5" />
                        Pro
                      </Badge>
                    )}
                    {selectedModel === model.id && (
                      <Badge
                        variant="default"
                        className="text-xs px-2 py-1 bg-primary/20 text-primary border-primary/20 rounded-full font-bold"
                      >
                        Active
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground font-medium">{model.description}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-3">
                {model.features.includes("eye") && (
                  <div className="p-1.5 rounded-full bg-gradient-to-br from-muted/40 to-muted/20">
                    <Eye className="h-3 w-3 text-muted-foreground" />
                  </div>
                )}
                {model.features.includes("link") && (
                  <div className="p-1.5 rounded-full bg-gradient-to-br from-muted/40 to-muted/20">
                    <div className="h-3 w-3 rounded-full border border-muted-foreground" />
                  </div>
                )}
                {model.features.includes("file") && (
                  <div className="p-1.5 rounded-full bg-gradient-to-br from-muted/40 to-muted/20">
                    <FileText className="h-3 w-3 text-muted-foreground" />
                  </div>
                )}
                {model.features.includes("info") && (
                  <div className="p-1.5 rounded-full bg-gradient-to-br from-muted/40 to-muted/20">
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </div>
                )}
              </div>
            </DropdownMenuItem>
          ))}
        </div>

        {/* Show All Button */}
        <div className="p-4 border-t border-border/30 bg-gradient-to-r from-muted/10 to-transparent rounded-b-3xl">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              className="text-sm font-semibold text-muted-foreground hover:text-foreground rounded-full hover:bg-gradient-to-r hover:from-muted/30 hover:to-muted/20"
            >
              Show all
              <ChevronDown className="ml-1 h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full hover:bg-gradient-to-r hover:from-muted/30 hover:to-muted/20"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                />
              </svg>
            </Button>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
