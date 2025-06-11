"use client"

import { CodeBlock } from "./ui/code-block"
import { MarkdownRenderer } from "./ui/markdown-renderer"

export function CodeExamples() {
  const typescriptExample = `// Method 1: Function with type annotations
function addNumbers(num1: number, num2: number): number {
  return num1 + num2;
}

// Usage
const result1 = addNumbers(5, 3);
console.log("Result 1:", result1); // Output: 8

// Method 2: Arrow function with type annotations
const addNumbersArrow = (num1: number, num2: number): number => {
  return num1 + num2;
};

// Usage
const result2 = addNumbersArrow(10, 20);
console.log("Result 2:", result2); // Output: 30

// Method 3: Variable declarations with type annotations
let firstNumber: number = 15;
let secondNumber: number = 25;
let sum: number = firstNumber + secondNumber;
console.log("Sum:", sum); // Output: 40

// Method 4: Function with optional parameters
function addNumbersOptional(num1: number, num2: number = 0): number {
  return num1 + num2;
}

// Usage
const result3 = addNumbersOptional(7); // Second parameter is optional
console.log("Result 3:", result3); // Output: 7

const result4 = addNumbersOptional(7, 3);
console.log("Result 4:", result4); // Output: 10

// Method 5: Class-based approach
class Calculator {
  add(num1: number, num2: number): number {
    return num1 + num2;
  }
}

const calc = new Calculator();
const result5 = calc.add(15, 25);
console.log("Result 5:", result5); // Output: 40`

  const markdownExample = `# TypeScript Number Addition Examples

Here are several ways to add two numbers using TypeScript:

## Method 1: Basic Function

\`\`\`typescript
function addNumbers(num1: number, num2: number): number {
  return num1 + num2;
}

const result = addNumbers(5, 3);
console.log(result); // Output: 8
\`\`\`

## Method 2: Arrow Function

\`\`\`typescript
const addNumbersArrow = (num1: number, num2: number): number => {
  return num1 + num2;
};
\`\`\`

## Method 3: With Optional Parameters

\`\`\`typescript
function addWithDefault(num1: number, num2: number = 0): number {
  return num1 + num2;
}
\`\`\`

### Usage Examples

You can use these functions like this:

- Basic usage: \`addNumbers(10, 20)\`
- With variables: \`const sum = addNumbers(x, y)\`
- Optional param: \`addWithDefault(5)\` returns 5

> **Note**: TypeScript provides compile-time type checking for better code reliability.`

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-bold mb-6">Code Syntax Highlighting Test</h1>
      
      <div className="space-y-6">
        <section>
          <h2 className="text-xl font-semibold mb-4">Direct Code Block</h2>
          <CodeBlock 
            language="typescript" 
            filename="addNumbers.ts"
            showValidator={true}
            showRunButton={true}
            collapsible={true}
            defaultExpanded={true}
            maxHeight={500}
            onRun={() => console.log("Running TypeScript code...")}
          >
            {typescriptExample}
          </CodeBlock>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">Markdown Rendered</h2>
          <MarkdownRenderer>{markdownExample}</MarkdownRenderer>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">JavaScript with Issues</h2>
          <CodeBlock 
            language="javascript" 
            filename="badCode.js"
            showValidator={true}
          >
{`var x = 5;
var y = 10;
console.log(x + y)
function test() {
  var name = "test"
  return name
}
print("This line has issues");`}
          </CodeBlock>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">Python Example</h2>
          <CodeBlock 
            language="python" 
            filename="calculator.py"
            showValidator={true}
            collapsible={true}
            defaultExpanded={false}
            maxHeight={300}
          >
{`def add_numbers(a, b):
    """Add two numbers and return the result."""
    return a + b

# Usage examples
result1 = add_numbers(5, 3)
print(f"Result: {result1}")

# Class-based approach
class Calculator:
    def add(self, x, y):
        return x + y
    
    def multiply(self, x, y):
        return x * y

calc = Calculator()
sum_result = calc.add(10, 20)
print("Sum:", sum_result)`}
          </CodeBlock>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">JSON Data</h2>
          <CodeBlock 
            language="json" 
            filename="config.json"
            showValidator={true}
          >
{`{
  "name": "TypeScript Addition Example",
  "version": "1.0.0",
  "description": "Examples of adding numbers in TypeScript",
  "main": "index.ts",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "ts-node index.ts"
  },
  "dependencies": {
    "typescript": "^5.0.0"
  }
}`}
          </CodeBlock>
        </section>
      </div>
    </div>
  )
} 