"use client"

import React, { useState, useEffect, useMemo } from "react"
import { MarkdownRenderer } from "./markdown-renderer"
import { CodeBlock } from "./code-block"

interface StreamingMarkdownProps {
  content: string
  className?: string
  isStreaming?: boolean
}

export function StreamingMarkdown({ content, className, isStreaming = false }: StreamingMarkdownProps) {
  const [processedContent, setProcessedContent] = useState("")

  // Process streaming content to handle incomplete code blocks
  const processStreamingContent = useMemo(() => {
    if (!content) return ""

    // If not streaming, return as-is
    if (!isStreaming) {
      return content
    }

    // Handle incomplete code blocks during streaming
    const lines = content.split('\n')
    let processed = ""
    let inCodeBlock = false
    let codeBlockLanguage = ""
    let codeBlockContent = ""
    let i = 0

    while (i < lines.length) {
      const line = lines[i]
      if (!line) {
        i++
        continue
      }

      // Check for code block start
      const codeBlockMatch = line.match(/^```(\w*)/)
      if (codeBlockMatch && !inCodeBlock) {
        inCodeBlock = true
        codeBlockLanguage = codeBlockMatch[1] || "text"
        codeBlockContent = ""
        i++
        continue
      }

      // Check for code block end
      if (line.trim() === "```" && inCodeBlock) {
        inCodeBlock = false
        // Add the completed code block to processed content
        processed += `\n\`\`\`${codeBlockLanguage}\n${codeBlockContent}\n\`\`\`\n`
        codeBlockContent = ""
        codeBlockLanguage = ""
        i++
        continue
      }

      // If we're in a code block, accumulate content
      if (inCodeBlock) {
        codeBlockContent += (codeBlockContent ? '\n' : '') + line
        i++
        continue
      }

      // Regular content
      processed += (processed ? '\n' : '') + line
      i++
    }

    // Handle incomplete code block at the end
    if (inCodeBlock && codeBlockContent) {
      // For incomplete code blocks during streaming, show a preview
      processed += `\n\n**Code (${codeBlockLanguage || 'text'}) - Generating...**\n\n\`\`\`${codeBlockLanguage}\n${codeBlockContent}\n\`\`\`\n`
    }

    return processed
  }, [content, isStreaming])

  // Handle streaming with debounced updates for better performance
  useEffect(() => {
    if (isStreaming) {
      const timer = setTimeout(() => {
        setProcessedContent(processStreamingContent)
      }, 50) // Small delay to batch updates
      
      return () => clearTimeout(timer)
    } else {
      setProcessedContent(processStreamingContent)
    }
  }, [processStreamingContent, isStreaming])

  // For very short content or single lines, render directly
  if (content.length < 50 && !content.includes('```')) {
    return (
      <div className={className}>
        <span className="whitespace-pre-wrap">{content}</span>
        {isStreaming && (
          <span className="inline-block w-2 h-4 bg-primary/60 animate-pulse ml-1 align-middle" />
        )}
      </div>
    )
  }

  return (
    <div className={className}>
      <MarkdownRenderer>{processedContent || content}</MarkdownRenderer>
      {isStreaming && (
        <div className="inline-block w-2 h-4 bg-primary/60 animate-pulse ml-1 mt-2" />
      )}
    </div>
  )
}

// Alternative component for when we want to show partial code during streaming
export function StreamingCodePreview({ 
  content, 
  language = "text",
  isComplete = false 
}: { 
  content: string
  language?: string
  isComplete?: boolean 
}) {
  if (!content.trim()) return null

  return (
    <div className="relative">
      <CodeBlock 
        language={language} 
        showValidator={isComplete}
        showLineNumbers={content.split('\n').length > 3}
      >
        {content}
      </CodeBlock>
      {!isComplete && (
        <div className="absolute bottom-2 right-2 bg-background/80 backdrop-blur px-2 py-1 rounded text-xs text-muted-foreground">
          Generating...
        </div>
      )}
    </div>
  )
} 