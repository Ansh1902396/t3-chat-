import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import OpenAI from "openai";
import { env } from "~/env";
import { db } from "~/server/db";

const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

export const searchRouter = createTRPCRouter({
  // Search conversations semantically
  searchConversations: protectedProcedure
    .input(
      z.object({
        query: z.string().max(500),
        limit: z.number().min(1).max(50).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      const { query, limit } = input;
      
      console.log(`🔍 Search Debug - Query: "${query}", User ID: ${ctx.session.user.id}`);
      
      // If query is empty, return recent conversations
      if (!query || !query.trim()) {
        console.log("📋 Returning recent conversations (empty query)");
        return ctx.db.conversation.findMany({
          where: { userId: ctx.session.user.id },
          orderBy: { updatedAt: "desc" },
          take: limit,
          include: {
            _count: {
              select: { messages: true }
            }
          }
        });
      }

      // Auto-generate summaries for conversations without them (background task)
      queueMissingSummariesGeneration(ctx.session.user.id);

      console.log("🎯 Starting semantic search with text fallback...");
      
      // Get all conversations (with and without summaries)
      const allConversations = await ctx.db.conversation.findMany({
        where: { userId: ctx.session.user.id },
        orderBy: { updatedAt: "desc" },
        include: {
          _count: {
            select: { messages: true }
          }
        }
      });

      console.log(`📚 Found ${allConversations.length} total conversations`);

      // Separate conversations with and without embeddings
      const conversationsWithEmbeddings = allConversations.filter(conv => conv.embedding);
      const conversationsWithoutEmbeddings = allConversations.filter(conv => !conv.embedding);

      console.log(`🔮 ${conversationsWithEmbeddings.length} with embeddings, ${conversationsWithoutEmbeddings.length} without`);

      let semanticResults: any[] = [];
      
      // Try semantic search first if we have conversations with embeddings
      if (conversationsWithEmbeddings.length > 0) {
        try {
          console.log("🧠 Performing semantic search...");
          
          const queryEmbedding = await openai.embeddings.create({
            model: "text-embedding-3-small",
            input: query,
          });

          semanticResults = conversationsWithEmbeddings
            .map((conv) => {
              try {
                const convEmbedding = JSON.parse(conv.embedding!) as number[];
                const similarity = cosineSimilarity(
                  queryEmbedding.data[0]!.embedding,
                  convEmbedding
                );
                console.log(`  📈 "${conv.title}": similarity ${similarity.toFixed(4)}`);
                return { ...conv, similarity };
              } catch (error) {
                console.error(`❌ Error parsing embedding for "${conv.title}":`, error);
                return null;
              }
            })
            .filter((result): result is NonNullable<typeof result> => result !== null)
            .filter(result => result.similarity > 0.1) // Only include results with reasonable similarity
            .sort((a, b) => b.similarity - a.similarity);

          console.log(`🎯 Semantic search found ${semanticResults.length} relevant results`);
        } catch (error) {
          console.error("❌ Semantic search failed:", error);
          semanticResults = [];
        }
      }

      // Text-based fallback search on all conversations
      const textResults = allConversations.filter(conv => 
        conv.title?.toLowerCase().includes(query.toLowerCase()) ||
        conv.summary?.toLowerCase().includes(query.toLowerCase())
      );

      console.log(`📊 Text search found ${textResults.length} results`);

      // Combine and deduplicate results
      const combinedResults = new Map();
      
      // Add semantic results first (higher priority)
      semanticResults.forEach(result => {
        combinedResults.set(result.id, result);
      });
      
      // Add text results if not already included
      textResults.forEach(result => {
        if (!combinedResults.has(result.id)) {
          combinedResults.set(result.id, { ...result, similarity: 0.9 }); // High score for text matches
        }
      });

      const finalResults = Array.from(combinedResults.values())
        .sort((a, b) => (b.similarity || 0) - (a.similarity || 0))
        .slice(0, limit);

      console.log(`✅ Returning ${finalResults.length} combined results`);
      return finalResults;
    }),

  // Generate summary and embedding for a conversation
  generateSummary: protectedProcedure
    .input(z.object({ conversationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const conversation = await ctx.db.conversation.findUnique({
        where: {
          id: input.conversationId,
          userId: ctx.session.user.id,
        },
        include: {
          messages: {
            orderBy: { timestamp: "asc" },
            take: 20, // Limit messages to avoid token limits
          },
        },
      });

      if (!conversation) {
        throw new Error("Conversation not found");
      }

      // Create context from messages
      const context = conversation.messages
        .map((msg) => `${msg.role}: ${msg.content}`)
        .join("\n");

      if (!context) {
        throw new Error("No messages to summarize");
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
      const updatedConversation = await ctx.db.conversation.update({
        where: { id: input.conversationId },
        data: {
          summary,
          embedding,
        },
      });

      return updatedConversation;
    }),

  // Bulk generate summaries for conversations without them
  generateMissingSummaries: protectedProcedure
    .input(z.object({ batchSize: z.number().min(1).max(10).default(5) }))
    .mutation(async ({ ctx, input }) => {
      const conversationsWithoutSummaries = await ctx.db.conversation.findMany({
        where: {
          userId: ctx.session.user.id,
          summary: null,
        },
        include: {
          messages: {
            orderBy: { timestamp: "asc" },
            take: 20,
          },
        },
        take: input.batchSize,
        orderBy: { updatedAt: "desc" },
      });

      const results = [];

      for (const conversation of conversationsWithoutSummaries) {
        try {
          const context = conversation.messages
            .map((msg) => `${msg.role}: ${msg.content}`)
            .join("\n");

          if (!context) continue;

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

          // Generate embedding
          const embeddingResponse = await openai.embeddings.create({
            model: "text-embedding-3-small",
            input: summary,
          });

          const embedding = JSON.stringify(embeddingResponse.data[0]!.embedding);

          // Update conversation
          await ctx.db.conversation.update({
            where: { id: conversation.id },
            data: { summary, embedding },
          });

          results.push({ id: conversation.id, success: true });
        } catch (error) {
          console.error(`Error processing conversation ${conversation.id}:`, error);
          results.push({ id: conversation.id, success: false, error: error instanceof Error ? error.message : 'Unknown error' });
        }
      }

      return {
        processed: results.length,
        successful: results.filter(r => r.success).length,
        results,
      };
    }),

  // Debug endpoint to list all conversations for a user
  debugListConversations: protectedProcedure
    .query(async ({ ctx }) => {
      const conversations = await ctx.db.conversation.findMany({
        where: { userId: ctx.session.user.id },
        select: {
          id: true,
          title: true,
          summary: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: { messages: true }
          }
        },
        orderBy: { updatedAt: "desc" },
        take: 50
      });

      console.log(`🐛 Debug: User ${ctx.session.user.id} has ${conversations.length} conversations`);
      conversations.forEach((conv, i) => {
        console.log(`  ${i + 1}. "${conv.title}" (${conv._count.messages} messages)`);
      });

      return conversations;
    }),
});

// Helper function to queue missing summaries generation for a user (background task)
function queueMissingSummariesGeneration(userId: string) {
  // Run this asynchronously in the background
  setTimeout(async () => {
    try {
      const conversationsWithoutSummaries = await db.conversation.findMany({
        where: {
          userId: userId,
          summary: null,
        },
        include: {
          messages: {
            orderBy: { timestamp: "asc" },
            take: 20,
          },
        },
        take: 3, // Process only a few at a time to avoid overloading
        orderBy: { updatedAt: "desc" },
      });

      console.log(`🔄 Background: Processing ${conversationsWithoutSummaries.length} conversations without summaries for user ${userId}`);

              for (const conversation of conversationsWithoutSummaries) {
          try {
            const context = conversation.messages
              .map((msg: any) => `${msg.role}: ${msg.content}`)
              .join("\n");

            if (!context || context.length < 50) continue; // Skip very short conversations

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

          // Generate embedding
          const embeddingResponse = await openai.embeddings.create({
            model: "text-embedding-3-small",
            input: summary,
          });

          const embedding = JSON.stringify(embeddingResponse.data[0]!.embedding);

          // Update conversation
          await db.conversation.update({
            where: { id: conversation.id },
            data: { summary, embedding },
          });

          console.log(`✅ Background: Generated summary for "${conversation.title}"`);
          
          // Small delay to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(`❌ Background: Failed to process conversation ${conversation.id}:`, error);
        }
      }
    } catch (error) {
      console.error("❌ Background summary generation failed:", error);
    }
  }, 100); // Start after 100ms
}

// Helper function to calculate cosine similarity between two vectors
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length');
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i]! * b[i]!;
    normA += a[i]! * a[i]!;
    normB += b[i]! * b[i]!;
  }
  
  if (normA === 0 || normB === 0) {
    return 0;
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
} 