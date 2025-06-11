"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { Button } from "~/components/ui/button"

export function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true)
      await signIn("google", { callbackUrl: "/" })
    } catch (error) {
      console.error("Error signing in:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md animate-fade-in">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-black mb-4 gradient-text-t3">T3.chat</h1>
          <h2 className="text-3xl font-bold mb-4 text-balance tracking-tight">Welcome back</h2>
          <p className="text-muted-foreground text-lg font-medium text-balance leading-relaxed">
            Sign in to continue your AI conversations and unlock powerful features
          </p>
        </div>

        {/* Google Sign In Button */}
        <Button
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="w-full relative overflow-hidden bg-gradient-to-r from-white to-gray-50 hover:from-gray-50 hover:to-gray-100 
                   dark:from-gray-900 dark:to-gray-800 dark:hover:from-gray-800 dark:hover:to-gray-700
                   text-gray-700 dark:text-gray-200 border-2 border-gray-200 dark:border-gray-700
                   hover:border-gray-300 dark:hover:border-gray-600 py-5 rounded-2xl font-bold tracking-wide 
                   text-lg shadow-xl hover:shadow-2xl disabled:opacity-70 group transition-all duration-300
                   hover:scale-[1.02] active:scale-[0.98]"
        >
          {isLoading ? (
            <div className="flex items-center justify-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-400 border-t-transparent" />
              <span>Signing in...</span>
            </div>
          ) : (
            <>
              {/* Google Icon */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-red-500/5 to-yellow-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <svg className="mr-4 h-6 w-6 transition-transform group-hover:scale-110 duration-200" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span className="relative z-10">Continue with Google</span>
            </>
          )}
        </Button>

        {/* Features */}
        <div className="mt-12 space-y-4">
          <div className="text-center">
            <h3 className="text-lg font-bold mb-6 text-muted-foreground">Why sign in?</h3>
            <div className="grid gap-4">
              {[
                { icon: "🚀", title: "Higher message limits", desc: "Get more conversations per day" },
                { icon: "💾", title: "Save your chats", desc: "Access your conversation history" },
                { icon: "⚡", title: "Premium models", desc: "Unlock advanced AI capabilities" },
              ].map((feature, index) => (
                <div
                  key={index}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-muted/20 border border-border/50 
                           hover:bg-muted/30 transition-all duration-200 animate-fade-in"
                  style={{ animationDelay: `${(index + 1) * 0.2}s` }}
                >
                  <span className="text-2xl">{feature.icon}</span>
                  <div className="text-left">
                    <div className="font-semibold text-sm">{feature.title}</div>
                    <div className="text-xs text-muted-foreground">{feature.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Terms */}
        <div className="text-center mt-10">
          <p className="text-xs text-muted-foreground font-medium">
            By continuing, you agree to our{" "}
            <Button variant="link" className="p-0 h-auto text-xs font-semibold underline underline-offset-4">
              Terms of Service
            </Button>{" "}
            and{" "}
            <Button variant="link" className="p-0 h-auto text-xs font-semibold underline underline-offset-4">
              Privacy Policy
            </Button>
          </p>
          <p className="text-xs text-muted-foreground/70 font-medium mt-2">
            🔒 Secure authentication powered by Google OAuth 2.0
          </p>
        </div>
      </div>
    </div>
  )
}
