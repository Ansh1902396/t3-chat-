import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { z } from "zod";

export const authRouter = createTRPCRouter({
  getSession: publicProcedure.query(({ ctx }) => {
    return ctx.session;
  }),

  getUser: protectedProcedure.query(async ({ ctx }) => {
    const user = await db.user.findUnique({
      where: { id: ctx.session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        credits: true,
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    return user;
  }),

  getUserStats: protectedProcedure.query(async ({ ctx }) => {
    const user = await db.user.findUnique({
      where: { id: ctx.session.user.id },
      select: {
        credits: true,
        _count: {
          select: {
            conversations: true,
          },
        },
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    return {
      plan: "free",
      credits: user.credits,
      conversationsCount: user._count.conversations,
      joinedAt: new Date(),
    };
  }),

  // Add credit deduction function
  deductCredits: protectedProcedure
    .input(z.object({
      amount: z.number().min(1).max(10),
      reason: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const user = await db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { credits: true },
      });

      if (!user) {
        throw new Error("User not found");
      }

      if (user.credits < input.amount) {
        throw new Error("Insufficient credits");
      }

      const updatedUser = await db.user.update({
        where: { id: ctx.session.user.id },
        data: {
          credits: {
            decrement: input.amount,
          },
        },
        select: { credits: true },
      });

      return {
        success: true,
        newCreditBalance: updatedUser.credits,
        deductedAmount: input.amount,
      };
    }),

  // Add function to check credit balance
  checkCredits: protectedProcedure.query(async ({ ctx }) => {
    const user = await db.user.findUnique({
      where: { id: ctx.session.user.id },
      select: { credits: true },
    });

    if (!user) {
      throw new Error("User not found");
    }

    return { credits: user.credits };
  }),
}); 