import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "~/styles/globals.css"
import { ThemeProvider } from "next-themes"
import { SessionProvider } from "next-auth/react"
import { TRPCReactProvider } from "~/trpc/react"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "T3 Chat - AI Conversations",
  description: "A modern AI chat application built with T3 stack",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <SessionProvider>
          <TRPCReactProvider>
            <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
              {children}
            </ThemeProvider>
          </TRPCReactProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
