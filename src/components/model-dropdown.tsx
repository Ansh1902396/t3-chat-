"use client"
import { Button } from "~/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "~/components/ui/dropdown-menu"
import { Badge } from "~/components/ui/badge"
import { ChevronDown, Eye, FileText, Info, Crown, Sparkles, Loader2, Zap, Star, Image } from "lucide-react"
import { useState } from "react"
import { getModelCost, getModelTier } from "~/lib/model-costs"

// Helper function to get model display info
const getModelDisplayInfo = (modelId: string, modelName: string) => {
  // Determine icon based on model name/id
  let icon = "🤖"; // default
  if (modelId.includes("gemini") || modelName.toLowerCase().includes("gemini")) {
    icon = "⚡";
  } else if (modelId.includes("gpt") || modelName.toLowerCase().includes("gpt")) {
    icon = "🤖";
  } else if (modelId.includes("claude") || modelName.toLowerCase().includes("claude")) {
    icon = "🤖";
  } else if (modelId.includes("deepseek") || modelName.toLowerCase().includes("deepseek")) {
    icon = "🔍";
  } else if (modelName.toLowerCase().includes("image")) {
    icon = "🎨";
  }

  // Determine features based on model capabilities (simplified for now)
  const features = ["eye", "file"]; // Basic features for all models
  if (modelName.toLowerCase().includes("pro") || modelName.toLowerCase().includes("reasoning")) {
    features.push("info");
  }
  if (!modelName.toLowerCase().includes("image")) {
    features.push("link");
  }

  // Get cost and tier information
  const cost = getModelCost(modelId);
  const tier = getModelTier(modelId);

  return { icon, features, cost, tier };
};

interface ModelDropdownProps {
  selectedModel: string
  onModelChange: (modelId: string) => void
  availableModels?: Array<{
    id: string
    name: string
    provider: string
    available: boolean
  }>
  isLoading?: boolean
  userCredits?: number
}

export function ModelDropdown({ selectedModel, onModelChange, availableModels, isLoading, userCredits = 0 }: ModelDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  
  // If we have available models, use them; otherwise show loading or empty state
  const models = availableModels?.map(model => {
    const displayInfo = getModelDisplayInfo(model.id, model.name);
    const canAfford = userCredits >= displayInfo.cost;
    return {
      ...model,
      ...displayInfo,
      description: `${model.provider} model - ${model.name}`,
      premium: false, // For now, assume all API models are available (can be enhanced later)
      available: model.available && canAfford, // Model is available if API says so AND user can afford it
      canAfford,
    };
  }) || [];

  const currentModel = models.find((m) => m.id === selectedModel) || models[0];

  const handleModelSelect = (modelId: string, available: boolean) => {
    if (!available) return
    onModelChange(modelId)
    setIsOpen(false)
  }

  // Handle loading state
  if (isLoading) {
    return (
      <Button
        variant="ghost"
        disabled
        className="h-10 px-4 text-sm font-semibold text-muted-foreground rounded-full"
      >
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading models...
      </Button>
    );
  }

  // Handle empty state
  if (!models.length) {
    return (
      <Button
        variant="ghost"
        disabled
        className="h-10 px-4 text-sm font-semibold text-muted-foreground rounded-full"
      >
        <span className="mr-2 text-base">❌</span>
        No models available
      </Button>
    );
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-10 px-4 text-sm font-semibold text-foreground hover:text-foreground 
                   hover:bg-gradient-to-r hover:from-muted/40 hover:to-muted/20 transition-smooth group rounded-full hover-lift"
        >
          <span className="mr-2 text-base">{currentModel?.icon || "🤖"}</span>
          {currentModel?.name || "Select Model"}
          {currentModel && (
            <Badge variant="outline" className="ml-2 text-xs">
              {currentModel.cost} {currentModel.cost === 1 ? 'credit' : 'credits'}
            </Badge>
          )}
          <ChevronDown className={`ml-2 h-3 w-3 transition-smooth ${isOpen ? "rotate-180" : ""}`} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-[420px] p-0 animate-fade-in-up border-border/50 shadow-2xl card-t3 rounded-3xl"
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
        <div className="p-3 max-h-80 overflow-y-auto scrollbar-dropdown">
          {models.map((model, index) => (
            <DropdownMenuItem
              key={model.id}
              className={`flex items-center justify-between p-4 cursor-pointer rounded-2xl m-1
                       transition-smooth animate-fade-in-right hover-lift ${
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
                    
                    {/* Credit cost badge */}
                    <Badge
                      variant="outline"
                      className={`text-xs px-2 py-1 rounded-full font-bold transition-smooth ${
                        model.tier === 'image' 
                          ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-300'
                          : model.tier === 'high'
                          ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-300'
                          : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300'
                      }`}
                    >
                      {model.tier === 'image' && <Image className="mr-1 h-2.5 w-2.5" />}
                      {model.tier === 'high' && <Star className="mr-1 h-2.5 w-2.5" />}
                      {model.tier === 'low' && <Zap className="mr-1 h-2.5 w-2.5" />}
                      {model.cost} {model.cost === 1 ? 'credit' : 'credits'}
                    </Badge>

                    {!model.canAfford && (
                      <Badge
                        variant="secondary"
                        className="text-xs px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300 rounded-full font-bold"
                      >
                        Insufficient credits
                      </Badge>
                    )}

                    {selectedModel === model.id && (
                      <Badge
                        variant="default"
                        className="text-xs px-2 py-1 bg-primary/20 text-primary border-primary/20 rounded-full font-bold animate-pulse"
                      >
                        Active
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground font-medium">{model.description}</span>
                  <span className="text-xs text-muted-foreground/60 font-medium capitalize">{model.provider}</span>
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

        {/* Footer */}
        <div className="p-4 border-t border-border/30 bg-gradient-to-r from-muted/10 to-transparent rounded-b-3xl">
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground font-medium">
              {models.length} model{models.length !== 1 ? 's' : ''} available
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full hover:bg-gradient-to-r hover:from-muted/30 hover:to-muted/20"
              title="Refresh models"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </Button>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
