"use client"

import { Button } from "~/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { useState } from "react"

export function WelcomeScreen() {
  const [isLoading, setIsLoading] = useState(false)

  const handleGoogleSignIn = () => {
    setIsLoading(true)
    setTimeout(() => setIsLoading(false), 2000)
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="p-8 animate-fade-in">
        <Button
          variant="ghost"
          className="flex items-center gap-3 text-muted-foreground hover:text-foreground 
                   hover:bg-muted/40 transition-all duration-200 group rounded-full px-4 py-3"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          <span className="font-semibold">Back to Chat</span>
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-lg mx-auto animate-fade-in" style={{ animationDelay: "0.2s" }}>
          <div className="mb-12">
            <h1 className="text-6xl font-black mb-8 text-balance tracking-tight">
              Welcome to <span className="gradient-text-t3">T3.chat</span>
            </h1>

            <p className="text-muted-foreground text-xl font-semibold text-balance leading-relaxed">
              Sign in below (we'll increase your message limits if you do{" "}
              <span className="text-3xl inline-block animate-bounce" style={{ animationDelay: "1s" }}>
                😊
              </span>
              )
            </p>
          </div>

          <Button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full btn-t3-primary text-white py-5 rounded-full mb-10 font-bold tracking-wide 
                     text-lg shadow-2xl disabled:opacity-70 group"
          >
            {isLoading ? (
              <div className="flex items-center justify-center gap-3">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent" />
                <span>Signing in...</span>
              </div>
            ) : (
              <>
                <svg className="mr-3 h-6 w-6 transition-transform group-hover:scale-110" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continue with Google
              </>
            )}
          </Button>

          <div className="space-y-3">
            <p className="text-sm text-muted-foreground font-semibold">
              By continuing, you agree to our{" "}
              <Button
                variant="link"
                className="p-0 h-auto text-sm text-muted-foreground hover:text-foreground 
                         underline underline-offset-4 font-semibold transition-colors"
              >
                Terms of Service
              </Button>{" "}
              and{" "}
              <Button
                variant="link"
                className="p-0 h-auto text-sm text-muted-foreground hover:text-foreground 
                         underline underline-offset-4 font-semibold transition-colors"
              >
                Privacy Policy
              </Button>
            </p>

            <p className="text-xs text-muted-foreground/70 font-medium">
              🔒 Secure authentication powered by Google OAuth 2.0
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
