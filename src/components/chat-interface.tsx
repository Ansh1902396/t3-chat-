"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { Sidebar } from "./sidebar"
import { ModelDropdown } from "./model-dropdown"
import { ThemeToggle } from "./theme-toggle"
import { Menu, Sparkles, Search, Code, GraduationCap, Paperclip, ArrowUp, User, Bot, X, Image, Settings } from "lucide-react"
import { MarkdownRenderer } from "./ui/markdown-renderer"
import { StreamingMarkdown } from "./ui/streaming-markdown"
import { FileUpload } from "./ui/file-upload"
import { FileAttachmentList } from "./ui/file-attachment"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogPortal, DialogOverlay } from "./ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Badge } from "./ui/badge"
import { GeneratedImage } from "./ui/generated-image"
import { useAIChat, type ChatConfig } from "~/hooks/useAIChat"
import { cn } from "~/lib/utils"
import { getProviderFromModel as getModelProvider } from "~/lib/model-provider-utils"

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
  "/image a futuristic robot writing code",
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
  const [showImageModal, setShowImageModal] = useState(false)
  const [imagePrompt, setImagePrompt] = useState("")
  const [selectedImageModel, setSelectedImageModel] = useState<"dall-e-2" | "dall-e-3">("dall-e-3")
  const [imageSize, setImageSize] = useState<"256x256" | "512x512" | "1024x1024" | "1024x1792" | "1792x1024">("1024x1024")
  const [imageQuality, setImageQuality] = useState<"standard" | "hd">("hd")
  const [imageStyle, setImageStyle] = useState<"vivid" | "natural">("vivid")
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
    generateImageResponse,
    isGeneratingImage,
    generatedImages,
    addMessage,
    clearGeneratedImages,
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
      Object.entries(models)
        .filter(([modelId, modelData]) => {
          // Filter out image models (DALL-E) from text chat interface
          return modelData.type !== 'image' && !modelId.includes('dall-e');
        })
        .map(([modelId, modelData]) => ({
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

  // Debug generated images
  useEffect(() => {
    console.log('Generated images updated:', generatedImages);
  }, [generatedImages])

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
    
    // Check for /image command
    if (message.trim().startsWith('/image')) {
      const promptText = message.trim().substring(6).trim(); // Remove '/image' and trim
      if (promptText) {
        setImagePrompt(promptText);
        setShowImageModal(true);
        setMessage("");
        return;
      } else {
        // Show modal to enter prompt
        setImagePrompt("");
        setShowImageModal(true);
        setMessage("");
        return;
      }
    }
    
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
    
    // Check if it's an image command
    if (question.trim().startsWith('/image')) {
      const promptText = question.trim().substring(6).trim(); // Remove '/image' and trim
      if (promptText) {
        setImagePrompt(promptText);
        setShowImageModal(true);
        setMessage("");
        return;
      }
    }
    
    // Auto-send the sample question for regular text
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

  const handleImageGeneration = async () => {
    if (!imagePrompt.trim() || !user) return;

    const config = {
      provider: "openai" as const,
      model: selectedImageModel,
      size: imageSize,
      ...(selectedImageModel === "dall-e-3" && {
        quality: imageQuality,
        style: imageStyle,
      }),
    };

    try {
      // Add user message for the image request
      addMessage("user", `/image ${imagePrompt}`);
      
      await generateImageResponse(imagePrompt, config);
      setShowImageModal(false);
      setImagePrompt("");
    } catch (error) {
      console.error('Failed to generate image:', error);
      // Error handling is done in the hook
    }
  };

  // Helper function to determine provider from model name
  const getProviderFromModel = (modelId: string): "openai" | "anthropic" | "google" => {
    // Use the robust utility function that properly handles DALL-E models
    return getModelProvider(modelId) as "openai" | "anthropic" | "google"
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
    clearGeneratedImages() // Clear images when starting new chat
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

                {/* Generated Images */}
                {generatedImages.length > 0 && (
                  <div className="space-y-4">
                    {generatedImages.map((image, index) => (
                      <div key={index} className="flex gap-4 group justify-start">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
                          <Bot className="h-4 w-4 text-primary" />
                        </div>
                        <div className="max-w-[80%] rounded-2xl text-sm bg-muted/50 overflow-hidden">
                          <div className="p-4">
                            <div className="mb-3">
                              <div className="text-sm text-muted-foreground mb-2">
                                Generated image for: <span className="font-medium">{image.prompt}</span>
                              </div>
                              {image.revisedPrompt && image.revisedPrompt !== image.prompt && (
                                <div className="text-xs text-muted-foreground/80 mb-2">
                                  Revised: {image.revisedPrompt}
                                </div>
                              )}
                            </div>
                            <GeneratedImage 
                              url={image.url}
                              prompt={image.revisedPrompt || image.prompt}
                            />
                            <div className="text-xs opacity-60 mt-3 pt-2 border-t border-border/20">
                              {image.timestamp.toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Image Generation Loading */}
                {isGeneratingImage && (
                  <div className="flex gap-4 group justify-start">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-primary animate-pulse" />
                    </div>
                    <div className="max-w-[80%] rounded-2xl text-sm bg-muted/50 overflow-hidden">
                      <div className="p-4 flex items-center gap-3">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
                        <span className="text-muted-foreground">Generating image...</span>
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
                    placeholder="Type your message here or use /image for DALL-E generation..."
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

        {/* Image Generation Modal */}
        <Dialog open={showImageModal} onOpenChange={setShowImageModal}>
          <DialogPortal>
            <DialogOverlay className="fixed inset-0 z-50 bg-black/20 backdrop-blur-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
            <DialogContent className="max-w-md bg-background/95 backdrop-blur-xl border-2">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Image className="h-5 w-5" />
                Generate Image with DALL-E
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Prompt Input */}
              <div>
                <label className="text-sm font-medium mb-2 block">Image Prompt</label>
                <textarea
                  value={imagePrompt}
                  onChange={(e) => setImagePrompt(e.target.value)}
                  placeholder="Describe the image you want to generate..."
                  className="w-full p-3 border rounded-lg text-sm resize-none"
                  rows={3}
                />
              </div>

              {/* Model Selection */}
              <div>
                <label className="text-sm font-medium mb-2 block">Model</label>
                <Select value={selectedImageModel} onValueChange={(value: "dall-e-2" | "dall-e-3") => setSelectedImageModel(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dall-e-2">DALL-E 2</SelectItem>
                    <SelectItem value="dall-e-3">DALL-E 3</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Size Selection */}
              <div>
                <label className="text-sm font-medium mb-2 block">Size</label>
                <Select 
                  value={imageSize} 
                  onValueChange={(value: "256x256" | "512x512" | "1024x1024" | "1024x1792" | "1792x1024") => setImageSize(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedImageModel === "dall-e-2" ? (
                      <>
                        <SelectItem value="256x256">256×256 (Square)</SelectItem>
                        <SelectItem value="512x512">512×512 (Square)</SelectItem>
                        <SelectItem value="1024x1024">1024×1024 (Square)</SelectItem>
                      </>
                    ) : (
                      <>
                        <SelectItem value="1024x1024">1024×1024 (Square)</SelectItem>
                        <SelectItem value="1024x1792">1024×1792 (Portrait)</SelectItem>
                        <SelectItem value="1792x1024">1792×1024 (Landscape)</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* DALL-E 3 Advanced Options */}
              {selectedImageModel === "dall-e-3" && (
                <>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Quality</label>
                    <Select value={imageQuality} onValueChange={(value: "standard" | "hd") => setImageQuality(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard">Standard</SelectItem>
                        <SelectItem value="hd">HD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Style</label>
                    <Select value={imageStyle} onValueChange={(value: "vivid" | "natural") => setImageStyle(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vivid">Vivid</SelectItem>
                        <SelectItem value="natural">Natural</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {/* Cost Display */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Cost per image:</span>
                <Badge variant="secondary">5 credits</Badge>
              </div>

              {/* User Credits Display */}
              {user && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Your credits:</span>
                  <Badge variant={user.credits >= 5 ? "default" : "destructive"}>
                    {user.credits} credits
                  </Badge>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowImageModal(false);
                    setImagePrompt("");
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleImageGeneration}
                  disabled={!imagePrompt.trim() || !user || user.credits < 5 || isGeneratingImage}
                  className="flex-1"
                >
                  {isGeneratingImage ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                      Generating...
                    </>
                  ) : (
                    `Generate (5 credits)`
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
          </DialogPortal>
        </Dialog>
      </div>
    </div>
  )
}
