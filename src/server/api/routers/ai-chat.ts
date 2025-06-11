import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";
import { 
  aiModelManager, 
  isValidProvider,
  type AIProvider,
  type AIModelConfig,
  AI_PROVIDERS 
} from "~/server/lib/ai-model-manager";
import type { CoreMessage } from "ai";
import { TRPCError } from "@trpc/server";

// Validation schemas
const messageSchema = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.string(),
});

const aiConfigSchema = z.object({
  provider: z.enum([AI_PROVIDERS.OPENAI, AI_PROVIDERS.ANTHROPIC, AI_PROVIDERS.GOOGLE]),
  model: z.string(),
  maxTokens: z.number().min(1).max(8000).optional(),
  temperature: z.number().min(0).max(2).optional(),
  topP: z.number().min(0).max(1).optional(),
  topK: z.number().min(1).max(100).optional(),
  presencePenalty: z.number().min(-2).max(2).optional(),
  frequencyPenalty: z.number().min(-2).max(2).optional(),
});

const chatRequestSchema = z.object({
  messages: z.array(messageSchema).min(1),
  config: aiConfigSchema,
  conversationId: z.string().optional(),
});

export const aiChatRouter = createTRPCRouter({
  // Get available providers and models
  getAvailableModels: publicProcedure.query(async () => {
    try {
      const availableProviders = aiModelManager.getAvailableProviders();
      const allModels = aiModelManager.getAllAvailableModels();
      
      return {
        providers: availableProviders,
        models: allModels,
        success: true,
      };
    } catch (error) {
      console.error("Error fetching available models:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch available models",
      });
    }
  }),

  // Get default configuration for a provider
  getDefaultConfig: publicProcedure
    .input(z.object({
      provider: z.enum([AI_PROVIDERS.OPENAI, AI_PROVIDERS.ANTHROPIC, AI_PROVIDERS.GOOGLE]),
    }))
    .query(async ({ input }) => {
      try {
        const defaultConfig = aiModelManager.getDefaultConfig(input.provider);
        return {
          config: defaultConfig,
          success: true,
        };
      } catch (error) {
        console.error("Error fetching default config:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch default configuration",
        });
      }
    }),

  // Validate model availability
  validateModel: publicProcedure
    .input(z.object({
      provider: z.enum([AI_PROVIDERS.OPENAI, AI_PROVIDERS.ANTHROPIC, AI_PROVIDERS.GOOGLE]),
      model: z.string(),
    }))
    .query(async ({ input }) => {
      try {
        const isValid = aiModelManager.validateModel(input.provider, input.model);
        return {
          isValid,
          success: true,
        };
      } catch (error) {
        console.error("Error validating model:", error);
        return {
          isValid: false,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }),

  // Generate AI response (non-streaming)
  generateResponse: protectedProcedure
    .input(chatRequestSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        // Validate the model
        if (!aiModelManager.validateModel(input.config.provider, input.config.model)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Invalid model ${input.config.model} for provider ${input.config.provider}`,
          });
        }

        // Generate response
        const response = await aiModelManager.generateResponse({
          messages: input.messages as CoreMessage[],
          config: input.config as AIModelConfig,
        });

        // TODO: Save conversation to database if conversationId is provided
        // This would require extending your database schema to include conversations and messages

        return {
          content: response.content,
          usage: response.usage,
          finishReason: response.finishReason,
          success: true,
        };
      } catch (error) {
        console.error("Error generating AI response:", error);
        
        if (error instanceof TRPCError) {
          throw error;
        }
        
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to generate response",
        });
      }
    }),

  // Stream AI response
  streamResponse: protectedProcedure
    .input(chatRequestSchema)
    .subscription(async function* ({ input }) {
      try {
        // Validate the model
        if (!aiModelManager.validateModel(input.config.provider, input.config.model)) {
          yield {
            type: "error" as const,
            message: `Invalid model ${input.config.model} for provider ${input.config.provider}`,
          };
          return;
        }

        yield {
          type: "start" as const,
          message: "Starting response generation...",
        };

        // Generate streaming response
        const stream = aiModelManager.generateStreamResponse({
          messages: input.messages as CoreMessage[],
          config: input.config as AIModelConfig,
        });

        for await (const chunk of stream) {
          yield {
            type: "chunk" as const,
            content: chunk,
          };
        }

        yield {
          type: "end" as const,
          message: "Response generation completed",
        };

      } catch (error) {
        console.error("Error streaming AI response:", error);
        yield {
          type: "error" as const,
          message: error instanceof Error ? error.message : "Failed to stream response",
        };
      }
    }),

  // Get conversation history (placeholder - requires database schema)
  getConversationHistory: protectedProcedure
    .input(z.object({
      conversationId: z.string(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input, ctx }) => {
      // TODO: Implement conversation history retrieval from database
      // This would require extending your database schema
      
      return {
        messages: [],
        totalCount: 0,
        success: true,
      };
    }),

  // Save conversation (placeholder - requires database schema)
  saveConversation: protectedProcedure
    .input(z.object({
      title: z.string().optional(),
      messages: z.array(messageSchema),
      config: aiConfigSchema,
    }))
    .mutation(async ({ input, ctx }) => {
      // TODO: Implement conversation saving to database
      // This would require extending your database schema to include:
      // - Conversations table (id, userId, title, createdAt, updatedAt)
      // - Messages table (id, conversationId, role, content, timestamp)
      // - ModelConfigs table (id, conversationId, provider, model, config)
      
      const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      return {
        conversationId,
        success: true,
        message: "Conversation saved successfully",
      };
    }),

  // List user conversations (placeholder - requires database schema)
  listConversations: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input, ctx }) => {
      // TODO: Implement conversation listing from database
      
      return {
        conversations: [],
        totalCount: 0,
        success: true,
      };
    }),

  // Delete conversation (placeholder - requires database schema)
  deleteConversation: protectedProcedure
    .input(z.object({
      conversationId: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      // TODO: Implement conversation deletion from database
      
      return {
        success: true,
        message: "Conversation deleted successfully",
      };
    }),
});

// Export types for frontend use
export type AIChatRouter = typeof aiChatRouter; 