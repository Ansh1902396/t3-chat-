"use client"

import React from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { CodeBlock, InlineCode } from "./code-block"
import { cn } from "~/lib/utils"

interface MarkdownRendererProps {
  children: string
  className?: string
}

export function MarkdownRenderer({ children, className }: MarkdownRendererProps) {
  return (
    <div className={cn("prose prose-sm max-w-none", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Code blocks
          code({ className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || "")
            const language = match ? match[1] : ""
            const inline = !className

            if (inline) {
              return <InlineCode {...props}>{children}</InlineCode>
            }

            return (
              <CodeBlock 
                language={language} 
                collapsible={true}
                defaultExpanded={String(children).split('\n').length <= 20}
                maxHeight={400}
                {...props}
              >
                {String(children).replace(/\n$/, "")}
              </CodeBlock>
            )
          },
          
          // Pre tags (fallback for code blocks)
          pre({ children }) {
            return <div className="not-prose">{children}</div>
          },

          // Headings
          h1({ children }) {
            return <h1 className="text-xl font-bold text-foreground mb-4 mt-6 first:mt-0">{children}</h1>
          },
          h2({ children }) {
            return <h2 className="text-lg font-semibold text-foreground mb-3 mt-5 first:mt-0">{children}</h2>
          },
          h3({ children }) {
            return <h3 className="text-base font-medium text-foreground mb-2 mt-4 first:mt-0">{children}</h3>
          },

          // Paragraphs
          p({ children }) {
            return <p className="text-foreground mb-3 last:mb-0 leading-relaxed">{children}</p>
          },

          // Lists
          ul({ children }) {
            return <ul className="list-disc pl-6 mb-3 space-y-1 text-foreground">{children}</ul>
          },
          ol({ children }) {
            return <ol className="list-decimal pl-6 mb-3 space-y-1 text-foreground">{children}</ol>
          },
          li({ children }) {
            return <li className="text-foreground">{children}</li>
          },

          // Links
          a({ href, children }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-primary/80 underline underline-offset-2 transition-colors"
              >
                {children}
              </a>
            )
          },

          // Blockquotes
          blockquote({ children }) {
            return (
              <blockquote className="border-l-4 border-primary/30 pl-4 py-2 mb-3 text-muted-foreground italic bg-muted/20 rounded-r">
                {children}
              </blockquote>
            )
          },

          // Tables
          table({ children }) {
            return (
              <div className="overflow-x-auto mb-3">
                <table className="min-w-full border border-border rounded-lg overflow-hidden">
                  {children}
                </table>
              </div>
            )
          },
          thead({ children }) {
            return <thead className="bg-muted/50">{children}</thead>
          },
          tbody({ children }) {
            return <tbody className="divide-y divide-border">{children}</tbody>
          },
          tr({ children }) {
            return <tr className="hover:bg-muted/30 transition-colors">{children}</tr>
          },
          th({ children }) {
            return <th className="px-4 py-2 text-left font-semibold text-foreground border-r border-border last:border-r-0">{children}</th>
          },
          td({ children }) {
            return <td className="px-4 py-2 text-foreground border-r border-border last:border-r-0">{children}</td>
          },

          // Horizontal rule
          hr() {
            return <hr className="border-border my-4" />
          },

          // Strong/Bold
          strong({ children }) {
            return <strong className="font-semibold text-foreground">{children}</strong>
          },

          // Emphasis/Italic
          em({ children }) {
            return <em className="italic text-foreground">{children}</em>
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
} 