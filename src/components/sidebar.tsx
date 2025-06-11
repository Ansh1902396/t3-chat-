"use client"
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { UserDropdown } from "./user-dropdown"
import { Search, Menu, Plus, PanelLeftClose, PanelLeftOpen, MessageSquare, Trash2, MoreHorizontal } from "lucide-react"
import { useState } from "react"
import { api } from "~/trpc/react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "~/components/ui/dropdown-menu"
import { cn } from "~/lib/utils"

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

  // Fetch conversations with refetch optimization
  const { data: conversationsData, refetch: refetchConversations } = api.aiChat.listConversations.useQuery(
    { limit: 50, offset: 0 },
    { 
      enabled: !!user,
      refetchOnWindowFocus: false,
      staleTime: 30000, // 30 seconds
    }
  )

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
        transform transition-all duration-300 ease-out will-change-transform sidebar-container
        ${isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"}
        lg:translate-x-0 lg:static lg:z-auto lg:shadow-none lg:bg-background lg:backdrop-blur-none
        ${isCollapsed ? "lg:w-20" : "lg:w-72"}
      `}
        style={{ 
          width: isOpen ? "288px" : isCollapsed ? "80px" : "288px",
          minWidth: isCollapsed ? "80px" : "288px",
          maxWidth: isCollapsed ? "80px" : "288px"
        }}
      >
        <div className="flex flex-col h-full p-4">
          {/* Header */}
          <div className={`flex items-center mb-6 ${isCollapsed ? "justify-center" : "justify-between"}`}>
            {!isCollapsed && (
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden hover:bg-gradient-to-r hover:from-muted/50 hover:to-muted/30 transition-all rounded-full"
                  onClick={onToggle}
                >
                  <Menu className="h-4 w-4" />
                </Button>
                <h1 className="text-xl font-black tracking-tight gradient-text-t3">T3.chat</h1>
              </div>
            )}

            {isCollapsed && <h1 className="text-lg font-black tracking-tight gradient-text-t3">T3</h1>}

            {/* Collapse Toggle - Desktop Only */}
            <Button
              variant="ghost"
              size="icon"
              className="hidden lg:flex hover:bg-gradient-to-r hover:from-muted/50 hover:to-muted/30 transition-all rounded-full"
              onClick={onToggleCollapse}
            >
              {isCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </Button>
          </div>

          {/* New Chat Button */}
          <div className="mb-6">
            <Button
              onClick={onNewChat}
              className={`bg-gradient-to-r from-primary via-primary to-primary/80 hover:from-primary/90 hover:via-primary/90 hover:to-primary/70
                       text-white font-semibold rounded-full py-3 group transition-all duration-200 shadow-lg hover:shadow-xl
                       hover:scale-[1.02] active:scale-[0.98] ${isCollapsed ? "w-12 h-12 p-0" : "w-full"}`}
              title={isCollapsed ? "New Chat" : undefined}
            >
              <Plus className={`h-4 w-4 transition-transform group-hover:rotate-90 ${isCollapsed ? "" : "mr-2"}`} />
              {!isCollapsed && "New Chat"}
            </Button>
          </div>

          {/* Search */}
          {!isCollapsed && (
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search your threads..."
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  className="pl-12 input-t3 rounded-full py-3 font-medium focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
          )}

          {/* Search Icon for Collapsed */}
          {isCollapsed && (
            <div className="mb-6 flex justify-center">
              <Button
                variant="ghost"
                size="icon"
                className="w-12 h-12 hover:bg-gradient-to-r hover:from-muted/50 hover:to-muted/30 transition-all rounded-full"
                title="Search"
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Chat History */}
          <div className="flex-1 mb-6 overflow-hidden">
            {user ? (
              <div className="space-y-2 h-full overflow-y-auto custom-scrollbar scroll-container">
                {!isCollapsed && filteredConversations.length > 0 && (
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-2 mb-3">
                    Recent Chats
                  </h3>
                )}
                
                {filteredConversations.length > 0 ? (
                  filteredConversations.map((conversation, index) => (
                    <div
                      key={conversation.id}
                      className={cn(
                        "group cursor-pointer transition-all duration-200 animate-slide-in",
                        isCollapsed
                          ? "w-12 h-12 rounded-full bg-gradient-to-br from-muted/20 to-muted/10 mx-auto flex items-center justify-center hover:from-muted/30 hover:to-muted/20"
                          : "p-3 rounded-2xl hover:bg-muted/30",
                        currentConversationId === conversation.id && 
                          (isCollapsed 
                            ? "bg-gradient-to-br from-primary/20 to-primary/10 border-2 border-primary/30"
                            : "bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20")
                      )}
                      onClick={() => onConversationSelect?.(conversation.id)}
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      {isCollapsed ? (
                        <MessageSquare className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
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
                  !isCollapsed && (
                    <div className="text-center text-muted-foreground text-sm py-8">
                      {searchValue ? "No conversations found" : "No conversations yet"}
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
            <div className="border-t border-border/50 pt-4">
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
