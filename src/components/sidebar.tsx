"use client"
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { UserDropdown } from "./user-dropdown"
import { Search, Menu, Plus, PanelLeftClose, PanelLeftOpen } from "lucide-react"
import { useState } from "react"

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
}

export function Sidebar({ isOpen, onToggle, isCollapsed, onToggleCollapse, user, onLogout }: SidebarProps) {
  const [searchValue, setSearchValue] = useState("")

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
        transform transition-all duration-300 ease-out
        ${isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"}
        lg:translate-x-0 lg:static lg:z-auto lg:shadow-none lg:bg-background lg:backdrop-blur-none
        ${isCollapsed ? "lg:w-20" : "lg:w-72"}
      `}
        style={{ width: isOpen ? "288px" : isCollapsed ? "80px" : "288px" }}
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

          {/* Chat History Placeholder */}
          <div className="flex-1 mb-6">
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className={`animate-pulse opacity-40 transition-all hover:opacity-60 ${
                    isCollapsed
                      ? "w-12 h-12 rounded-full bg-gradient-to-br from-muted/20 to-muted/10 mx-auto"
                      : "p-4 rounded-2xl bg-gradient-to-r from-muted/20 to-muted/10 hover:from-muted/30 hover:to-muted/20"
                  }`}
                  style={{ animationDelay: `${i * 0.1}s` }}
                >
                  {!isCollapsed && (
                    <>
                      <div className="h-3 bg-muted-foreground/20 rounded-full w-3/4 mb-2"></div>
                      <div className="h-2 bg-muted-foreground/10 rounded-full w-1/2"></div>
                    </>
                  )}
                </div>
              ))}
            </div>
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
