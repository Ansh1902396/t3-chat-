"use client"

import React, { useState } from "react"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { oneDark, oneLight } from "react-syntax-highlighter/dist/esm/styles/prism"
import { Button } from "./button"
import { Copy, Check, Download, ChevronDown, ChevronUp } from "lucide-react"
import { useTheme } from "next-themes"
import copy from "copy-to-clipboard"
import { cn } from "~/lib/utils"
import { CodeValidator } from "./code-validator"

interface CodeBlockProps {
  children: string
  language?: string
  filename?: string
  className?: string
  showLineNumbers?: boolean
  showValidator?: boolean
  showRunButton?: boolean
  onRun?: () => void
  collapsible?: boolean
  defaultExpanded?: boolean
  maxHeight?: number
}

export function CodeBlock({ 
  children, 
  language = "text", 
  filename, 
  className,
  showLineNumbers = true,
  showValidator = true,
  showRunButton = false,
  onRun,
  collapsible = true,
  defaultExpanded = true,
  maxHeight = 500
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false)
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const { theme } = useTheme()

  const handleCopy = () => {
    copy(children)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const element = document.createElement("a")
    const file = new Blob([children], { type: "text/plain" })
    element.href = URL.createObjectURL(file)
    element.download = filename || `code.${getFileExtension(language)}`
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  const getFileExtension = (lang: string): string => {
    const extensions: Record<string, string> = {
      javascript: "js",
      typescript: "ts",
      jsx: "jsx",
      tsx: "tsx",
      python: "py",
      java: "java",
      cpp: "cpp",
      c: "c",
      csharp: "cs",
      php: "php",
      ruby: "rb",
      go: "go",
      rust: "rs",
      sql: "sql",
      html: "html",
      css: "css",
      scss: "scss",
      json: "json",
      xml: "xml",
      yaml: "yml",
      markdown: "md",
      bash: "sh",
      shell: "sh",
      powershell: "ps1",
    }
    return extensions[lang.toLowerCase()] || "txt"
  }

  const getLanguageIcon = (lang: string): string => {
    const icons: Record<string, string> = {
      javascript: "🟨",
      typescript: "🔷",
      jsx: "⚛️",
      tsx: "⚛️",
      python: "🐍",
      java: "☕",
      cpp: "⚙️",
      c: "⚙️",
      csharp: "🔷",
      php: "🐘",
      ruby: "💎",
      go: "🐹",
      rust: "🦀",
      sql: "🗄️",
      html: "🌐",
      css: "🎨",
      scss: "🎨",
      json: "📋",
      xml: "📄",
      yaml: "⚙️",
      markdown: "📝",
      bash: "💻",
      shell: "💻",
      powershell: "💻",
    }
    return icons[lang.toLowerCase()] || "📄"
  }

  return (
    <div className={cn("group relative", className)}>
      {/* Header */}
      <div className={cn(
        "flex items-center justify-between px-4 py-2 bg-muted/30 border border-border/50",
        isExpanded ? "rounded-t-lg" : "rounded-lg"
      )}>
        <div className="flex items-center gap-2">
          {collapsible && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-6 w-6 p-0 hover:bg-muted/50"
              title={isExpanded ? "Collapse code" : "Expand code"}
            >
              {isExpanded ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </Button>
          )}
          <span className="text-sm">{getLanguageIcon(language)}</span>
          <span className="text-sm font-medium text-muted-foreground">
            {filename || language.toUpperCase()}
          </span>
          {!isExpanded && (
            <span className="text-xs text-muted-foreground/60 ml-2">
              {children.split('\n').length} lines
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-7 w-7 p-0 hover:bg-muted/50"
            title="Copy code"
          >
            {copied ? (
              <Check className="h-3 w-3 text-green-500" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownload}
            className="h-7 w-7 p-0 hover:bg-muted/50"
            title="Download file"
          >
            <Download className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Code Content */}
      {isExpanded && (
        <div className="relative overflow-hidden rounded-b-lg border-x border-b border-border/50">
          <div 
            className="overflow-auto scrollbar-code" 
            style={{ maxHeight: `${maxHeight}px` }}
          >
            <SyntaxHighlighter
              language={language}
              style={theme === "dark" ? oneDark : oneLight}
              showLineNumbers={showLineNumbers}
              wrapLines={true}
              wrapLongLines={true}
              customStyle={{
                margin: 0,
                padding: "1rem",
                fontSize: "0.875rem",
                lineHeight: "1.5",
                backgroundColor: "transparent",
              }}
              lineNumberStyle={{
                minWidth: "2.5rem",
                paddingRight: "1rem",
                color: theme === "dark" ? "#6b7280" : "#9ca3af",
                fontSize: "0.75rem",
              }}
              codeTagProps={{
                style: {
                  fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', Consolas, monospace",
                }
              }}
            >
              {children}
            </SyntaxHighlighter>
          </div>
        </div>
      )}
      
      {/* Code Validator */}
      {isExpanded && showValidator && language !== "text" && (
        <CodeValidator 
          code={children} 
          language={language}
          showRunButton={showRunButton}
          onRun={onRun}
        />
      )}
    </div>
  )
}

// Inline code component for smaller code snippets
interface InlineCodeProps {
  children: React.ReactNode
  className?: string
}

export function InlineCode({ children, className }: InlineCodeProps) {
  return (
    <code
      className={cn(
        "relative rounded px-1.5 py-0.5 text-sm font-mono",
        "bg-muted/50 text-muted-foreground",
        "border border-border/50",
        className
      )}
    >
      {children}
    </code>
  )
} 