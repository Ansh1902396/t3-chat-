"use client"

import { Button } from "~/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar"
import { Badge } from "~/components/ui/badge"
import { Settings, CreditCard, LogOut, Crown, Zap } from "lucide-react"

interface UserType {
  id: string
  name: string
  email: string
  avatar: string
  plan: string
  credits: number
}

interface UserDropdownProps {
  user: UserType
  onLogout: () => void
}

export function UserDropdown({ user, onLogout }: UserDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-start p-3 h-auto hover:bg-gradient-to-r hover:from-muted/40 hover:to-muted/20 \
                   transition-all duration-200 rounded-2xl group border border-transparent hover:border-border/50"
        >
          <div className="flex items-center gap-3 w-full">
            <Avatar
              className="transition-all duration-300 h-10 w-10 min-h-[40px] min-w-[40px] max-h-[48px] max-w-[48px] rounded-full flex items-center justify-center border-2 border-border/50 ring-2 ring-transparent group-hover:ring-primary/20 \
              sidebar-collapsed:h-10 sidebar-collapsed:w-10 sidebar-collapsed:min-h-[40px] sidebar-collapsed:min-w-[40px] sidebar-collapsed:max-h-[40px] sidebar-collapsed:max-w-[40px]"
            >
              <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name} />
              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-bold">
                {user.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 text-left min-w-0">
              <div className="font-semibold text-sm truncate">{user.name}</div>
              <div className="text-xs text-muted-foreground truncate">{user.email}</div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Badge
                variant={user.plan === "Pro" ? "default" : "secondary"}
                className={`text-xs px-2 py-0.5 rounded-full font-bold transition-all ${
                  user.plan === "Pro"
                    ? "bg-gradient-to-r from-primary/20 to-primary/10 text-primary border-primary/30 shadow-sm"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {user.plan === "Pro" && <Crown className="mr-1 h-2.5 w-2.5" />}
                {user.plan}
              </Badge>
              <div className="text-xs text-muted-foreground font-medium">{user.credits} credits</div>
            </div>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-80 p-0 animate-scale-in border-border/50 shadow-2xl card-t3 rounded-2xl"
      >
        {/* User Info Header */}
        <div className="p-4 border-b border-border/30 bg-gradient-to-r from-muted/20 to-transparent">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12 border-2 border-border/50">
              <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name} />
              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-bold text-lg">
                {user.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="font-bold text-base">{user.name}</div>
              <div className="text-sm text-muted-foreground">{user.email}</div>
              <div className="flex items-center gap-2 mt-1">
                <Badge
                  variant={user.plan === "Pro" ? "default" : "secondary"}
                  className={`text-xs px-2 py-1 rounded-full font-bold ${
                    user.plan === "Pro"
                      ? "bg-gradient-to-r from-primary/20 to-primary/10 text-primary border-primary/30"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {user.plan === "Pro" && <Crown className="mr-1 h-3 w-3" />}
                  {user.plan} Plan
                </Badge>
                <div className="text-xs text-muted-foreground font-semibold">
                  <Zap className="inline h-3 w-3 mr-1" />
                  {user.credits} credits
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <div className="p-2">
          <DropdownMenuItem className="p-3 rounded-xl cursor-pointer hover:bg-gradient-to-r hover:from-muted/40 hover:to-muted/20 transition-all">
            <Settings className="mr-3 h-4 w-4" />
            <span className="font-semibold">Profile Settings</span>
          </DropdownMenuItem>

          <DropdownMenuItem className="p-3 rounded-xl cursor-pointer hover:bg-gradient-to-r hover:from-muted/40 hover:to-muted/20 transition-all">
            <Settings className="mr-3 h-4 w-4" />
            <span className="font-semibold">Preferences</span>
          </DropdownMenuItem>

          <DropdownMenuItem className="p-3 rounded-xl cursor-pointer hover:bg-gradient-to-r hover:from-muted/40 hover:to-muted/20 transition-all">
            <CreditCard className="mr-3 h-4 w-4" />
            <span className="font-semibold">Billing & Usage</span>
          </DropdownMenuItem>

          {user.plan !== "Pro" && (
            <>
              <DropdownMenuSeparator className="my-2 bg-border/30" />
              <DropdownMenuItem className="p-3 rounded-xl cursor-pointer bg-gradient-to-r from-primary/5 to-primary/10 hover:from-primary/10 hover:to-primary/15 transition-all border border-primary/20">
                <Crown className="mr-3 h-4 w-4 text-primary" />
                <div className="flex-1">
                  <div className="font-bold text-primary">Upgrade to Pro</div>
                  <div className="text-xs text-primary/70">Unlock all models + higher limits</div>
                </div>
              </DropdownMenuItem>
            </>
          )}
        </div>

        <DropdownMenuSeparator className="bg-border/30" />

        <div className="p-2">
          <DropdownMenuItem
            className="p-3 rounded-xl cursor-pointer hover:bg-gradient-to-r hover:from-destructive/10 hover:to-destructive/5 
                     text-destructive hover:text-destructive transition-all"
            onClick={onLogout}
          >
            <LogOut className="mr-3 h-4 w-4" />
            <span className="font-semibold">Sign out</span>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
