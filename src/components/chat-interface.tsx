"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { Sidebar } from "./sidebar"
import { ModelDropdown } from "./model-dropdown"
import { ThemeToggle } from "./theme-toggle"
import { Menu, Sparkles, Search, Code, GraduationCap, Paperclip, ArrowUp, User, Bot, X } from "lucide-react"
import { MarkdownRenderer } from "./ui/markdown-renderer"
import { StreamingMarkdown } from "./ui/streaming-markdown"
import { FileUpload } from "./ui/file-upload"
import { FileAttachmentList } from "./ui/file-attachment"
import { useAIChat, type ChatConfig } from "~/hooks/useAIChat"
import { cn } from "~/lib/utils"

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
  onCreditsUpdated?: () => void
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

export function ChatInterface({ user, onLogout, onCreditsUpdated }: ChatInterfaceProps) {
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
  const inputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Initialize AI Chat hook
  const {
    messages,
    isStreaming,
    currentStreamContent,
    isGenerating,
    availableModels,
    modelsLoading,
    sendMessageStream,
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
    onCreditsUpdated: () => {
      // Trigger refetch of user data to get updated credits
      onCreditsUpdated?.();
    },
  })

  // Sync conversation ID between state and hook
  useEffect(() => {
    if (hookConversationId !== currentConversationId) {
      setCurrentConversationId(hookConversationId)
    }
  }, [hookConversationId])

  // Transform availableModels data structure for the dropdown
  const transformedAvailableModels = availableModels ? 
    Object.entries(availableModels.models).flatMap(([provider, models]) =>
      Object.entries(models).map(([modelId, modelData]) => ({
        id: modelId,
        name: modelData.name,
        provider: provider,
        available: true // All models returned from API are available
      }))
    ) : undefined

  // Auto-select first available model if current selection is not available
  useEffect(() => {
    if (transformedAvailableModels && transformedAvailableModels.length > 0) {
      const currentModelExists = transformedAvailableModels.some(model => model.id === selectedModel)
      if (!currentModelExists) {
        setSelectedModel(transformedAvailableModels[0]!.id)
      }
    }
  }, [transformedAvailableModels, selectedModel])

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

  const handleSendMessage = () => {
    if ((!message.trim() && attachedFiles.length === 0) || isStreaming || isGenerating) return
    
    const config: ChatConfig = {
      provider: getProviderFromModel(selectedModel),
      model: selectedModel,
      maxTokens: 2000,
      temperature: 0.7,
    }
    
    // Include attachments in the message
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
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

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

  // Helper function to determine provider from model name
  const getProviderFromModel = (modelId: string) => {
    if (modelId.includes("gemini")) return "google" as const
    if (modelId.includes("gpt") || modelId.includes("o4")) return "openai" as const
    if (modelId.includes("claude")) return "anthropic" as const
    if (modelId.includes("deepseek")) return "openai" as const // assuming OpenAI compatible
    return "google" as const // default
  }

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

  return (
    <div className="flex h-screen bg-background overflow-hidden">
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
        <div className="flex-scroll-container">
          {!hasMessages ? (
            // Welcome Screen
            <div className="flex-1 flex flex-col items-center justify-center p-8 max-w-6xl mx-auto w-full overflow-y-auto custom-scrollbar">
              <div className="text-center mb-12 w-full animate-fade-in">
                <h1 className="text-6xl font-black mb-4 text-balance tracking-tight bg-gradient-to-br from-foreground via-foreground to-muted-foreground bg-clip-text text-transparent title-glow">
                  How can I help you{user ? `, ${user.name.split(" ")[0]}` : ""}?
                </h1>

                {/* Category Buttons */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 justify-center mb-16 max-w-4xl mx-auto">
                  {categoryButtons.map((category, index) => (
                    <Button
                      key={category.label}
                      variant="outline"
                      className={`flex flex-col items-center gap-4 h-auto p-8 bg-gradient-to-br ${category.color}
                               hover:bg-muted/40 hover:border-border
                               card-t3 group animate-fade-in rounded-3xl border-2 category-card`}
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <category.icon className="h-8 w-8 text-muted-foreground group-hover:text-foreground transition-all duration-300 group-hover:scale-110" />
                      <div className="text-center">
                        <div className="font-bold text-base tracking-tight mb-1 group-hover:text-primary transition-colors duration-300">{category.label}</div>
                        <div className="text-sm text-muted-foreground font-medium group-hover:text-muted-foreground/80 transition-colors duration-300">{category.description}</div>
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
                               hover:text-foreground hover:bg-muted/30 rounded-2xl 
                               animate-fade-in group border border-transparent hover:border-border/50 question-item"
                      onClick={() => handleSampleQuestionClick(question)}
                      style={{ animationDelay: `${(index + 4) * 0.1}s` }}
                    >
                      <span className="font-semibold text-base relative z-10 group-hover:text-primary transition-colors duration-300">{question}</span>
                      <ArrowUp className="ml-auto h-5 w-5 opacity-0 group-hover:opacity-100 transition-all duration-300 rotate-45 group-hover:text-primary group-hover:scale-110" />
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            // Messages Area
            <div className="messages-scroll-area p-4 space-y-6 scrollbar-messages scrollbar-glow">
              <div className="max-w-4xl mx-auto w-full space-y-6">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex gap-4 group message-container",
                      msg.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    {msg.role === "assistant" && (
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    <div
                      className={cn(
                        "max-w-[80%] rounded-2xl text-sm",
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground ml-auto px-4 py-3"
                          : "bg-muted/50 overflow-hidden"
                      )}
                    >
                      {msg.role === "assistant" ? (
                        <div className="p-4">
                          <MarkdownRenderer>{msg.content}</MarkdownRenderer>
                          <div className="text-xs opacity-60 mt-3 pt-2 border-t border-border/20">
                            {msg.timestamp.toLocaleTimeString()}
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="whitespace-pre-wrap">{msg.content}</div>
                          <div className="text-xs opacity-60 mt-2">
                            {msg.timestamp.toLocaleTimeString()}
                          </div>
                        </>
                      )}
                    </div>
                    {msg.role === "user" && (
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-muted/40 to-muted/60 flex items-center justify-center">
                        <User className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                ))}

                {/* Streaming Message */}
                {isStreaming && (
                  <div className="flex gap-4 group justify-start">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-primary animate-pulse" />
                    </div>
                    <div className="max-w-[80%] rounded-2xl text-sm bg-muted/50 overflow-hidden">
                      <div className="p-4">
                        <StreamingMarkdown 
                          content={currentStreamContent} 
                          isStreaming={true}
                        />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
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
            <div className="relative card-t3 rounded-3xl border-2 border-border/50 shadow-xl search-container glow-purple-subtle">
              <div className="flex items-center p-5 gap-4">
                <ModelDropdown 
                  selectedModel={selectedModel} 
                  onModelChange={setSelectedModel} 
                  availableModels={transformedAvailableModels}
                  isLoading={modelsLoading}
                  userCredits={user?.credits || 0}
                />

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
                  onClick={() => setShowFileUpload(!showFileUpload)}
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
                    onFocus={() => {
                      const container = inputRef.current?.closest('.search-container');
                      container?.classList.add('glow-purple-focus');
                      container?.classList.remove('glow-purple-subtle');
                    }}
                    onBlur={() => {
                      const container = inputRef.current?.closest('.search-container');
                      container?.classList.remove('glow-purple-focus');
                      container?.classList.add('glow-purple-subtle');
                    }}
                    disabled={isStreaming || isGenerating}
                    className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 
                             placeholder:text-muted-foreground/60 text-base font-medium pr-16 py-3"
                  />
                  {(isStreaming || isGenerating) && (
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
                  disabled={(!message.trim() && attachedFiles.length === 0) || isStreaming || isGenerating}
                  className="h-10 w-10 btn-t3-primary text-white rounded-full shadow-lg disabled:opacity-50 
                           disabled:cursor-not-allowed transition-all duration-200"
                >
                  {isStreaming || isGenerating ? (
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
