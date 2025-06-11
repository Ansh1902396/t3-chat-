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

// Helper function to generate conversation title from first message
function generateConversationTitle(firstMessage: string): string {
  const maxLength = 50;
  const cleaned = firstMessage.trim().replace(/\n/g, ' ').replace(/\s+/g, ' ');
  
  if (cleaned.length <= maxLength) {
    return cleaned;
  }
  
  const truncated = cleaned.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  
  if (lastSpace > maxLength * 0.7) {
    return truncated.substring(0, lastSpace) + '...';
  }
  
  return truncated + '...';
}

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

  // Save conversation
  saveConversation: protectedProcedure
    .input(z.object({
      title: z.string().optional(),
      messages: z.array(messageSchema),
      config: aiConfigSchema,
      conversationId: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const userId = ctx.session.user.id;
        
        let conversation;
        
        if (input.conversationId) {
          // Update existing conversation
          conversation = await ctx.db.conversation.update({
            where: {
              id: input.conversationId,
              userId: userId, // Ensure user owns the conversation
            },
            data: {
              title: input.title,
              updatedAt: new Date(),
            },
          });
          
          // Delete existing messages
          await ctx.db.message.deleteMany({
            where: {
              conversationId: conversation.id,
            },
          });
          
          // Update config
          await ctx.db.chatConfig.upsert({
            where: {
              conversationId: conversation.id,
            },
            update: {
              provider: input.config.provider,
              model: input.config.model,
              maxTokens: input.config.maxTokens,
              temperature: input.config.temperature,
              topP: input.config.topP,
              topK: input.config.topK,
              presencePenalty: input.config.presencePenalty,
              frequencyPenalty: input.config.frequencyPenalty,
            },
            create: {
              conversationId: conversation.id,
              provider: input.config.provider,
              model: input.config.model,
              maxTokens: input.config.maxTokens,
              temperature: input.config.temperature,
              topP: input.config.topP,
              topK: input.config.topK,
              presencePenalty: input.config.presencePenalty,
              frequencyPenalty: input.config.frequencyPenalty,
            },
          });
        } else {
          // Create new conversation
          const title = input.title || 
            (input.messages.find(m => m.role === 'user')?.content ? 
              generateConversationTitle(input.messages.find(m => m.role === 'user')!.content) : 
              'New Chat');
          
          conversation = await ctx.db.conversation.create({
            data: {
              title,
              userId: userId,
              config: {
                create: {
                  provider: input.config.provider,
                  model: input.config.model,
                  maxTokens: input.config.maxTokens,
                  temperature: input.config.temperature,
                  topP: input.config.topP,
                  topK: input.config.topK,
                  presencePenalty: input.config.presencePenalty,
                  frequencyPenalty: input.config.frequencyPenalty,
                },
              },
            },
          });
        }
        
        // Add messages
        await ctx.db.message.createMany({
          data: input.messages.map(msg => ({
            conversationId: conversation.id,
            role: msg.role,
            content: msg.content,
            timestamp: new Date(),
          })),
        });
        
        return {
          conversationId: conversation.id,
          title: conversation.title,
          success: true,
          message: "Conversation saved successfully",
        };
      } catch (error) {
        console.error("Error saving conversation:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to save conversation",
        });
      }
    }),

  // Get conversation history
  getConversationHistory: protectedProcedure
    .input(z.object({
      conversationId: z.string(),
    }))
    .query(async ({ input, ctx }) => {
      try {
        const userId = ctx.session.user.id;
        
        const conversation = await ctx.db.conversation.findFirst({
          where: {
            id: input.conversationId,
            userId: userId,
          },
          include: {
            messages: {
              orderBy: {
                timestamp: 'asc',
              },
            },
            config: true,
          },
        });
        
        if (!conversation) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Conversation not found",
          });
        }
        
        return {
          conversation: {
            id: conversation.id,
            title: conversation.title,
            createdAt: conversation.createdAt,
            updatedAt: conversation.updatedAt,
          },
          messages: conversation.messages,
          config: conversation.config,
          success: true,
        };
      } catch (error) {
        console.error("Error fetching conversation history:", error);
        
        if (error instanceof TRPCError) {
          throw error;
        }
        
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch conversation history",
        });
      }
    }),

  // List user conversations
  listConversations: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input, ctx }) => {
      try {
        const userId = ctx.session.user.id;
        
        const [conversations, totalCount] = await Promise.all([
          ctx.db.conversation.findMany({
            where: {
              userId: userId,
            },
            select: {
              id: true,
              title: true,
              createdAt: true,
              updatedAt: true,
              _count: {
                select: {
                  messages: true,
                },
              },
            },
            orderBy: {
              updatedAt: 'desc',
            },
            take: input.limit,
            skip: input.offset,
          }),
          ctx.db.conversation.count({
            where: {
              userId: userId,
            },
          }),
        ]);
        
        return {
          conversations,
          totalCount,
          success: true,
        };
      } catch (error) {
        console.error("Error listing conversations:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to list conversations",
        });
      }
    }),

  // Delete conversation
  deleteConversation: protectedProcedure
    .input(z.object({
      conversationId: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const userId = ctx.session.user.id;
        
        // Verify the conversation belongs to the user and delete it
        const deletedConversation = await ctx.db.conversation.deleteMany({
          where: {
            id: input.conversationId,
            userId: userId,
          },
        });
        
        if (deletedConversation.count === 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Conversation not found or you don't have permission to delete it",
          });
        }
        
        return {
          success: true,
          message: "Conversation deleted successfully",
        };
      } catch (error) {
        console.error("Error deleting conversation:", error);
        
        if (error instanceof TRPCError) {
          throw error;
        }
        
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete conversation",
        });
      }
    }),

  // Update conversation title
  updateConversationTitle: protectedProcedure
    .input(z.object({
      conversationId: z.string(),
      title: z.string().min(1).max(100),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const userId = ctx.session.user.id;
        
        const updatedConversation = await ctx.db.conversation.updateMany({
          where: {
            id: input.conversationId,
            userId: userId,
          },
          data: {
            title: input.title,
            updatedAt: new Date(),
          },
        });
        
        if (updatedConversation.count === 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Conversation not found or you don't have permission to update it",
          });
        }
        
        return {
          success: true,
          message: "Conversation title updated successfully",
        };
      } catch (error) {
        console.error("Error updating conversation title:", error);
        
        if (error instanceof TRPCError) {
          throw error;
        }
        
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update conversation title",
        });
      }
    }),
});

// Export types for frontend use
export type AIChatRouter = typeof aiChatRouter; 