// Client-safe model provider utilities (no server imports)

// Define client-safe provider constants
export const AI_PROVIDERS = {
  OPENAI: 'openai',
  ANTHROPIC: 'anthropic',
  GOOGLE: 'google',
} as const;

export type AIProvider = typeof AI_PROVIDERS[keyof typeof AI_PROVIDERS];

/**
 * Maps a model ID to its correct provider
 * This ensures that models like DALL-E are correctly mapped to OpenAI
 */
export function getProviderFromModel(modelId: string): AIProvider {
  // OpenAI models
  if (modelId.includes("gpt") || modelId.includes("dall-e") || modelId.includes("o4")) {
    return AI_PROVIDERS.OPENAI
  }
  
  // Anthropic models
  if (modelId.includes("claude")) {
    return AI_PROVIDERS.ANTHROPIC
  }
  
  // Google models
  if (modelId.includes("gemini")) {
    return AI_PROVIDERS.GOOGLE
  }
  
  // Default fallback (this shouldn't happen with proper model management)
  return AI_PROVIDERS.GOOGLE
}

/**
 * Validates that a model belongs to the specified provider
 */
export function validateModelProvider(modelId: string, provider: AIProvider): boolean {
  return getProviderFromModel(modelId) === provider
}

/**
 * Gets a human-readable provider name
 */
export function getProviderDisplayName(provider: AIProvider): string {
  const displayNames: Record<AIProvider, string> = {
    [AI_PROVIDERS.OPENAI]: 'OpenAI',
    [AI_PROVIDERS.ANTHROPIC]: 'Anthropic',
    [AI_PROVIDERS.GOOGLE]: 'Google',
  }
  return displayNames[provider]
} 