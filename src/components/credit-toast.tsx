"use client"

import { useEffect, useState } from "react"
import { Badge } from "~/components/ui/badge"
import { Zap, CheckCircle, AlertTriangle, X } from "lucide-react"
import { Button } from "~/components/ui/button"
import { cn } from "~/lib/utils"

interface CreditToastProps {
  show: boolean
  creditsUsed: number
  creditsRemaining: number
  modelName: string
  onClose: () => void
}

export function CreditToast({ show, creditsUsed, creditsRemaining, modelName, onClose }: CreditToastProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (show) {
      setVisible(true)
      const timer = setTimeout(() => {
        setVisible(false)
        setTimeout(onClose, 300) // Wait for animation to complete
      }, 3000)
      
      return () => clearTimeout(timer)
    }
  }, [show, onClose])

  if (!show && !visible) return null

  const isLow = creditsRemaining <= 5
  const isCritical = creditsRemaining <= 2

  return (
    <div
      className={cn(
        "fixed top-4 right-4 z-50 transition-all duration-300 ease-out",
        visible ? "animate-slide-down opacity-100" : "opacity-0 translate-y-[-100%]"
      )}
    >
      <div className="bg-card/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-xl p-4 min-w-[300px] animate-bounce-in">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-full",
              isCritical ? "bg-red-100 dark:bg-red-950/30" : "bg-green-100 dark:bg-green-950/30"
            )}>
              {isCritical ? (
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              ) : (
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-sm">Message sent</span>
                <Badge variant="outline" className="text-xs">
                  <Zap className="h-3 w-3 mr-1" />
                  -{creditsUsed} {creditsUsed === 1 ? 'credit' : 'credits'}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground">
                Model: {modelName}
              </div>
              <div className={cn(
                "text-xs font-medium mt-1",
                isCritical 
                  ? "text-red-600 dark:text-red-400" 
                  : isLow 
                  ? "text-orange-600 dark:text-orange-400" 
                  : "text-green-600 dark:text-green-400"
              )}>
                {creditsRemaining} {creditsRemaining === 1 ? 'credit' : 'credits'} remaining
                {isCritical && " - Running low!"}
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setVisible(false)
              setTimeout(onClose, 300)
            }}
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  )
} 