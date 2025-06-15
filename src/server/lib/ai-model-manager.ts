import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { generateText, streamText, type CoreMessage, type Message, type CoreSystemMessage, type CoreUserMessage, type CoreAssistantMessage, type TextPart, type ImagePart, type FilePart , experimental_generateImage as generateImage  } from 'ai';

import { env } from '~/env';

// Supported AI model providers
export const AI_PROVIDERS = {
  OPENAI: 'openai',
  ANTHROPIC: 'anthropic',
  GOOGLE: 'google',
} as const;

export type AIProvider = typeof AI_PROVIDERS[keyof typeof AI_PROVIDERS];

// Add model type information
type ModelInfo = {
  name: string;
  description: string;
  type?: 'text' | 'image';
};

// Define model types for each provider
type OpenAIModels = {
  'gpt-4o': ModelInfo;
  'gpt-4o-mini': ModelInfo;
  'gpt-4-turbo': ModelInfo;
  'gpt-3.5-turbo': ModelInfo;
  'dall-e-3': ModelInfo;
  'dall-e-2': ModelInfo;
};

type AnthropicModels = {
  'claude-3-5-sonnet-20241022': ModelInfo;
  'claude-3-5-haiku-20241022': ModelInfo;
  'claude-3-opus-20240229': ModelInfo;
  'claude-4-sonnet-20250514': ModelInfo;
};

type GoogleModels = {
  'gemini-1.5-pro': ModelInfo;
  'gemini-1.5-flash': ModelInfo;
  'gemini-pro': ModelInfo;
  'gemini-pro-vision': ModelInfo;
};

type ModelConfig = {
  [AI_PROVIDERS.OPENAI]: OpenAIModels;
  [AI_PROVIDERS.ANTHROPIC]: AnthropicModels;
  [AI_PROVIDERS.GOOGLE]: GoogleModels;
};

// Available models for each provider
export const AI_MODELS: ModelConfig = {
  [AI_PROVIDERS.OPENAI]: {
    'gpt-4o': { name: 'GPT-4o', description: 'Most capable GPT-4 model', type: 'text' },
    'gpt-4o-mini': { name: 'GPT-4o Mini', description: 'Faster, cost-effective GPT-4', type: 'text' },
    'gpt-4-turbo': { name: 'GPT-4 Turbo', description: 'High-performance GPT-4', type: 'text' },
    'gpt-3.5-turbo': { name: 'GPT-3.5 Turbo', description: 'Fast and efficient', type: 'text' },
    'dall-e-3': { name: 'DALL-E 3', description: 'High-quality image generation', type: 'image' },
    'dall-e-2': { name: 'DALL-E 2', description: 'Fast image generation', type: 'image' },
  } as const,
  [AI_PROVIDERS.ANTHROPIC]: {
    'claude-3-5-sonnet-20241022': { name: 'Claude 3.5 Sonnet', description: 'Most capable Claude model', type: 'text' },
    'claude-3-5-haiku-20241022': { name: 'Claude 3.5 Haiku', description: 'Fast and efficient Claude', type: 'text' },
    'claude-3-opus-20240229': { name: 'Claude 3 Opus', description: 'Previous generation flagship', type: 'text' },
    'claude-4-sonnet-20250514': { name: 'Claude 4 Sonnet', description: 'Most capable Claude model', type: 'text' },
  } as const,
  [AI_PROVIDERS.GOOGLE]: {
    'gemini-1.5-pro': { name: 'Gemini 1.5 Pro', description: 'Google\'s most capable model', type: 'text' },
    'gemini-1.5-flash': { name: 'Gemini 1.5 Flash', description: 'Fast and efficient Gemini', type: 'text' },
    'gemini-pro': { name: 'Gemini Pro', description: 'Previous generation Gemini', type: 'text' },
    'gemini-pro-vision': { name: 'Gemini Pro Vision', description: 'Image generation and analysis', type: 'image' },
  } as const,
} as const;

export type AIModel = {
  [K in AIProvider]: keyof typeof AI_MODELS[K];
}[AIProvider];

// Configuration interface
export interface AIModelConfig {
  provider: AIProvider;
  model: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  topK?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
}

// Chat request interface
export interface ChatRequest {
  messages: CoreMessage[];
  config: AIModelConfig;
  stream?: boolean;
}

// Response interface
export interface ChatResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason?: string;
}

// Image generation request interface
export interface ImageGenerationRequest {
  prompt: string;
  config: AIModelConfig & {
    size?: '256x256' | '512x512' | '1024x1024' | '1024x1792' | '1792x1024';
    quality?: 'standard' | 'hd';
    style?: 'vivid' | 'natural';
    n?: number;
  };
}

// Image generation response interface
export interface ImageGenerationResponse {
  images: Array<{
    url: string;
    revisedPrompt?: string;
  }>;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// AI Model Manager class
export class AIModelManager {
  private static instance: AIModelManager;
  private providerClients: Map<AIProvider, any> = new Map();

  private constructor() {
    this.initializeProviders();
  }

  public static getInstance(): AIModelManager {
    if (!AIModelManager.instance) {
      AIModelManager.instance = new AIModelManager();
    }
    return AIModelManager.instance;
  }

  private initializeProviders(): void {
    // Initialize OpenAI
    if (env.OPENAI_API_KEY) {
      this.providerClients.set(AI_PROVIDERS.OPENAI, openai);
    }

    // Initialize Anthropic
    if (env.ANTHROPIC_API_KEY) {
      this.providerClients.set(AI_PROVIDERS.ANTHROPIC, anthropic);
    }

    // Initialize Google
    if (env.GOOGLE_GENERATIVE_AI_API_KEY) {
      this.providerClients.set(AI_PROVIDERS.GOOGLE, google);
    }
  }

  public getAvailableProviders(): AIProvider[] {
    return Array.from(this.providerClients.keys());
  }

  public getAvailableModels(provider: AIProvider): Record<string, ModelInfo> {
    if (!this.providerClients.has(provider)) {
      throw new Error(`Provider ${provider} is not configured`);
    }
    return AI_MODELS[provider];
  }

  public getAllAvailableModels(): Record<AIProvider, Record<string, ModelInfo>> {
    const availableModels: Record<string, Record<string, ModelInfo>> = {};
    
    for (const provider of this.getAvailableProviders()) {
      availableModels[provider] = this.getAvailableModels(provider);
    }
    
    return availableModels as Record<AIProvider, Record<string, ModelInfo>>;
  }

  private getProviderClient(provider: AIProvider) {
    const client = this.providerClients.get(provider);
    if (!client) {
      throw new Error(`Provider ${provider} is not configured or available`);
    }
    return client;
  }

  private buildModelIdentifier(provider: AIProvider, model: string): string {
    return `${provider}:${model}`;
  }

  public async generateResponse(request: ChatRequest): Promise<ChatResponse> {
    const { messages, config } = request;
    const { provider, model, ...params } = config;

    const client = this.getProviderClient(provider);
    const modelId = this.buildModelIdentifier(provider, model);

    let attempts = 0;
    const maxAttempts = 3;
    const baseDelay = 1000; // 1 second

    while (attempts < maxAttempts) {
      try {
        const result = await generateText({
          model: client(model),
          messages: messages,
          maxTokens: params.maxTokens ?? 1000,
          temperature: params.temperature ?? 0.7,
          topP: params.topP,
          topK: params.topK,
          presencePenalty: params.presencePenalty,
          frequencyPenalty: params.frequencyPenalty,
        });

        return {
          content: result.text,
          usage: result.usage ? {
            promptTokens: result.usage.promptTokens,
            completionTokens: result.usage.completionTokens,
            totalTokens: result.usage.totalTokens,
          } : undefined,
          finishReason: result.finishReason,
        };
      } catch (error: unknown) {
        attempts++;
        console.error(`Error generating response with ${modelId} (attempt ${attempts}/${maxAttempts}):`, error);
        
        // Check if it's a quota/rate limit error
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const statusCode = (error as { statusCode?: number })?.statusCode;
        const isRateLimit = statusCode === 429 || errorMessage.includes('quota') || errorMessage.includes('rate limit');
        
        if (isRateLimit) {
          if (attempts < maxAttempts) {
            // Exponential backoff with jitter
            const delay = baseDelay * Math.pow(2, attempts - 1) + Math.random() * 1000;
            console.log(`Rate limit hit, retrying after ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          } else {
            // If all retries failed, provide a helpful error message
            throw new Error(`Service temporarily unavailable due to rate limits. Please try again in a few minutes. Original error: ${errorMessage}`);
          }
        }
        
        // For other errors, fail immediately
        if (attempts >= maxAttempts) {
          throw new Error(`Failed to generate response after ${maxAttempts} attempts: ${errorMessage}`);
        }
      }
    }

    // This should never be reached, but TypeScript needs it
    throw new Error('Maximum retry attempts exceeded');
  }

  public async *generateStreamResponse(request: ChatRequest): AsyncGenerator<string, void, unknown> {
    const { messages, config } = request;
    const { provider, model, ...params } = config;

    const client = this.getProviderClient(provider);
    const modelId = this.buildModelIdentifier(provider, model);

    try {
      const result = await streamText({
        model: client(model),
        messages: messages,
        maxTokens: params.maxTokens ?? 1000,
        temperature: params.temperature ?? 0.7,
        topP: params.topP,
        topK: params.topK,
        presencePenalty: params.presencePenalty,
        frequencyPenalty: params.frequencyPenalty,
      });

      for await (const delta of result.textStream) {
        yield delta;
      }
    } catch (error: unknown) {
      console.error(`Error streaming response with ${modelId}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to stream response: ${errorMessage}`);
    }
  }

  public validateModel(provider: AIProvider, model: string): boolean {
    const availableModels = this.getAvailableModels(provider);
    return model in availableModels;
  }

  public getDefaultConfig(provider: AIProvider): Partial<AIModelConfig> {
    const configs: Record<AIProvider, Partial<AIModelConfig>> = {
      [AI_PROVIDERS.OPENAI]: {
        temperature: 0.7,
        maxTokens: 1000,
        topP: 1,
        presencePenalty: 0,
        frequencyPenalty: 0,
      },
      [AI_PROVIDERS.ANTHROPIC]: {
        temperature: 0.7,
        maxTokens: 1000,
        topP: 1,
      },
      [AI_PROVIDERS.GOOGLE]: {
        temperature: 0.7,
        maxTokens: 1000,
        topP: 1,
        topK: 40,
      },
    };

    return configs[provider] || {};
  }

  public async generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResponse> {
    const { prompt, config } = request;
    const { provider, model, ...params } = config;

    // Only allow OpenAI DALL-E models for now
    if (provider !== AI_PROVIDERS.OPENAI || !model.startsWith('dall-e')) {
      throw new Error('Image generation is currently only supported with OpenAI DALL-E models');
    }

    const client = this.getProviderClient(AI_PROVIDERS.OPENAI);
    const modelId = this.buildModelIdentifier(AI_PROVIDERS.OPENAI, model);

    let attempts = 0;
    const maxAttempts = 3;
    const baseDelay = 1000; // 1 second

    while (attempts < maxAttempts) {
      try {
        const result = await generateImage({
          model: client.image(model),
          prompt,
          size: params.size ?? '1024x1024',
          n: params.n ?? 1,
          providerOptions: {
            openai: {
              quality: params.quality ?? 'standard',
              style: params.style ?? 'natural',
            },
          },
        });

        return {
          images: result.images.map(img => {
            if (typeof img === 'string') {
              // Already a URL
              return { url: img, revisedPrompt: undefined };
            } else if (img.base64) {
              // Add the data URL prefix if missing
              return { url: `data:image/png;base64,${img.base64}`, revisedPrompt: undefined };
            } else {
              return { url: '', revisedPrompt: undefined };
            }
          }),
          usage: undefined, // The Vercel AI SDK doesn't provide usage information for images
        };
      } catch (error: unknown) {
        attempts++;
        console.error(`Error generating image with ${modelId} (attempt ${attempts}/${maxAttempts}):`, error);
        
        // Check if it's a quota/rate limit error
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const statusCode = (error as { statusCode?: number })?.statusCode;
        const isRateLimit = statusCode === 429 || errorMessage.includes('quota') || errorMessage.includes('rate limit');
        
        if (isRateLimit) {
          if (attempts < maxAttempts) {
            // Exponential backoff with jitter
            const delay = baseDelay * Math.pow(2, attempts - 1) + Math.random() * 1000;
            console.log(`Rate limit hit, retrying after ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          } else {
            throw new Error(`Service temporarily unavailable due to rate limits. Please try again in a few minutes. Original error: ${errorMessage}`);
          }
        }
        
        // For other errors, fail immediately
        if (attempts >= maxAttempts) {
          throw new Error(`Failed to generate image after ${maxAttempts} attempts: ${errorMessage}`);
        }
      }
    }

    // This should never be reached, but TypeScript needs it
    throw new Error('Maximum retry attempts exceeded');
  }
}

// Export singleton instance
export const aiModelManager = AIModelManager.getInstance();

// Utility functions
export function isValidProvider(provider: string): provider is AIProvider {
  return Object.values(AI_PROVIDERS).includes(provider as AIProvider);
}

export function getProviderDisplayName(provider: AIProvider): string {
  const displayNames: Record<AIProvider, string> = {
    [AI_PROVIDERS.OPENAI]: 'OpenAI',
    [AI_PROVIDERS.ANTHROPIC]: 'Anthropic',
    [AI_PROVIDERS.GOOGLE]: 'Google',
  };
  return displayNames[provider];
} 

