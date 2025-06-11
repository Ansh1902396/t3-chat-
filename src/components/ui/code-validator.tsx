"use client"

import React, { useState, useEffect } from "react"
import { Button } from "./button"
import { Badge } from "./badge"
import { AlertTriangle, CheckCircle, XCircle, Info, Play, Copy } from "lucide-react"
import { cn } from "~/lib/utils"
import copy from "copy-to-clipboard"

interface CodeValidationResult {
  line: number
  column: number
  message: string
  severity: "error" | "warning" | "info"
  rule?: string
}

interface CodeValidatorProps {
  code: string
  language: string
  onValidate?: (results: CodeValidationResult[]) => void
  showRunButton?: boolean
  onRun?: () => void
  className?: string
}

export function CodeValidator({ 
  code, 
  language, 
  onValidate, 
  showRunButton = false,
  onRun,
  className 
}: CodeValidatorProps) {
  const [validationResults, setValidationResults] = useState<CodeValidationResult[]>([])
  const [isValidating, setIsValidating] = useState(false)
  const [copied, setCopied] = useState(false)

  // Basic syntax validation for common languages
  const validateCode = async (code: string, language: string): Promise<CodeValidationResult[]> => {
    const results: CodeValidationResult[] = []
    
    try {
      switch (language.toLowerCase()) {
        case 'javascript':
        case 'typescript':
        case 'jsx':
        case 'tsx':
          // Basic JS/TS validation
          validateJavaScript(code, results)
          break
        case 'python':
          validatePython(code, results)
          break
        case 'json':
          validateJSON(code, results)
          break
        case 'css':
          validateCSS(code, results)
          break
        default:
          // General syntax checks
          validateGeneral(code, results)
          break
      }
    } catch (error) {
      results.push({
        line: 1,
        column: 1,
        message: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: "error"
      })
    }

    return results
  }

  const validateJavaScript = (code: string, results: CodeValidationResult[]) => {
    const lines = code.split('\n')
    
    lines.forEach((line, index) => {
      const lineNum = index + 1
      
      // Check for common issues
      if (line.includes('console.log') && !line.includes('//')) {
        results.push({
          line: lineNum,
          column: line.indexOf('console.log') + 1,
          message: 'Consider removing console.log statements in production code',
          severity: "warning",
          rule: 'no-console'
        })
      }
      
      // Check for var usage
      if (line.includes('var ') && !line.includes('//')) {
        results.push({
          line: lineNum,
          column: line.indexOf('var ') + 1,
          message: 'Use const or let instead of var',
          severity: "warning",
          rule: 'no-var'
        })
      }
      
      // Check for missing semicolons (basic check)
      const trimmed = line.trim()
      if (trimmed && 
          !trimmed.endsWith(';') && 
          !trimmed.endsWith('{') && 
          !trimmed.endsWith('}') && 
          !trimmed.startsWith('//') && 
          !trimmed.startsWith('if') && 
          !trimmed.startsWith('for') && 
          !trimmed.startsWith('while') && 
          !trimmed.startsWith('function') && 
          !trimmed.startsWith('class') &&
          !trimmed.startsWith('import') &&
          !trimmed.startsWith('export') &&
          trimmed.includes('=') || trimmed.includes('return ')) {
        results.push({
          line: lineNum,
          column: line.length,
          message: 'Missing semicolon',
          severity: "info",
          rule: 'semi'
        })
      }
    })
  }

  const validatePython = (code: string, results: CodeValidationResult[]) => {
    const lines = code.split('\n')
    
    lines.forEach((line, index) => {
      const lineNum = index + 1
      
      // Check for print statements
      if (line.includes('print(') && !line.includes('#')) {
        results.push({
          line: lineNum,
          column: line.indexOf('print(') + 1,
          message: 'Consider using logging instead of print for production code',
          severity: "info",
          rule: 'no-print'
        })
      }
      
      // Check for indentation issues (basic)
      if (line.length > 0 && line[0] === ' ' && line.indexOf('  ') !== 0 && line.indexOf('    ') !== 0) {
        results.push({
          line: lineNum,
          column: 1,
          message: 'Inconsistent indentation - use 4 spaces or tabs consistently',
          severity: "warning",
          rule: 'indentation'
        })
      }
    })
  }

  const validateJSON = (code: string, results: CodeValidationResult[]) => {
    try {
      JSON.parse(code)
    } catch (error) {
      results.push({
        line: 1,
        column: 1,
        message: `Invalid JSON: ${error instanceof Error ? error.message : 'Syntax error'}`,
        severity: "error",
        rule: 'json-syntax'
      })
    }
  }

  const validateCSS = (code: string, results: CodeValidationResult[]) => {
    const lines = code.split('\n')
    
    lines.forEach((line, index) => {
      const lineNum = index + 1
      const trimmed = line.trim()
      
      // Check for missing semicolons in CSS
      if (trimmed && 
          trimmed.includes(':') && 
          !trimmed.endsWith(';') && 
          !trimmed.endsWith('{') && 
          !trimmed.endsWith('}') &&
          !trimmed.startsWith('/*') &&
          !trimmed.startsWith('//')) {
        results.push({
          line: lineNum,
          column: line.length,
          message: 'Missing semicolon in CSS declaration',
          severity: "warning",
          rule: 'css-semicolon'
        })
      }
    })
  }

  const validateGeneral = (code: string, results: CodeValidationResult[]) => {
    const lines = code.split('\n')
    
    lines.forEach((line, index) => {
      const lineNum = index + 1
      
      // Check for very long lines
      if (line.length > 120) {
        results.push({
          line: lineNum,
          column: 120,
          message: 'Line too long (>120 characters)',
          severity: "info",
          rule: 'max-line-length'
        })
      }
      
      // Check for trailing whitespace
      if (line.endsWith(' ') || line.endsWith('\t')) {
        results.push({
          line: lineNum,
          column: line.length,
          message: 'Trailing whitespace',
          severity: "info",
          rule: 'no-trailing-spaces'
        })
      }
    })
  }

  useEffect(() => {
    const validate = async () => {
      if (!code.trim()) return
      
      setIsValidating(true)
      const results = await validateCode(code, language)
      setValidationResults(results)
      onValidate?.(results)
      setIsValidating(false)
    }

    const debounceTimer = setTimeout(validate, 500)
    return () => clearTimeout(debounceTimer)
  }, [code, language, onValidate])

  const handleCopy = () => {
    copy(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error': return <XCircle className="h-3 w-3 text-red-500" />
      case 'warning': return <AlertTriangle className="h-3 w-3 text-yellow-500" />
      case 'info': return <Info className="h-3 w-3 text-blue-500" />
      default: return <CheckCircle className="h-3 w-3 text-green-500" />
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error': return 'text-red-600 bg-red-50 border-red-200'
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'info': return 'text-blue-600 bg-blue-50 border-blue-200'
      default: return 'text-green-600 bg-green-50 border-green-200'
    }
  }

  const errorCount = validationResults.filter(r => r.severity === 'error').length
  const warningCount = validationResults.filter(r => r.severity === 'warning').length
  const infoCount = validationResults.filter(r => r.severity === 'info').length

  return (
    <div className={cn("mt-3 space-y-2", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isValidating ? (
            <Badge variant="secondary" className="text-xs">
              <div className="animate-spin rounded-full h-2 w-2 border border-muted-foreground border-t-transparent mr-1" />
              Validating...
            </Badge>
          ) : (
            <>
              {errorCount > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {errorCount} error{errorCount !== 1 ? 's' : ''}
                </Badge>
              )}
              {warningCount > 0 && (
                <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">
                  {warningCount} warning{warningCount !== 1 ? 's' : ''}
                </Badge>
              )}
              {infoCount > 0 && (
                <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                  {infoCount} info
                </Badge>
              )}
              {validationResults.length === 0 && (
                <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                  <CheckCircle className="h-2 w-2 mr-1" />
                  No issues found
                </Badge>
              )}
            </>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-6 px-2 text-xs"
          >
            {copied ? <CheckCircle className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          </Button>
          {showRunButton && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRun}
              className="h-6 px-2 text-xs"
            >
              <Play className="h-3 w-3 mr-1" />
              Run
            </Button>
          )}
        </div>
      </div>

      {validationResults.length > 0 && (
        <div className="space-y-1">
          {validationResults.slice(0, 5).map((result, index) => (
            <div
              key={index}
              className={cn(
                "flex items-start gap-2 p-2 rounded text-xs border",
                getSeverityColor(result.severity)
              )}
            >
              {getSeverityIcon(result.severity)}
              <div className="flex-1 min-w-0">
                <div className="font-medium">
                  Line {result.line}:{result.column}
                </div>
                <div className="text-xs opacity-80">
                  {result.message}
                  {result.rule && (
                    <span className="ml-2 opacity-60">({result.rule})</span>
                  )}
                </div>
              </div>
            </div>
          ))}
          {validationResults.length > 5 && (
            <div className="text-xs text-muted-foreground text-center py-1">
              ... and {validationResults.length - 5} more issues
            </div>
          )}
        </div>
      )}
    </div>
  )
} 