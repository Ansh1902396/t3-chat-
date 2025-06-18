"use client"

import { Badge } from "~/components/ui/badge"
import { Zap, AlertTriangle } from "lucide-react"
import { cn } from "~/lib/utils"

interface CreditsDisplayProps {
  credits: number
  className?: string
}

export function CreditsDisplay({ credits, className }: CreditsDisplayProps) {
  const isLow = credits <= 5
  const isCritical = credits <= 2

  return (
    <Badge
      variant="outline"
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 text-sm font-semibold transition-smooth hover-scale",
        isCritical
          ? "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 border-red-300 animate-pulse"
          : isLow
          ? "bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300 border-orange-300"
          : "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 border-green-300",
        className
      )}
    >
      {isCritical ? (
        <AlertTriangle className="h-3.5 w-3.5" />
      ) : (
        <Zap className="h-3.5 w-3.5" />
      )}
      <span>{credits} {credits === 1 ? 'credit' : 'credits'}</span>
    </Badge>
  )
} 