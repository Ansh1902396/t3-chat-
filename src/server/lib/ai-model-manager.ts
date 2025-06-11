import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { generateText, streamText, type CoreMessage } from 'ai';
import { env } from '~/env';

// Supported AI model providers
export const AI_PROVIDERS = {
  OPENAI: 'openai',
  ANTHROPIC: 'anthropic',
  GOOGLE: 'google',
} as const;

export type AIProvider = typeof AI_PROVIDERS[keyof typeof AI_PROVIDERS];

// Available models for each provider
export const AI_MODELS = {
  [AI_PROVIDERS.OPENAI]: {
    'gpt-4o': { name: 'GPT-4o', description: 'Most capable GPT-4 model' },
    'gpt-4o-mini': { name: 'GPT-4o Mini', description: 'Faster, cost-effective GPT-4' },
    'gpt-4-turbo': { name: 'GPT-4 Turbo', description: 'High-performance GPT-4' },
    'gpt-3.5-turbo': { name: 'GPT-3.5 Turbo', description: 'Fast and efficient' },
  },
  [AI_PROVIDERS.ANTHROPIC]: {
    'claude-3-5-sonnet-20241022': { name: 'Claude 3.5 Sonnet', description: 'Most capable Claude model' },
    'claude-3-5-haiku-20241022': { name: 'Claude 3.5 Haiku', description: 'Fast and efficient Claude' },
    'claude-3-opus-20240229': { name: 'Claude 3 Opus', description: 'Previous generation flagship' },
  },
  [AI_PROVIDERS.GOOGLE]: {
    'gemini-1.5-pro': { name: 'Gemini 1.5 Pro', description: 'Google\'s most capable model' },
    'gemini-1.5-flash': { name: 'Gemini 1.5 Flash', description: 'Fast and efficient Gemini' },
    'gemini-pro': { name: 'Gemini Pro', description: 'Previous generation Gemini' },
  },
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

  public getAvailableModels(provider: AIProvider): Record<string, { name: string; description: string }> {
    if (!this.providerClients.has(provider)) {
      throw new Error(`Provider ${provider} is not configured`);
    }
    return AI_MODELS[provider];
  }

  public getAllAvailableModels(): Record<AIProvider, Record<string, { name: string; description: string }>> {
    const availableModels: Record<string, Record<string, { name: string; description: string }>> = {};
    
    for (const provider of this.getAvailableProviders()) {
      availableModels[provider] = this.getAvailableModels(provider);
    }
    
    return availableModels as Record<AIProvider, Record<string, { name: string; description: string }>>;
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

    try {
      const result = await generateText({
        model: client(model),
        messages,
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
    } catch (error) {
      console.error(`Error generating response with ${modelId}:`, error);
      throw new Error(`Failed to generate response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async *generateStreamResponse(request: ChatRequest): AsyncGenerator<string, void, unknown> {
    const { messages, config } = request;
    const { provider, model, ...params } = config;

    const client = this.getProviderClient(provider);
    const modelId = this.buildModelIdentifier(provider, model);

    try {
      const result = await streamText({
        model: client(model),
        messages,
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
    } catch (error) {
      console.error(`Error streaming response with ${modelId}:`, error);
      throw new Error(`Failed to stream response: ${error instanceof Error ? error.message : 'Unknown error'}`);
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