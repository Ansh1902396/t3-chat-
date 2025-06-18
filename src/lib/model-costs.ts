export const MODEL_COSTS = {
  // Low cost models (1 credit)
  'gemini-1.5-flash': 1,
  'gpt-4o-mini': 1,
  'claude-3-haiku': 1,
  'deepseek-chat': 1,
  'deepseek-coder': 1,
  
  // High cost models (3 credits)
  'gpt-4o': 3,
  'gpt-4': 3,
  'claude-3-5-sonnet': 3,
  'claude-3-opus': 3,
  'gemini-1.5-pro': 3,
  'o1-preview': 3,
  'o1-mini': 3,
  
  // Image generation (5 credits)
  'dall-e-3': 5,
  'dall-e-2': 5,
  'midjourney': 5,
} as const;

export function getModelCost(modelId: string): number {
  // Check if it's an image generation model
  if (modelId.toLowerCase().includes('dall-e') || 
      modelId.toLowerCase().includes('midjourney') ||
      modelId.toLowerCase().includes('image')) {
    return 5;
  }
  
  // Return cost from lookup table, default to 1 for unknown models
  return MODEL_COSTS[modelId as keyof typeof MODEL_COSTS] ?? 1;
}

export function isImageGenerationModel(modelId: string): boolean {
  return modelId.toLowerCase().includes('dall-e') || 
         modelId.toLowerCase().includes('midjourney') ||
         modelId.toLowerCase().includes('image');
}

export function getModelTier(modelId: string): 'low' | 'high' | 'image' {
  const cost = getModelCost(modelId);
  if (cost >= 5) return 'image';
  if (cost >= 3) return 'high';
  return 'low';
}

export function canAffordModel(userCredits: number, modelId: string): boolean {
  const cost = getModelCost(modelId);
  return userCredits >= cost;
} 