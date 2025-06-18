"use client"

import { useSession, signOut } from "next-auth/react"
import { ChatInterface } from "~/components/chat-interface"
import { LoginPage } from "~/components/login-page"
import { CommandPaletteProvider } from "~/components/command-palette-provider"
import { api } from "~/trpc/react"

export default function Page() {
  const { data: session, status } = useSession()
  const { data: userData, refetch: refetchUser } = api.auth.getUser.useQuery(undefined, {
    enabled: !!session?.user,
  })
  const { data: userStats } = api.auth.getUserStats.useQuery(undefined, {
    enabled: !!session?.user,
  })

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/" })
  }

  // Show loading state while session is being fetched
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  // Show login page if not authenticated
  if (!session?.user) {
    return <LoginPage />
  }

  // Transform session user to match ChatInterface expectations
  const user = {
    id: userData?.id || session.user.id!,
    name: userData?.name || session.user.name || "User",
    email: userData?.email || session.user.email || "",
    avatar: userData?.image || session.user.image || "",
    plan: userStats?.plan || "free",
    credits: userData?.credits || 20, // Default to 20 as set in database
  }

  return (
    <CommandPaletteProvider>
      <ChatInterface 
        user={user} 
        onLogout={handleLogout} 
        onCreditsUpdated={async () => {
          console.log('Credits updated, refetching user data...');
          await refetchUser();
          console.log('User data refetched');
        }} 
      />
    </CommandPaletteProvider>
  )
}
