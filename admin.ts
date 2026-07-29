import { v } from "convex/values";
import { mutation, query, MutationCtx, QueryCtx } from "./_generated/server";
import { getCurrentUser, ensureCurrentUser } from "./users";

async function requireAdminQuery(ctx: QueryCtx) {
  const user = await getCurrentUser(ctx);
  if (!user || user.role !== "admin") throw new Error("Not authorized");
  return user;
}

async function requireAdminMutation(ctx: MutationCtx) {
  const user = await ensureCurrentUser(ctx);
  if (!user || user.role !== "admin") throw new Error("Not authorized");
  return user;
}

export const getAllUsers = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireAdminQuery(ctx);
    const limit = args.limit ?? 50;
    return await ctx.db.query("users").take(limit);
  },
});

export const getAllPosts = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireAdminQuery(ctx);
    const limit = args.limit ?? 50;
    const posts = await ctx.db.query("posts").order("desc").take(limit);

    const enriched = await Promise.all(
      posts.map(async (post) => {
        const postUser = await ctx.db.get(post.userId);
        return { ...post, user: postUser };
      }),
    );
    return enriched;
  },
});

export const deleteUser = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await requireAdminMutation(ctx);

    const posts = await ctx.db.query("posts").withIndex("userId", (q) => q.eq("userId", args.userId)).collect();
    for (const post of posts) {
      const likes = await ctx.db.query("likes").withIndex("postId", (q) => q.eq("postId", post._id)).collect();
      for (const l of likes) await ctx.db.delete(l._id);
      const comments = await ctx.db.query("comments").withIndex("postId", (q) => q.eq("postId", post._id)).collect();
      for (const c of comments) await ctx.db.delete(c._id);
      const saves = await ctx.db.query("saves").withIndex("postId", (q) => q.eq("postId", post._id)).collect();
      for (const s of saves) await ctx.db.delete(s._id);
      await ctx.db.delete(post._id);
    }

    const stories = await ctx.db.query("stories").withIndex("userId", (q) => q.eq("userId", args.userId)).collect();
    for (const s of stories) await ctx.db.delete(s._id);

    const follows = await ctx.db.query("follows").withIndex("followerId", (q) => q.eq("followerId", args.userId)).collect();
    for (const f of follows) await ctx.db.delete(f._id);
    const followedBy = await ctx.db.query("follows").withIndex("followingId", (q) => q.eq("followingId", args.userId)).collect();
    for (const f of followedBy) await ctx.db.delete(f._id);

    await ctx.db.delete(args.userId);
  },
});

export const updateUserRole = mutation({
  args: { userId: v.id("users"), role: v.union(v.literal("admin"), v.literal("user"), v.literal("member")) },
  handler: async (ctx, args) => {
    await requireAdminMutation(ctx);
    await ctx.db.patch(args.userId, { role: args.role });
  },
});

export const getStats = query({
  args: {},
  handler: async (ctx) => {
    await requireAdminQuery(ctx);

    const allUsers = await ctx.db.query("users").collect();
    const allPosts = await ctx.db.query("posts").collect();
    const allComments = await ctx.db.query("comments").collect();
    const allLikes = await ctx.db.query("likes").collect();
    const allStories = await ctx.db.query("stories").collect();
    const allMessages = await ctx.db.query("messages").collect();

    return {
      totalUsers: allUsers.length,
      totalPosts: allPosts.length,
      totalComments: allComments.length,
      totalLikes: allLikes.length,
      totalStories: allStories.length,
      totalMessages: allMessages.length,
    };
  },
});
