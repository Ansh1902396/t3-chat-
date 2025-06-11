# AI Chat System Setup Guide

This document explains how to set up and use the multi-model AI chat system in your T3 app.

## Features

- **Multiple AI Providers**: Support for OpenAI (GPT), Anthropic (Claude), and Google (Gemini)
- **Model Selection**: Choose from various models within each provider
- **Streaming Responses**: Real-time streaming of AI responses
- **Type-Safe**: Full TypeScript support with tRPC
- **Reusable**: Clean architecture with manager pattern
- **Configurable**: Adjustable parameters like temperature, max tokens, etc.

## Setup

### 1. Install Dependencies

First, install the required packages:

```bash
npm install ai @ai-sdk/openai @ai-sdk/anthropic @ai-sdk/google
```

### 2. Environment Variables

Add the following environment variables to your `.env.local` file. You only need to add the API keys for the providers you want to use:

```env
# OpenAI API Key (for GPT models)
OPENAI_API_KEY=sk-your_openai_api_key_here

# Anthropic API Key (for Claude models)
ANTHROPIC_API_KEY=sk-ant-your_anthropic_api_key_here

# Google Generative AI API Key (for Gemini models)
GOOGLE_GENERATIVE_AI_API_KEY=your_google_ai_api_key_here
```

### 3. Get API Keys

#### OpenAI (GPT)
1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Create an account or sign in
3. Navigate to API Keys section
4. Create a new API key

#### Anthropic (Claude)
1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Create an account or sign in
3. Navigate to API Keys section
4. Create a new API key

#### Google (Gemini)
1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Create an account or sign in
3. Navigate to API Keys section
4. Create a new API key

## Usage

### Frontend Integration

Here's how to use the AI chat system in your React components:

```typescript
import { api } from "~/trpc/react";

function ChatComponent() {
  const { data: availableModels } = api.aiChat.getAvailableModels.useQuery();
  const generateResponse = api.aiChat.generateResponse.useMutation();

  const handleSendMessage = async (message: string) => {
    try {
      const response = await generateResponse.mutateAsync({
        messages: [
          { role: "user", content: message }
        ],
        config: {
          provider: "openai", // or "anthropic" or "google"
          model: "gpt-4o", // or any available model
          temperature: 0.7,
          maxTokens: 1000,
        }
      });
      
      console.log("AI Response:", response.content);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  return (
    <div>
      {/* Your chat UI here */}
    </div>
  );
}
```

### Using the Custom Hook

The easiest way to use the AI chat system is with the provided hook:

```typescript
import { useAIChat } from "~/hooks/useAIChat";

function ChatComponent() {
  const {
    messages,
    isStreaming,
    currentStreamContent,
    sendMessage,
    sendMessageStream,
    clearChat,
    availableModels,
  } = useAIChat({
    onError: (error) => console.error("Chat error:", error),
    onStreamStart: () => console.log("Streaming started"),
    onStreamEnd: () => console.log("Streaming ended"),
  });

  const handleSendMessage = async () => {
    const config = {
      provider: "openai" as const,
      model: "gpt-4o",
      temperature: 0.7,
      maxTokens: 1000,
    };

    // For streaming response
    sendMessageStream("Hello, how are you?", config);

    // Or for non-streaming response
    // await sendMessage("Hello, how are you?", config);
  };

  return (
    <div>
      <div>
        {messages.map((message) => (
          <div key={message.id}>
            <strong>{message.role}:</strong> {message.content}
          </div>
        ))}
        {isStreaming && (
          <div>
            <strong>assistant:</strong> {currentStreamContent}
          </div>
        )}
      </div>
      <button onClick={handleSendMessage}>Send Message</button>
      <button onClick={clearChat}>Clear Chat</button>
    </div>
  );
}
```

### Manual tRPC Usage

You can also use tRPC directly if you need more control:

```typescript
import { api } from "~/trpc/react";

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

## API Endpoints

### tRPC Procedures

- `aiChat.getAvailableModels`: Get all available providers and models
- `aiChat.getDefaultConfig`: Get default configuration for a provider
- `aiChat.validateModel`: Validate if a model is available
- `aiChat.generateResponse`: Generate a single response (mutation)
- `aiChat.streamResponse`: Stream responses in real-time (subscription)
- `aiChat.saveConversation`: Save conversation to database (placeholder)
- `aiChat.getConversationHistory`: Get conversation history (placeholder)
- `aiChat.listConversations`: List user conversations (placeholder)
- `aiChat.deleteConversation`: Delete a conversation (placeholder)

## Error Handling

The system includes comprehensive error handling:

- Invalid API keys
- Model not available
- Rate limiting
- Network errors
- Invalid request format

## Best Practices

1. **API Key Security**: Never expose API keys in client-side code
2. **Rate Limiting**: Implement rate limiting to prevent abuse
3. **Error Handling**: Always handle errors gracefully
4. **Token Management**: Monitor token usage to control costs
5. **Model Selection**: Choose appropriate models based on your use case

## Extending the System

To add new providers:

1. Install the provider's SDK
2. Add it to the `AIModelManager` class
3. Update the `AI_PROVIDERS` and `AI_MODELS` constants
4. Add environment variables for the API key
5. Update the validation schemas

## Troubleshooting

### Common Issues

1. **"Provider not configured"**: Check if the API key is set in environment variables
2. **"Invalid model"**: Verify the model name is correct for the provider
3. **Rate limiting**: Implement exponential backoff for retries
4. **CORS errors**: Ensure proper CORS configuration for streaming endpoints

### Debug Mode

Enable debug logging by setting `NODE_ENV=development` in your environment variables. 