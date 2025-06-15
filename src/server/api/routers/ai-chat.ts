import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";
import { 
  aiModelManager, 
  isValidProvider,
  type AIProvider,
  type AIModelConfig,
  AI_PROVIDERS,
  type ImageGenerationRequest,
  type ImageGenerationResponse,
} from "~/server/lib/ai-model-manager";
import type { CoreMessage } from "ai";
import { TRPCError } from "@trpc/server";
import OpenAI from "openai";
import { env } from "~/env";
import { db } from "~/server/db";

// Re-export types for client use
export type { AIProvider, AIModelConfig, ImageGenerationRequest, ImageGenerationResponse };
export { AI_PROVIDERS };

// Validation schemas
const attachmentSchema = z.object({
  id: z.string(),
  fileName: z.string(),
  fileType: z.enum(["image", "document", "audio", "video"]),
  fileSize: z.number(),
  mimeType: z.string(),
  cloudinaryId: z.string(),
  url: z.string(),
});

const messageSchema = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.string(),
  attachments: z.array(attachmentSchema).optional(),
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

// Add image generation schema
const imageGenerationSchema = z.object({
  prompt: z.string().min(1).max(1000),
  config: aiConfigSchema.extend({
    size: z.enum(['256x256', '512x512', '1024x1024', '1024x1792', '1792x1024']).optional(),
    quality: z.enum(['standard', 'hd']).optional(),
    style: z.enum(['vivid', 'natural']).optional(),
    n: z.number().min(1).max(4).optional(),
  }),
});

// Helper function to generate conversation title from first message
function generateConversationTitle(message: string): string {
  const maxLength = 50;
  const cleaned = message.trim().replace(/\n/g, ' ').replace(/\s+/g, ' ');
  
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

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
  
});

// Helper function to queue summary generation
async function queueSummaryGeneration(conversationId: string, messages: Array<{ role: string; content: string }>) {
  try {
    // Create context from messages
    const context = messages
      .map((msg) => `${msg.role}: ${msg.content}`)
      .join("\n");

    if (!context) {
      return;
    }

    // Generate summary
    const summaryResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that creates concise, searchable summaries of conversations. Focus on the main topics, key points, and context that would help someone find this conversation later. Keep it under 200 words.",
        },
        {
          role: "user",
          content: `Please summarize this conversation:\n\n${context}`,
        },
      ],
      max_tokens: 300,
      temperature: 0.3,
    });

    const summary = summaryResponse.choices[0]?.message?.content ?? "";

    // Generate embedding for the summary
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: summary,
    });

    const embedding = JSON.stringify(embeddingResponse.data[0]!.embedding);

    // Update conversation with summary and embedding
    await db.conversation.update({
      where: { id: conversationId },
      data: {
        summary,
        embedding,
      },
    });
  } catch (error) {
    console.error(`Error generating summary for conversation ${conversationId}:`, error);
  }
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

        // Add system prompt for proper formatting
        const systemPrompt = {
          role: "system" as const,
          content: `You are a helpful AI assistant. When providing code examples, always format them properly using markdown code blocks with language specification. 

For example:
- Use \`\`\`typescript for TypeScript code
- Use \`\`\`javascript for JavaScript code  
- Use \`\`\`python for Python code
- Use \`\`\`json for JSON data
- Use \`\`\`css for CSS styles
- Use \`\`\`html for HTML markup
- Use \`\`\`bash for shell commands

Always include the language identifier after the opening triple backticks for proper syntax highlighting.

For inline code, use single backticks: \`variableName\` or \`functionName()\`.

Format your responses with proper markdown structure including headers, lists, and code blocks as appropriate.`
        };

        // Prepend system prompt if not already present
        const messages = input.messages.find(m => m.role === "system") 
          ? input.messages 
          : [systemPrompt, ...input.messages];

        // Define fallback providers in order of preference
        const fallbackProviders: Array<{ provider: AIProvider; model: string }> = [
          { provider: input.config.provider, model: input.config.model }, // Original choice
          { provider: "google", model: "gemini-1.5-flash" }, // Fast and reliable fallback
          { provider: "anthropic", model: "claude-3-5-haiku-20241022" }, // Alternative fallback
        ];

        // Remove duplicates and invalid providers
        const validFallbacks = fallbackProviders.filter((fallback, index, arr) => {
          const isUnique = arr.findIndex(f => f.provider === fallback.provider && f.model === fallback.model) === index;
          return isUnique && aiModelManager.getAvailableProviders().includes(fallback.provider);
        });

        let lastError: Error | null = null;

        // Try each provider in sequence
        for (const fallback of validFallbacks) {
          try {
            const config = {
              ...input.config,
              provider: fallback.provider,
              model: fallback.model,
            };

            // Generate response
            const response = await aiModelManager.generateResponse({
              messages: messages as CoreMessage[],
              config: config as AIModelConfig,
            });

            return {
              content: response.content,
              usage: response.usage,
              finishReason: response.finishReason,
              success: true,
              provider: fallback.provider, // Include which provider was actually used
              model: fallback.model,
            };
          } catch (error) {
            console.error(`Failed with provider ${fallback.provider}:`, error);
            lastError = error as Error;
            
            // If it's a quota/rate limit error, try the next provider immediately
            if (error instanceof Error && (
              error.message.includes('quota') || 
              error.message.includes('rate limit') ||
              error.message.includes('429')
            )) {
              continue;
            }
            
            // For other errors, also try the next provider but log it differently
            console.log(`Trying next provider due to error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            continue;
          }
        }

        // If all providers failed, throw the last error
        throw lastError || new Error('All providers failed');

      } catch (error) {
        console.error("Error generating AI response:", error);
        
        if (error instanceof TRPCError) {
          throw error;
        }
        
        // Provide more helpful error message
        const errorMessage = error instanceof Error ? error.message : "Failed to generate response";
        const isQuotaError = errorMessage.includes('quota') || errorMessage.includes('rate limit');
        
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: isQuotaError 
            ? "AI service temporarily unavailable due to high demand. Please try again in a few minutes."
            : errorMessage,
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
            (input.messages.find(m => m.role === 'user')?.content 
              ? generateConversationTitle(input.messages.find(m => m.role === 'user')!.content)
              : 'New Chat');
          
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
        
        // Add messages with attachments
        for (const msg of input.messages) {
          const message = await ctx.db.message.create({
            data: {
              conversationId: conversation.id,
              role: msg.role,
              content: msg.content,
              timestamp: new Date(),
            },
          });

          // Add attachments if present
          if (msg.attachments && msg.attachments.length > 0) {
            await ctx.db.attachment.createMany({
              data: msg.attachments.map(attachment => ({
                messageId: message.id,
                fileName: attachment.fileName,
                fileType: attachment.fileType,
                fileSize: attachment.fileSize,
                mimeType: attachment.mimeType,
                cloudinaryId: attachment.cloudinaryId,
                url: attachment.url,
              })),
            });
          }
        }
        
        // Auto-generate summary for conversations with multiple messages (always update to keep fresh)
        if (input.messages.length >= 2) {
          // Queue summary generation asynchronously (don't await to avoid slowing down the save)
          // Always regenerate to keep summaries fresh and up-to-date
          queueSummaryGeneration(conversation.id, input.messages).catch(console.error);
        }
        
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
              include: {
                attachments: true,
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

  // Generate image
  generateImage: protectedProcedure
    .input(imageGenerationSchema)
    .mutation(async ({ input }) => {
      try {
        // Only allow OpenAI DALL-E models for now
        if (input.config.provider !== AI_PROVIDERS.OPENAI || !input.config.model.startsWith('dall-e')) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Image generation is currently only supported with OpenAI DALL-E models",
          });
        }

        // Generate image with OpenAI DALL-E
        const response = await aiModelManager.generateImage({
          prompt: input.prompt,
          config: input.config,
        });

        return {
          images: response.images,
          usage: response.usage,
          success: true,
          provider: AI_PROVIDERS.OPENAI,
          model: input.config.model,
        };
      } catch (error) {
        console.error("Error generating image:", error);
        
        if (error instanceof TRPCError) {
          throw error;
        }
        
        // Provide more helpful error message
        const errorMessage = error instanceof Error ? error.message : "Failed to generate image";
        const isQuotaError = errorMessage.includes('quota') || errorMessage.includes('rate limit');
        
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: isQuotaError 
            ? "AI service temporarily unavailable due to high demand. Please try again in a few minutes."
            : errorMessage,
        });
      }
    }),
});

// Export types for frontend use
export type AIChatRouter = typeof aiChatRouter; 