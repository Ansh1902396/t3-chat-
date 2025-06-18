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
    // Fetch actual user data from database
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
    });

    return {
      plan: "free",
      credits: (user as any)?.credits ?? 20,
      messagesThisMonth: 0,
      joinedAt: new Date(),
    };
  }),
}); 