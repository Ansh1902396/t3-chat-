import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { encrypt, decrypt } from "~/server/lib/encryption";
import { TRPCError } from "@trpc/server";

export const providersRouter = createTRPCRouter({
  // List all custom providers for the current user
  list: protectedProcedure.query(async ({ ctx }) => {
    const providers = await ctx.db.customProvider.findMany({
      where: { userId: ctx.session.user.id },
      select: {
        id: true,
        name: true,
        baseUrl: true,
        model: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return providers;
  }),

  // Create a new custom provider
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(50),
        baseUrl: z.string().url().optional(),
        apiKey: z.string().min(1),
        model: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check if provider with same name exists
      const existing = await ctx.db.customProvider.findFirst({
        where: {
          userId: ctx.session.user.id,
          name: input.name,
        },
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A provider with this name already exists",
        });
      }

      // Encrypt the API key
      const encryptedApiKey = await encrypt(input.apiKey);

      // Create the provider
      const provider = await ctx.db.customProvider.create({
        data: {
          name: input.name,
          baseUrl: input.baseUrl,
          apiKey: encryptedApiKey,
          model: input.model,
          userId: ctx.session.user.id,
        },
      });

      return {
        id: provider.id,
        name: provider.name,
        baseUrl: provider.baseUrl,
        model: provider.model,
        isActive: provider.isActive,
        createdAt: provider.createdAt,
        updatedAt: provider.updatedAt,
      };
    }),

  // Update an existing provider
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(50).optional(),
        baseUrl: z.string().url().optional().nullable(),
        apiKey: z.string().min(1).optional(),
        model: z.string().min(1).optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;

      // Check if provider exists and belongs to user
      const existing = await ctx.db.customProvider.findFirst({
        where: {
          id,
          userId: ctx.session.user.id,
        },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Provider not found",
        });
      }

      // If name is being updated, check for conflicts
      if (updates.name && updates.name !== existing.name) {
        const nameConflict = await ctx.db.customProvider.findFirst({
          where: {
            userId: ctx.session.user.id,
            name: updates.name,
          },
        });

        if (nameConflict) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "A provider with this name already exists",
          });
        }
      }

      // If API key is being updated, encrypt it
      if (updates.apiKey) {
        updates.apiKey = await encrypt(updates.apiKey);
      }

      // Update the provider
      const provider = await ctx.db.customProvider.update({
        where: { id },
        data: updates,
      });

      return {
        id: provider.id,
        name: provider.name,
        baseUrl: provider.baseUrl,
        model: provider.model,
        isActive: provider.isActive,
        createdAt: provider.createdAt,
        updatedAt: provider.updatedAt,
      };
    }),

  // Delete a provider
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Check if provider exists and belongs to user
      const existing = await ctx.db.customProvider.findFirst({
        where: {
          id: input.id,
          userId: ctx.session.user.id,
        },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Provider not found",
        });
      }

      await ctx.db.customProvider.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  // Get provider details including decrypted API key
  getDetails: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const provider = await ctx.db.customProvider.findFirst({
        where: {
          id: input.id,
          userId: ctx.session.user.id,
        },
      });

      if (!provider) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Provider not found",
        });
      }

      // Decrypt the API key
      const apiKey = await decrypt(provider.apiKey);

      return {
        ...provider,
        apiKey,
      };
    }),
}); 