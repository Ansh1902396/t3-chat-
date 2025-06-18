"use client"

import type React from "react"

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { Sidebar } from "./sidebar"
import { ModelDropdown } from "./model-dropdown"
import { ThemeToggle } from "./theme-toggle"
import { Menu, Sparkles, Search, Code, GraduationCap, Paperclip, ArrowUp, User, Bot, X, MoreVertical, Copy, Trash2, Edit2, Wand2, Image as ImageIcon } from "lucide-react"
import { MarkdownRenderer } from "./ui/markdown-renderer"
import { StreamingMarkdown } from "./ui/streaming-markdown"
import { FileUpload } from "./ui/file-upload"
import { FileAttachmentList } from "./ui/file-attachment"
import { CreditsDisplay } from "./credits-display"
import { CreditToast } from "./credit-toast"
import { useAIChat, type ChatConfig, type Message, type ImageGenerationConfig } from "~/hooks/useAIChat"
import { cn } from "~/lib/utils"
import { useInView } from "react-intersection-observer"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "~/components/ui/dialog"
import { ScrollArea } from "~/components/ui/scroll-area"
import { Label } from "~/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select"
import { Switch } from "~/components/ui/switch"
import { Slider } from "~/components/ui/slider"
import { type AIProvider } from "~/server/api/routers/ai-chat"
import { GeneratedImage } from "./ui/generated-image"

// Client-side constants and types
type ClientAIProvider = "openai" | "google" | "anthropic";

const AI_PROVIDERS: Record<ClientAIProvider, ClientAIProvider> = {
  openai: "openai",
  google: "google",
  anthropic: "anthropic",
} as const;

type ModelInfo = {
  name: string;
  description: string;
  type?: 'text' | 'image';
};

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

interface SearchConfig {
  enabled: boolean;
  searchContextSize: 'low' | 'medium' | 'high';
  userLocation?: {
    type: 'approximate';
    city?: string;
    region?: string;
    country?: string;
  };
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

// Add this helper for tooltip
function Tooltip({ children, text }: { children: React.ReactNode; text: string }) {
  const [show, setShow] = useState(false);
  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div className="absolute z-50 left-1/2 -translate-x-1/2 mt-2 px-3 py-1 rounded bg-black text-white text-xs shadow-lg whitespace-nowrap pointer-events-none animate-fade-in">
          {text}
        </div>
      )}
    </div>
  );
}

// Add this helper for source tooltip
function SourceTooltip({ source }: { source: { title: string; url: string; content?: string } }) {
  const [show, setShow] = useState(false);
  return (
    <div
      className="relative inline-block ml-2"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary border border-primary/30 cursor-pointer">
        <svg width="14" height="14" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="2"/><text x="10" y="15" textAnchor="middle" fontSize="12" fill="currentColor">i</text></svg>
      </span>
      {show && (
        <div className="absolute z-50 left-1/2 -translate-x-1/2 mt-2 px-4 py-2 rounded bg-black text-white text-xs shadow-lg whitespace-pre-line pointer-events-none animate-fade-in min-w-[200px] max-w-xs">
          <div className="font-semibold mb-1">{source.title}</div>
          <a href={source.url} target="_blank" rel="noopener noreferrer" className="underline break-all text-blue-200">{source.url}</a>
          {source.content && <div className="mt-2 text-xs text-gray-200">{source.content}</div>}
        </div>
      )}
    </div>
  );
}

export function ChatInterface({ user, onLogout }: ChatInterfaceProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [message, setMessage] = useState("")
  const [selectedModel, setSelectedModel] = useState("gemini-1.5-flash")
  const [currentConversationId, setCurrentConversationId] = useState<string | undefined>()
  const [showFileUpload, setShowFileUpload] = useState(false)
  const [attachedFiles, setAttachedFiles] = useState<Array<{
    id: string;
    fileName: string;
    fileType: 'image' | 'document' | 'audio' | 'video';
    fileSize: number;
    mimeType: string;
    url: string;
    cloudinaryId?: string;
  }>>([])
  const [showCreditToast, setShowCreditToast] = useState(false)
  const [creditToastData, setCreditToastData] = useState<{
    creditsUsed: number;
    creditsRemaining: number;
    modelName: string;
  }>({ creditsUsed: 0, creditsRemaining: 0, modelName: '' })
  const inputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [isAutoScrolling, setIsAutoScrolling] = useState(true)
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(false)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const lastScrollHeightRef = useRef<number>(0)
  const lastScrollTopRef = useRef<number>(0)
  const { ref: bottomRef, inView } = useInView({
    threshold: 0.5,
    initialInView: true,
  })
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const scrollTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const [showImageGen, setShowImageGen] = useState(false)
  const [showImageGenDialogOpen, setShowImageGenDialogOpen] = useState(false)
  const [showSearchDialog, setShowSearchDialog] = useState(false)
  const [searchConfig, setSearchConfig] = useState<SearchConfig>({
    enabled: true,
    searchContextSize: 'medium',
  })
  const [isSearchMode, setIsSearchMode] = useState(false)

  // Initialize AI Chat hook
  const {
    messages,
    isStreaming,
    currentStreamContent,
    isGenerating,
    isGeneratingImage,
    generatedImages,
    availableModels,
    modelsLoading,
    sendMessageStream,
    generateImageResponse,
    clearChat,
    startNewConversation,
    loadConversation,
    conversationTitle,
    currentConversationId: hookConversationId,
  } = useAIChat({
    conversationId: currentConversationId,
    onError: (error) => {
      console.error("AI Chat Error:", error)
      // You could add a toast notification here
    },
    onCreditUsed: (creditsUsed, creditsRemaining, modelName) => {
      setCreditToastData({ creditsUsed, creditsRemaining, modelName });
      setShowCreditToast(true);
    },
  })

  // Sync conversation ID between state and hook
  useEffect(() => {
    if (hookConversationId !== currentConversationId) {
      setCurrentConversationId(hookConversationId)
    }
  }, [hookConversationId])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, currentStreamContent])

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

  // Improved scroll handling with debounce
  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current) return
    
    const container = messagesContainerRef.current
    const { scrollTop, scrollHeight, clientHeight } = container
    
    // Clear any existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current)
    }
    
    // Store last scroll position with debounce
    scrollTimeoutRef.current = setTimeout(() => {
      lastScrollTopRef.current = scrollTop
      lastScrollHeightRef.current = scrollHeight
      
      // Check if we're near bottom (within 100px)
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100
      
      // Update auto-scroll state
      setIsAutoScrolling(isNearBottom)
      
      // If we're near bottom and streaming, ensure we stay there
      if (isNearBottom && isStreaming) {
        setShouldScrollToBottom(true)
      }
    }, 100) // 100ms debounce
  }, [isStreaming])

  // Cleanup scroll timeout
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [])

  // Improved scroll to bottom behavior
  const scrollToBottom = useCallback((smooth = true) => {
    if (!messagesContainerRef.current) return
    
    const container = messagesContainerRef.current
    const { scrollHeight, clientHeight } = container
    
    // Prevent scroll jumps by checking if we're already at bottom
    const isAtBottom = scrollHeight - container.scrollTop - clientHeight < 10
    if (isAtBottom && !smooth) return
    
    requestAnimationFrame(() => {
      container.scrollTo({
        top: scrollHeight - clientHeight,
        behavior: smooth ? "smooth" : "auto"
      })
    })
  }, [])

  // Handle new messages and streaming
  useEffect(() => {
    if (!messagesContainerRef.current) return

    const container = messagesContainerRef.current
    const { scrollTop, scrollHeight, clientHeight } = container
    const wasNearBottom = scrollHeight - scrollTop - clientHeight < 100

    // If we were near bottom or should scroll (during streaming), scroll to bottom
    if (wasNearBottom || shouldScrollToBottom) {
      // Use smooth scrolling for user messages, instant for streaming
      scrollToBottom(!isStreaming)
    }

    // Reset scroll flag after handling
    if (shouldScrollToBottom) {
      setShouldScrollToBottom(false)
    }
  }, [messages, currentStreamContent, isStreaming, shouldScrollToBottom, scrollToBottom])

  // Reset scroll behavior when streaming ends
  useEffect(() => {
    if (!isStreaming && shouldScrollToBottom) {
      setShouldScrollToBottom(false)
    }
  }, [isStreaming, shouldScrollToBottom])

  // Add stop streaming function
  const stopStreaming = () => {
    if (isStreaming) {
      // You'll need to implement this in your useAIChat hook
      // For now, we'll just log it
      console.log("Stopping stream...");
      // Add your stop streaming logic here
    }
  };

  const handleSendMessage = () => {
    if ((!message.trim() && attachedFiles.length === 0) || isStreaming || isGenerating) return
    const config: ChatConfig = {
      provider: getProviderFromModel(selectedModel),
      model: selectedModel,
      maxTokens: 2000,
      temperature: 0.7,
      webSearch: isSearchMode ? { enabled: true } : undefined,
    }
    const messageWithAttachments = {
      content: message,
      attachments: attachedFiles.map(file => ({
        id: file.id,
        fileName: file.fileName,
        fileType: file.fileType,
        fileSize: file.fileSize,
        mimeType: file.mimeType,
        cloudinaryId: file.cloudinaryId,
        url: file.url,
      }))
    }
    sendMessageStream(message, config, messageWithAttachments.attachments)
    setMessage("")
    setAttachedFiles([])
    setShowFileUpload(false)
    setIsSearchMode(false)
  }

  // Handle message input
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (message.trim().startsWith("/image")) {
        const prompt = message.trim().slice(6).trim();
        if (prompt) {
          const config: ImageGenerationConfig = {
            provider: "openai",
            model: "dall-e-3",
            size: "1024x1024",
            quality: "standard",
            style: "natural",
            n: 1,
          };
          generateImageResponse(prompt, config);
          setMessage("");
        }
      } else {
        handleSendMessage();
        setIsSearchMode(false);
      }
    }
  };

  const handleSampleQuestionClick = (question: string) => {
    setMessage(question)
    // Auto-send the sample question
    setTimeout(() => {
      const config: ChatConfig = {
        provider: getProviderFromModel(selectedModel),
        model: selectedModel,
        maxTokens: 2000,
        temperature: 0.7,
      }
      sendMessageStream(question, config)
      setMessage("")
    }, 100)
  }

  // File handling functions
  const handleFilesUploaded = (files: Array<{
    id: string;
    fileName: string;
    fileType: 'image' | 'document' | 'audio' | 'video';
    fileSize: number;
    mimeType: string;
    url: string;
    cloudinaryId?: string;
  }>) => {
    setAttachedFiles(prev => [...prev, ...files]);
    setShowFileUpload(false);
  };

  const handleRemoveFile = (fileId: string) => {
    setAttachedFiles(prev => prev.filter(file => file.id !== fileId));
  };

  const handleDownloadFile = (file: {
    id: string;
    fileName: string;
    fileType: 'image' | 'document' | 'audio' | 'video';
    fileSize: number;
    mimeType: string;
    url: string;
    cloudinaryId?: string;
  }) => {
    window.open(file.url, '_blank');
  };

  // Get provider from model ID
  const getProviderFromModel = (modelId: string): ClientAIProvider => {
    // Check available models first
    if (availableModels?.models) {
      for (const [provider, models] of Object.entries(availableModels.models)) {
        if (modelId in models) {
          // Special handling for DALL-E models
          if (modelId.includes("dall-e")) {
            return "openai";
          }
          // Special handling for Gemini Pro Vision
          if (modelId === "gemini-pro-vision") {
            return "google";
          }
          return provider as ClientAIProvider;
        }
      }
    }

    // Fallback to provider mapping
    const providerMap: Record<string, ClientAIProvider> = {
      "dall-e-3": "openai",
      "dall-e-2": "openai",
      "gemini-pro-vision": "google",
    };

    return providerMap[modelId] ?? "openai";
  }

  // Transform availableModels for the dropdown
  const transformedAvailableModels = availableModels ? 
    Object.entries(availableModels.models).flatMap(([provider, models]) =>
      Object.entries(models).map(([modelId, modelData]) => ({
        id: modelId,
        name: modelData.name,
        provider,
        available: true,
        type: (modelData as ModelInfo).type
      }))
    ) : [];

  // Handle conversation selection from sidebar
  const handleConversationSelect = (conversationId: string) => {
    setCurrentConversationId(conversationId)
    loadConversation(conversationId)
    setSidebarOpen(false) // Close sidebar on mobile
  }

  // Handle new chat
  const handleNewChat = () => {
    setCurrentConversationId(undefined)
    startNewConversation()
    setSidebarOpen(false) // Close sidebar on mobile
  }

  const hasMessages = messages.length > 0 || isStreaming

  // Handle message actions
  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content)
    // You could add a toast notification here
  }

  const handleDeleteMessage = (messageId: string) => {
    // Implement message deletion logic
    console.log("Delete message:", messageId)
  }

  const handleEditMessage = (message: Message) => {
    setSelectedMessage(message)
    setIsDialogOpen(true)
  }

  const handleSearchClick = () => {
    const modelInfo = availableModels?.models[getProviderFromModel(selectedModel)]?.[selectedModel];
    if (!modelInfo?.capabilities?.webSearch) {
      // Optionally show a toast or alert
      return;
    }
    setIsSearchMode((prev) => !prev);
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <CreditToast
        show={showCreditToast}
        creditsUsed={creditToastData.creditsUsed}
        creditsRemaining={creditToastData.creditsRemaining}
        modelName={creditToastData.modelName}
        onClose={() => setShowCreditToast(false)}
      />
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        user={user}
        onLogout={onLogout}
        currentConversationId={currentConversationId}
        onConversationSelect={handleConversationSelect}
        onNewChat={handleNewChat}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
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
          <h1 className="font-bold tracking-tight text-lg">
            {conversationTitle || "T3.chat"}
          </h1>
          <div className="flex items-center gap-2">
            {user && (
              <CreditsDisplay credits={user.credits} className="text-xs" />
            )}
            {hasMessages && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleNewChat}
                className="text-xs"
              >
                Clear
              </Button>
            )}
            <ThemeToggle />
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden lg:flex items-center justify-between p-6 bg-background/50 backdrop-blur-xl">
          <div className="flex-1">
            {conversationTitle && (
              <h1 className="text-lg font-bold text-foreground">{conversationTitle}</h1>
            )}
          </div>
          <div className="flex items-center gap-4">
            {hasMessages && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleNewChat}
                className="text-sm"
              >
                New Chat
              </Button>
            )}
            {user && (
              <CreditsDisplay credits={user.credits} />
            )}
            <ThemeToggle />
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col min-h-0 relative">
          {!hasMessages ? (
            // Welcome Screen
            <div className="flex-1 flex flex-col items-center justify-center p-8 max-w-6xl mx-auto w-full overflow-y-auto custom-scrollbar">
              <div className="text-center mb-12 w-full animate-fade-in-up">
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
                               hover:bg-muted/40 hover:border-border transition-bounce 
                               card-t3 group animate-bounce-in rounded-3xl border-2 hover-scale`}
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
                               hover:text-foreground hover:bg-muted/30 rounded-2xl transition-smooth 
                               animate-slide-up group border border-transparent hover:border-border/50 hover-lift"
                      onClick={() => handleSampleQuestionClick(question)}
                      style={{ animationDelay: `${(index + 4) * 0.1}s` }}
                    >
                      <span className="font-semibold text-base">{question}</span>
                      <ArrowUp className="ml-auto h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity rotate-45" />
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            // Messages Area
            <div 
              ref={messagesContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto custom-scrollbar"
            >
              <div className="messages-scroll-area p-4 space-y-6 min-h-full">
                <div className="max-w-4xl mx-auto w-full space-y-6 pb-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        "group relative flex gap-4 message-container animate-fade-in",
                        msg.role === "user" ? "justify-end" : "justify-start",
                        "py-2"
                      )}
                      style={{
                        animationDuration: "0.3s",
                        animationFillMode: "both"
                      }}
                    >
                      {msg.role === "assistant" && (
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center shadow-sm">
                          <Bot className="h-4 w-4 text-primary" />
                        </div>
                      )}
                      <Dialog open={isDialogOpen && selectedMessage?.id === msg.id} onOpenChange={(open) => {
                        setIsDialogOpen(open)
                        if (!open) setSelectedMessage(null)
                      }}>
                        <div className="relative group/message flex flex-col max-w-[70%]">
                          <div
                            className={cn(
                              "text-sm transition-all duration-200 shadow-md",
                              msg.role === "user"
                                ? "bg-primary text-white ml-auto px-5 py-3 rounded-2xl rounded-br-md border border-primary/30"
                                : "bg-muted/60 dark:bg-muted/30 text-foreground ml-12 px-5 py-3 rounded-2xl rounded-bl-md border border-border/40",
                              "backdrop-blur-sm"
                            )}
                          >
                            {msg.role === "assistant" ? (
                              <div className="prose prose-sm dark:prose-invert max-w-none text-foreground">
                                {msg.content.startsWith("Generated images for prompt:") ? (
                                  <div className="space-y-2 text-center">
                                    {(() => {
                                      const parts = msg.content.split("\n\n");
                                      const prompt = msg.content.match(/Generated images for prompt: "([^"]+)"/)?.[1] || "";
                                      const urls = parts[1]?.split("\n").filter(Boolean) || [];
                                      return (
                                        <>
                                          <div className="text-base font-semibold mb-2 text-primary">{prompt}</div>
                                          <div className="flex flex-col items-center gap-4">
                                            {urls.map((url, index) => (
                                              <GeneratedImage
                                                key={index}
                                                url={url}
                                                prompt={prompt}
                                                className="w-full max-w-xs rounded-xl border border-border shadow"
                                              />
                                            ))}
                                          </div>
                                        </>
                                      );
                                    })()}
                                  </div>
                                ) : (
                                  <MarkdownRenderer>{msg.content}</MarkdownRenderer>
                                )}
                                <div className="flex items-center justify-between mt-2">
                                  <div className="text-xs text-muted-foreground">
                                    {msg.timestamp.toLocaleTimeString()}
                                  </div>
                                  <DialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 opacity-0 group-hover/message:opacity-100 transition-opacity"
                                      onClick={() => setSelectedMessage(msg)}
                                    >
                                      <MoreVertical className="h-3 w-3" />
                                    </Button>
                                  </DialogTrigger>
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-col">
                                <div className="whitespace-pre-wrap text-white font-medium">{msg.content}</div>
                                <div className="flex items-center justify-between mt-2 pt-2 border-t border-primary/30">
                                  <div className="text-xs text-white/70">
                                    {msg.timestamp.toLocaleTimeString()}
                                  </div>
                                  <DialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 opacity-0 group-hover/message:opacity-100 transition-opacity text-white/70 hover:bg-primary/20"
                                      onClick={() => setSelectedMessage(msg)}
                                    >
                                      <MoreVertical className="h-3 w-3" />
                                    </Button>
                                  </DialogTrigger>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </Dialog>
                      {msg.role === "user" && (
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary/30 to-primary/60 flex items-center justify-center shadow-sm ml-2">
                          <User className="h-4 w-4 text-white" />
                        </div>
                      )}
                      {msg.role === "assistant" && msg.sources && msg.sources.length > 0 && (
                        isSearchMode ? (
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs text-muted-foreground">Sources:</span>
                            {msg.sources.map((source, idx) => (
                              <SourceTooltip key={idx} source={source} />
                            ))}
                          </div>
                        ) : (
                          <div className="mt-4 pt-4 border-t border-border/40">
                            <div className="text-sm font-medium text-muted-foreground mb-2">Sources:</div>
                            <div className="space-y-2">
                              {msg.sources.map((source, index) => (
                                <a
                                  key={index}
                                  href={source.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block text-sm text-primary hover:underline"
                                >
                                  {source.title}
                                </a>
                              ))}
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  ))}

                  {/* Streaming Message */}
                  {isStreaming && (
                    <div 
                      className="flex gap-4 group message-container animate-fade-in" 
                      style={{ 
                        animationDuration: "0.3s",
                        animationFillMode: "both"
                      }}
                    >
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-black/10 to-black/20 dark:from-white/10 dark:to-white/20 flex items-center justify-center shadow-sm">
                        <Bot className="h-4 w-4 text-black/70 dark:text-white/70 animate-pulse" />
                      </div>
                      <div className="ml-12">
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <StreamingMarkdown 
                            content={currentStreamContent} 
                            isStreaming={true}
                          />
                          <div className="flex items-center gap-2 mt-2">
                            <div className="text-xs text-muted-foreground">
                              {new Date().toLocaleTimeString()}
                            </div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <div className="w-1.5 h-1.5 bg-black/40 dark:bg-white/40 rounded-full animate-pulse" />
                              <div className="w-1.5 h-1.5 bg-black/40 dark:bg-white/40 rounded-full animate-pulse" style={{ animationDelay: "0.2s" }} />
                              <div className="w-1.5 h-1.5 bg-black/40 dark:bg-white/40 rounded-full animate-pulse" style={{ animationDelay: "0.4s" }} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Scroll anchor */}
                  <div 
                    ref={bottomRef}
                    className="h-4 w-full"
                    style={{ 
                      visibility: "hidden",
                      pointerEvents: "none"
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-8 border-t border-border/30 bg-background/80 backdrop-blur-xl">
          <div className="max-w-5xl mx-auto">
            {!hasMessages && (
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
            )}

            {/* File Upload Component */}
            {showFileUpload && (
              <div className="mb-6">
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8 z-10"
                    onClick={() => setShowFileUpload(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <FileUpload onFilesUploaded={handleFilesUploaded} />
                </div>
              </div>
            )}

            {/* Attached Files List */}
            {attachedFiles.length > 0 && (
              <div className="mb-6">
                <div className="mb-3">
                  <h4 className="text-sm font-semibold text-muted-foreground">Attached Files:</h4>
                </div>
                <FileAttachmentList
                  attachments={attachedFiles}
                  showPreviews={true}
                  onRemove={handleRemoveFile}
                  onDownload={handleDownloadFile}
                />
              </div>
            )}

            {/* Message Input */}
            <div className="relative card-t3 rounded-3xl border-2 border-border/50 shadow-xl transition-smooth hover-glow">
              <div className="flex items-center p-5 gap-4">
                <ModelDropdown 
                  selectedModel={selectedModel} 
                  onModelChange={setSelectedModel} 
                  availableModels={transformedAvailableModels}
                  isLoading={modelsLoading}
                  userCredits={user?.credits ?? 0}
                />

                <div className="h-8 w-px bg-border/50" />

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all rounded-full"
                  onClick={() => {
                    setMessage("/image ")
                    // Focus the input after setting the command
                    setTimeout(() => inputRef.current?.focus(), 0)
                  }}
                  title="Generate Image (Type /image followed by your prompt)"
                >
                  <ImageIcon className="h-4 w-4" />
                </Button>

                <Tooltip text={isSearchMode ? "Web search enabled for next message" : "Enable web search for next message"}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-10 w-10 text-muted-foreground hover:text-foreground transition-all rounded-full",
                      isSearchMode
                        ? "ring-2 ring-primary ring-offset-2 bg-primary/10 text-primary animate-pulse shadow-[0_0_16px_4px_rgba(99,102,241,0.5)]"
                        : "hover:bg-muted/40"
                    )}
                    onClick={handleSearchClick}
                    title={isSearchMode ? "Web search enabled for next message" : "Enable web search for next message"}
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                </Tooltip>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all rounded-full"
                  onClick={() => setShowFileUpload(!showFileUpload)}
                >
                  <Paperclip className="h-4 w-4" />
                </Button>

                <div className="flex-1 relative">
                  <Input
                    ref={inputRef}
                    placeholder="Type your message or /image to generate an image..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={isStreaming || isGenerating || isGeneratingImage}
                    className={cn(
                      "border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0",
                      "placeholder:text-muted-foreground/60 text-base font-medium py-3",
                      "transition-all duration-200",
                      (isStreaming || isGeneratingImage) ? "pr-32" : "pr-24"
                    )}
                  />
                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
                    {(isStreaming || isGeneratingImage) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={stopStreaming}
                        className="h-8 px-3 text-xs font-medium text-destructive hover:text-destructive/90 
                                 hover:bg-destructive/10 transition-colors rounded-full"
                      >
                        Stop
                      </Button>
                    )}
                    {(isStreaming || isGenerating || isGeneratingImage) && (
                      <div className="flex space-x-1">
                        {[0, 1, 2].map((i) => (
                          <div
                            key={i}
                            className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-pulse"
                            style={{ animationDelay: `${i * 0.2}s` }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <Button
                  size="icon"
                  onClick={handleSendMessage}
                  disabled={(!message.trim() && attachedFiles.length === 0) || isStreaming || isGenerating || isGeneratingImage}
                  className={cn(
                    "h-10 w-10 btn-t3-primary text-white rounded-full shadow-lg",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    "transition-all duration-200",
                    "hover:scale-105 active:scale-95"
                  )}
                >
                  {(isStreaming || isGenerating || isGeneratingImage) ? (
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
