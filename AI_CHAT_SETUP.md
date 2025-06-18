# AI Chat System Setup Guide

## Overview
This guide covers the setup and usage of the AI chat system with support for multiple providers (OpenAI, Anthropic, Google) and image generation capabilities.

## Features
- ✅ Multi-provider AI chat (OpenAI GPT, Anthropic Claude, Google Gemini)
- ✅ Real-time streaming responses
- ✅ Web search integration (OpenAI models only)
- ✅ Credit system with model-based pricing
- ✅ **Image generation with DALL-E** 
- ✅ Conversation persistence and management
- ✅ File attachments support
- ✅ Markdown rendering with syntax highlighting

## Quick Start

### Basic Chat Usage
```typescript
import { useAIChat } from "~/hooks/useAIChat";

function ChatComponent() {
  const {
    messages,
    isStreaming,
    sendMessageStream,
    clearChat
  } = useAIChat();

  const handleSend = (message: string) => {
    sendMessageStream(message, {
      provider: "openai",
      model: "gpt-4o-mini",
      temperature: 0.7
    });
  };

  return <div>Your chat UI here</div>;
}
```

### **Image Generation with DALL-E**
```typescript
import { api } from "~/trpc/react";

function ImageGenerationComponent() {
  const generateImage = api.aiChat.generateImage.useMutation();

  const handleGenerateImage = async () => {
    try {
      const result = await generateImage.mutateAsync({
        prompt: "A beautiful sunset over mountains with vibrant colors",
        config: {
          provider: "openai",      // ✅ Must be OpenAI
          model: "dall-e-3",       // ✅ Use dall-e-3 or dall-e-2
          size: "1024x1024",       // Optional: 256x256, 512x512, 1024x1024, etc.
          quality: "hd",           // Optional: standard, hd
          style: "vivid",          // Optional: vivid, natural
          n: 1                     // Optional: 1-4 images
        }
      });

      console.log("Generated images:", result.images);
      console.log("Credits used:", result.creditsUsed);
    } catch (error) {
      console.error("Image generation failed:", error);
    }
  };

  return (
    <button onClick={handleGenerateImage}>
      Generate Image (5 credits)
    </button>
  );
}
```

### **Using Image Generation in Chat Hook**
```typescript
import { useAIChat } from "~/hooks/useAIChat";

function ImageChatComponent() {
  const {
    generateImageResponse,
    isGeneratingImage,
    generatedImages
  } = useAIChat();

  const handleImageGeneration = async () => {
    try {
      await generateImageResponse("A futuristic city at night", {
        provider: "openai",
        model: "dall-e-3",
        size: "1024x1024",
        quality: "hd"
      });
    } catch (error) {
      console.error("Failed to generate image:", error);
    }
  };

  return (
    <div>
      <button 
        onClick={handleImageGeneration} 
        disabled={isGeneratingImage}
      >
        {isGeneratingImage ? "Generating..." : "Create Image"}
      </button>
      
      {generatedImages.map((img, index) => (
        <img key={index} src={img.url} alt="Generated" />
      ))}
    </div>
  );
}
```

## Model Types & Costs

### **Text Models** (for chat)
| Model | Provider | Cost | Description |
|-------|----------|------|-------------|
| `gpt-4o-mini` | OpenAI | 1 credit | Fast & efficient |
| `gpt-3.5-turbo` | OpenAI | 1 credit | Cost-effective |
| `gpt-4o` | OpenAI | 3 credits | Most capable |
| `claude-3-5-haiku` | Anthropic | 1 credit | Fast Claude |
| `claude-3-5-sonnet` | Anthropic | 3 credits | Best Claude |
| `gemini-1.5-flash` | Google | 1 credit | Fast Gemini |
| `gemini-1.5-pro` | Google | 3 credits | Advanced Gemini |

### **Image Models** (for generation only)
| Model | Provider | Cost | Description |
|-------|----------|------|-------------|
| `dall-e-2` | OpenAI | 5 credits | Fast image generation |
| `dall-e-3` | OpenAI | 5 credits | High-quality images |

## ⚠️ **Important Notes for Image Generation**

### **DALL-E Models Cannot Be Used for Text Chat**
```typescript
// ❌ This will fail - DALL-E is for images only
sendMessage("Hello", {
  provider: "openai",
  model: "dall-e-3"  // ERROR: Image model in text endpoint
});

// ✅ Correct usage - Use dedicated image endpoint
generateImage.mutate({
  prompt: "A beautiful landscape",
  config: {
    provider: "openai",
    model: "dall-e-3"
  }
});
```

### **Provider Requirements**
- **Text Chat**: Use `gpt-4o`, `claude-3-5-sonnet`, `gemini-1.5-flash`, etc.
- **Image Generation**: Only OpenAI DALL-E models (`dall-e-2`, `dall-e-3`)
- **Web Search**: Only OpenAI models support web search

## API Endpoints

### Chat Endpoints
- `aiChat.generateResponse`: Single response (non-streaming)
- `aiChat.streamResponse`: Real-time streaming response

### **Image Generation Endpoint**
- `aiChat.generateImage`: Generate images with DALL-E

### Model Management
- `aiChat.getAvailableModels`: Get all available models by provider
- `aiChat.validateModel`: Check if model is valid for provider

## Environment Variables
```bash
# Required for each provider you want to use
OPENAI_API_KEY=sk-...                    # For GPT models and DALL-E
ANTHROPIC_API_KEY=sk-ant-...             # For Claude models  
GOOGLE_GENERATIVE_AI_API_KEY=...         # For Gemini models

# Database
DATABASE_URL=postgresql://...

# NextAuth
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000
```

## Error Handling

### **Common Image Generation Errors**
```typescript
try {
  await generateImage.mutateAsync({...});
} catch (error) {
  if (error.message.includes("Insufficient credits")) {
    // User needs more credits
  } else if (error.message.includes("belongs to")) {
    // Wrong provider for model
  } else if (error.message.includes("rate limit")) {
    // API rate limit hit
  }
}
```

### **Model Validation Errors**
- `"Model dall-e-3 belongs to openai, not google"` → Use correct provider
- `"Invalid model dall-e-3 for provider anthropic"` → DALL-E only works with OpenAI
- `"Model dall-e-3 is an image generation model"` → Use image endpoint, not chat

## Advanced Usage

### Streaming with Error Handling
```typescript
function ChatComponent() {
  // For streaming responses
  const streamSubscription = api.aiChat.streamResponse.useSubscription(
    {
      messages: [{ role: "user", content: "Hello!" }],
      config: { provider: "openai", model: "gpt-4o" },
    },
    {
      onData: (data) => {
        if (data.type === "chunk") {
          console.log("Chunk:", data.content);
        } else if (data.type === "end") {
          console.log("Stream ended");
        }
      },
      onError: (error) => {
        console.error("Stream error:", error);
      },
    }
  );

  // For single responses
  const generateResponse = api.aiChat.generateResponse.useMutation();

  return <div>Your chat UI here</div>;
}
```

### **Complete Image Generation Example**
```typescript
import { useState } from "react";
import { api } from "~/trpc/react";

function ImageGenerator() {
  const [prompt, setPrompt] = useState("");
  const [images, setImages] = useState<Array<{url: string}>>([]);
  
  const generateImage = api.aiChat.generateImage.useMutation({
    onSuccess: (result) => {
      setImages(result.images);
    },
    onError: (error) => {
      alert(`Error: ${error.message}`);
    }
  });

  const handleGenerate = () => {
    generateImage.mutate({
      prompt,
      config: {
        provider: "openai",
        model: "dall-e-3",
        size: "1024x1024",
        quality: "hd",
        style: "vivid"
      }
    });
  };

  return (
    <div>
      <input 
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Describe the image you want..."
      />
      <button 
        onClick={handleGenerate}
        disabled={generateImage.isPending}
      >
        {generateImage.isPending ? "Generating..." : "Generate Image (5 credits)"}
      </button>
      
      <div>
        {images.map((img, i) => (
          <img key={i} src={img.url} alt={`Generated ${i}`} />
        ))}
      </div>
    </div>
  );
}
```

## Available Models

### OpenAI (GPT)
- `gpt-4o`: Most capable GPT-4 model
- `gpt-4o-mini`: Faster, cost-effective GPT-4
- `gpt-4-turbo`: High-performance GPT-4
- `gpt-3.5-turbo`: Fast and efficient

### Anthropic (Claude)
- `claude-3-5-sonnet-20241022`: Most capable Claude model
- `claude-3-5-haiku-20241022`: Fast and efficient Claude
- `claude-3-opus-20240229`: Previous generation flagship

### Google (Gemini)
- `gemini-1.5-pro`: Google's most capable model
- `gemini-1.5-flash`: Fast and efficient Gemini
- `gemini-pro`: Previous generation Gemini

### **OpenAI (DALL-E) - Image Generation Only**
- `dall-e-3`: High-quality image generation
- `dall-e-2`: Fast image generation

## Configuration Options

Each request can include the following configuration options:

```typescript
interface AIModelConfig {
  provider: "openai" | "anthropic" | "google";
  model: string;
  maxTokens?: number;        // Maximum tokens to generate (1-8000)
  temperature?: number;      // Randomness (0-2)
  topP?: number;            // Nucleus sampling (0-1)
  topK?: number;            // Top-K sampling (1-100, Google only)
  presencePenalty?: number;  // Presence penalty (-2 to 2, OpenAI only)
  frequencyPenalty?: number; // Frequency penalty (-2 to 2, OpenAI only)
}
```

### **Image Generation Config**
```typescript
interface ImageGenerationConfig extends AIModelConfig {
  size?: '256x256' | '512x512' | '1024x1024' | '1024x1792' | '1792x1024';
  quality?: 'standard' | 'hd';
  style?: 'vivid' | 'natural';
  n?: number; // 1-4 images
}
```

## API Endpoints

### tRPC Procedures

- `aiChat.getAvailableModels`: Get all available providers and models
- `aiChat.getDefaultConfig`: Get default configuration for a provider
- `aiChat.validateModel`: Validate if a model is available for a provider
- `aiChat.generateResponse`: Generate a single AI response
- `aiChat.streamResponse`: Stream AI response in real-time
- **`aiChat.generateImage`**: Generate images with DALL-E ✨
- `aiChat.saveConversation`: Save conversation to database
- `aiChat.getConversationHistory`: Load conversation history
- `aiChat.listConversations`: List user's conversations
- `aiChat.deleteConversation`: Delete a conversation
- `aiChat.updateConversationTitle`: Update conversation title

## Troubleshooting

### Common Issues

1. **Model Not Available**: Check if you have the API key for the provider
2. **Rate Limits**: The system includes automatic retry with exponential backoff
3. **Invalid Configuration**: Use `aiChat.validateModel` to check model availability

### **Image Generation Issues**

1. **"You are not allowed to sample from this model"**
   - ✅ **Fixed**: Use the dedicated `generateImage` endpoint
   - ❌ Don't try to use DALL-E models in regular chat

2. **"Model dall-e-3 belongs to openai, not google"**
   - ✅ Always use `provider: "openai"` with DALL-E models

3. **"Insufficient credits"**
   - Image generation costs 5 credits
   - Check user credit balance before generating

### Performance Tips

- Use `gpt-4o-mini` or `gemini-1.5-flash` for faster, cheaper responses
- Enable streaming for better user experience
- Use appropriate `maxTokens` limits to control costs
- For images, `dall-e-2` is faster but `dall-e-3` has better quality

This setup provides a complete AI chat system with robust error handling, multiple provider support, and comprehensive image generation capabilities! 