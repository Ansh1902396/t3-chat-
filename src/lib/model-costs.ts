// Client-safe model cost utilities
export type ModelCost = 1 | 3 | 5;

export interface ModelCostInfo {
  cost: ModelCost;
  category: 'cheap' | 'expensive' | 'image';
  description: string;
}

// Model cost configuration - client-safe (no environment variable access)
export const MODEL_COSTS: Record<string, ModelCostInfo> = {
  // OpenAI - Cheap models (1 credit)
  'gpt-4o-mini': { cost: 1, category: 'cheap', description: 'Cost-effective model' },
  'gpt-3.5-turbo': { cost: 1, category: 'cheap', description: 'Fast and efficient' },
  
  // OpenAI - Expensive models (3 credits)
  'gpt-4o': { cost: 3, category: 'expensive', description: 'Premium model' },
  'gpt-4-turbo': { cost: 3, category: 'expensive', description: 'High-performance model' },
  
  // OpenAI - Image models (5 credits)
  'dall-e-3': { cost: 5, category: 'image', description: 'High-quality image generation' },
  'dall-e-2': { cost: 5, category: 'image', description: 'Fast image generation' },
  
  // Anthropic - Cheap models (1 credit)
  'claude-3-5-haiku-20241022': { cost: 1, category: 'cheap', description: 'Fast and efficient Claude' },
  
  // Anthropic - Expensive models (3 credits)
  'claude-3-5-sonnet-20241022': { cost: 3, category: 'expensive', description: 'Most capable Claude model' },
  'claude-3-opus-20240229': { cost: 3, category: 'expensive', description: 'Previous generation flagship' },
  'claude-4-sonnet-20250514': { cost: 3, category: 'expensive', description: 'Most capable Claude model' },
  
  // Google - Cheap models (1 credit)
  'gemini-1.5-flash': { cost: 1, category: 'cheap', description: 'Fast and efficient Gemini' },
  'gemini-pro': { cost: 1, category: 'cheap', description: 'Previous generation Gemini' },
  
  // Google - Expensive models (3 credits)
  'gemini-1.5-pro': { cost: 3, category: 'expensive', description: 'Google\'s most capable model' },
  
  // Google - Image models (5 credits)
  'gemini-pro-vision': { cost: 5, category: 'image', description: 'Image generation and analysis' },
};

/**
 * Get the credit cost for a specific model
 */
export function getModelCost(modelId: string): ModelCostInfo {
  return MODEL_COSTS[modelId] || { cost: 1, category: 'cheap', description: 'Standard model' };
}

/**
 * Check if user has sufficient credits for a model
 */
export function hasInsufficientCredits(userCredits: number, modelId: string): boolean {
  const { cost } = getModelCost(modelId);
  return userCredits < cost;
} 