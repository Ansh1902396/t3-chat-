"use client"
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { UserDropdown } from "./user-dropdown"
import { Search, Menu, Plus, PanelLeftClose, PanelLeftOpen, MessageSquare, Trash2, MoreHorizontal } from "lucide-react"
import { useState, useEffect } from "react"
import { api } from "~/trpc/react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "~/components/ui/dropdown-menu"
import { useCommandPalette } from "./command-palette-provider"
import { useIsMac } from "~/hooks/use-command-k"
import { cn } from "~/lib/utils"
import React from "react"

interface User {
  id: string
  name: string
  email: string
  avatar: string
  plan: string
  credits: number
}

interface SidebarProps {
  isOpen: boolean
  onToggle: () => void
  isCollapsed: boolean
  onToggleCollapse: () => void
  user: User | null
  onLogout: () => void
  currentConversationId?: string
  onConversationSelect?: (conversationId: string) => void
  onNewChat?: () => void
}

export function Sidebar({ 
  isOpen, 
  onToggle, 
  isCollapsed, 
  onToggleCollapse, 
  user, 
  onLogout,
  currentConversationId,
  onConversationSelect,
  onNewChat
}: SidebarProps) {
  const [searchValue, setSearchValue] = useState("")
  const { open: openCommandPalette } = useCommandPalette()
  const isMac = useIsMac()

  // Fetch conversations with refetch optimization
  const { data: conversationsData, refetch: refetchConversations, error, isLoading } = api.aiChat.listConversations.useQuery(
    { limit: 50, offset: 0 },
    { 
      enabled: !!user,
      refetchOnWindowFocus: false,
      staleTime: 30000, // 30 seconds
    }
  )

  // Debug logging
  useEffect(() => {
    console.log('Sidebar Debug Info:', {
      user: !!user,
      conversationsData,
      isLoading,
      error: error?.message,
      conversationsCount: conversationsData?.conversations?.length || 0
    });
  }, [user, conversationsData, isLoading, error]);

  // Delete conversation mutation
  const deleteConversation = api.aiChat.deleteConversation.useMutation({
    onSuccess: () => {
      refetchConversations()
    },
    onError: (error) => {
      console.error("Failed to delete conversation:", error)
    }
  })

  const conversations = conversationsData?.conversations || []

  // Filter conversations based on search
  const filteredConversations = conversations.filter(conversation =>
    conversation.title?.toLowerCase().includes(searchValue.toLowerCase())
  )

  const handleDeleteConversation = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent conversation selection
    if (confirm("Are you sure you want to delete this conversation?")) {
      try {
        await deleteConversation.mutateAsync({ conversationId })
        // If the deleted conversation was the current one, trigger new chat
        if (conversationId === currentConversationId) {
          onNewChat?.()
        }
      } catch (error) {
        console.error("Error deleting conversation:", error)
      }
    }
  }

  const formatDate = (date: Date | string) => {
    const d = new Date(date)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - d.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 1) return "Today"
    if (diffDays === 2) return "Yesterday"
    if (diffDays <= 7) return `${diffDays - 1} days ago`
    return d.toLocaleDateString()
  }

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden animate-fade-in" onClick={onToggle} />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed left-0 top-0 h-full bg-background/95 backdrop-blur-xl border-r border-border/50 z-50 
          transform transition-all duration-300 ease-out will-change-transform
          ${isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"}
          lg:translate-x-0 lg:static lg:z-auto lg:shadow-none lg:bg-background/80 lg:backdrop-blur-xl
          ${isCollapsed ? "lg:w-16" : "lg:w-80"}
        `}
        style={{ 
          width: isOpen ? "320px" : isCollapsed ? "64px" : "320px",
          minWidth: isCollapsed ? "64px" : "320px",
          maxWidth: isCollapsed ? "64px" : "320px"
        }}
      >
        <div className={`flex flex-col h-full ${isCollapsed ? "p-2" : "p-4"} gap-4`}>
          {/* Header */}
          <div className={`flex items-center ${isCollapsed ? "justify-center flex-col gap-3" : "justify-between"}`}>
            {!isCollapsed && (
              <div className="flex items-center gap-3 flex-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden hover:bg-gradient-to-r hover:from-muted/50 hover:to-muted/30 transition-all rounded-full"
                  onClick={onToggle}
                >
                  <Menu className="h-4 w-4" />
                </Button>
                <div className="flex-1 text-center lg:text-left">
                  <h1 className="text-xl font-black tracking-tight gradient-text-t3">T3.chat</h1>
                </div>
              </div>
            )}

            {isCollapsed && (
              <div className="flex flex-col items-center gap-2">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center shadow-lg">
                  <h1 className="text-sm font-black tracking-tight text-primary">T3</h1>
                </div>
              </div>
            )}

            {/* Collapse Toggle - Desktop Only */}
            <Button
              variant="ghost"
              size="icon"
              className={`hidden lg:flex hover:bg-gradient-to-r hover:from-muted/50 hover:to-muted/30 transition-all rounded-full ${
                isCollapsed ? "mt-2" : ""
              }`}
              onClick={onToggleCollapse}
            >
              {isCollapsed ? <PanelLeftOpen className="h-3 w-3" /> : <PanelLeftClose className="h-4 w-4" />}
            </Button>
          </div>

          {/* New Chat Button */}
          <div className={`${isCollapsed ? "flex justify-center" : ""}`}>
            <Button
              onClick={onNewChat}
              className={`bg-gradient-to-r from-primary via-primary to-primary/80 hover:from-primary/90 hover:via-primary/90 hover:to-primary/70
                       text-white font-semibold rounded-full group transition-all duration-200 shadow-lg hover:shadow-xl
                       hover:scale-[1.02] active:scale-[0.98] ${
                         isCollapsed 
                           ? "w-12 h-12 p-0 justify-center" 
                           : "w-full py-3"
                       }`}
              title={isCollapsed ? "New Chat" : undefined}
            >
              <Plus className={`h-4 w-4 transition-transform group-hover:rotate-90 ${isCollapsed ? "" : "mr-2"}`} />
              {!isCollapsed && "New Chat"}
            </Button>
          </div>

          {/* Search */}
          {!isCollapsed && (
            <div>
              <Button
                variant="outline"
                onClick={openCommandPalette}
                className="w-full justify-start pl-4 py-3 rounded-full border-border/50 
                         hover:border-primary/30 hover:bg-gradient-to-r hover:from-muted/30 hover:to-muted/20 
                         transition-all duration-200 text-muted-foreground hover:text-foreground
                         shadow-sm hover:shadow-md"
              >
                <Search className="h-4 w-4 mr-3 flex-shrink-0" />
                <span className="flex-1 text-left truncate">Search conversations...</span>
                <div className="flex items-center space-x-1 text-xs opacity-60 ml-2 flex-shrink-0">
                  <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">
                    {isMac ? "⌘" : "Ctrl"}
                  </kbd>
                  <span>K</span>
                </div>
              </Button>
            </div>
          )}

          {/* Search Icon for Collapsed */}
          {isCollapsed && (
            <div className="flex justify-center">
              <Button
                variant="ghost"
                size="icon"
                onClick={openCommandPalette}
                className="w-10 h-10 hover:bg-gradient-to-r hover:from-muted/50 hover:to-muted/30 
                         transition-all duration-200 rounded-2xl shadow-sm hover:shadow-md"
                title="Search conversations (Cmd+K)"
              >
                <Search className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </div>
          )}

          {/* Chat History */}
          <div className="flex-1 overflow-hidden">
            {user ? (
              <div className="space-y-2 h-full overflow-y-auto custom-scrollbar">
                {/* Loading State */}
                {isLoading && (
                  <div className="text-center text-muted-foreground text-sm py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                    Loading conversations...
                  </div>
                )}

                {/* Error State */}
                {error && !isLoading && (
                  <div className="text-center text-destructive text-sm py-8">
                    Error loading conversations: {error.message}
                    <button 
                      onClick={() => refetchConversations()}
                      className="block mt-2 text-primary hover:underline"
                    >
                      Try again
                    </button>
                  </div>
                )}

                {/* Conversations Header */}
                {!isCollapsed && !isLoading && !error && filteredConversations.length > 0 && (
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-2 mb-3">
                    Recent Chats ({filteredConversations.length})
                  </h3>
                )}
                
                {/* Conversations List */}
                {!isLoading && !error && filteredConversations.length > 0 ? (
                  filteredConversations.map((conversation, index) => (
                    <div
                      key={conversation.id}
                      className={cn(
                        "group cursor-pointer transition-all duration-200 animate-slide-in",
                        isCollapsed
                          ? "w-10 h-10 rounded-2xl bg-gradient-to-br from-muted/20 to-muted/10 mx-auto flex items-center justify-center hover:from-muted/30 hover:to-muted/20 shadow-sm hover:shadow-md"
                          : "p-3 rounded-2xl hover:bg-muted/30",
                        currentConversationId === conversation.id && 
                          (isCollapsed 
                            ? "bg-gradient-to-br from-primary/30 to-primary/20 border border-primary/40 shadow-md"
                            : "bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20")
                      )}
                      onClick={() => onConversationSelect?.(conversation.id)}
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      {isCollapsed ? (
                        <MessageSquare className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
                      ) : (
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
                              <MessageSquare className="h-4 w-4 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm truncate">
                                {conversation.title || "Untitled Chat"}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>{formatDate(conversation.updatedAt)}</span>
                                <span>•</span>
                                <span>{conversation._count.messages} messages</span>
                              </div>
                            </div>
                          </div>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreHorizontal className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={(e) => handleDeleteConversation(conversation.id, e)}
                              >
                                <Trash2 className="h-3 w-3 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  !isCollapsed && !isLoading && !error && (
                    <div className="text-center text-muted-foreground text-sm py-8">
                      {searchValue ? "No conversations found" : "No conversations yet"}
                      <div className="text-xs mt-2 opacity-60">
                        Start a new chat to see your conversations here
                      </div>
                    </div>
                  )
                )}
              </div>
            ) : (
              // Placeholder for non-logged in users
              !isCollapsed && (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="animate-pulse opacity-40 p-4 rounded-2xl bg-gradient-to-r from-muted/20 to-muted/10"
                      style={{ animationDelay: `${i * 0.1}s` }}
                    >
                      <div className="h-3 bg-muted-foreground/20 rounded-full w-3/4 mb-2"></div>
                      <div className="h-2 bg-muted-foreground/10 rounded-full w-1/2"></div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>

          {/* User Section */}
          {user && (
            <div className="border-t border-border/50 pt-4 mt-auto">
              {isCollapsed ? (
                <div className="flex justify-center">
                  <UserDropdown user={user} onLogout={onLogout} />
                </div>
              ) : (
                <UserDropdown user={user} onLogout={onLogout} />
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
