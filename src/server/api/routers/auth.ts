import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";

export const authRouter = createTRPCRouter({
  getSession: publicProcedure.query(({ ctx }) => {
    return ctx.session;
  }),

  getUser: protectedProcedure.query(({ ctx }) => {
    return {
      id: ctx.session.user.id,
      name: ctx.session.user.name,
      email: ctx.session.user.email,
      image: ctx.session.user.image,
    };
  }),

  getUserStats: protectedProcedure.query(async ({ ctx }) => {
    // This is a placeholder for user stats like plan, credits, etc.
    // You can enhance this later with actual database queries
    return {
      plan: "free",
      credits: 100,
      messagesThisMonth: 0,
      joinedAt: new Date(),
    };
  }),
}); 