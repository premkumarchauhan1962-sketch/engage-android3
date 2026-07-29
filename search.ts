import { v } from "convex/values";
import { query, QueryCtx } from "./_generated/server";
import { getCurrentUser } from "./users";

/**
 * Helper: check if the viewer can see content from the target user.
 */
async function canViewContent(ctx: QueryCtx, viewerId: string | undefined, targetUserId: string): Promise<boolean> {
  const targetUser = await ctx.db.get(targetUserId as any) as any;
  if (!targetUser) return false;
  if (!targetUser.isPrivate) return true;
  if (viewerId === targetUserId) return true;
  if (!viewerId) return false;
  const follow = await ctx.db
    .query("follows")
    .withIndex("by_both", (q) => q.eq("followerId", viewerId as any).eq("followingId", targetUserId as any))
    .first();
  return !!follow;
}

export const searchUsers = query({
  args: { query: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    if (!args.query.trim()) return [];

    const q = args.query.toLowerCase();
    const users = await ctx.db.query("users").collect();
    return users
      .filter((u) => {
        if (!u.name && !u.username) return false;
        const name = (u.name || "").toLowerCase();
        const username = (u.username || "").toLowerCase();
        return name.includes(q) || username.includes(q);
      })
      .slice(0, limit);
  },
});

export const searchPosts = query({
  args: { query: v.string(), limit: v.optional(v.number()), supabaseId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx, args.supabaseId);
    const viewerId = user?._id as string | undefined;
    const limit = args.limit ?? 30;
    if (!args.query.trim()) return [];

    const posts = await ctx.db.query("posts").collect();
    const q = args.query.toLowerCase();

    // Filter posts to only those the viewer can see
    const viewable = [];
    for (const p of posts) {
      if (await canViewContent(ctx, viewerId, p.userId)) {
        viewable.push(p);
      }
    }

    const matching = viewable
      .filter((p: any) => {
        const caption = (p.caption || "").toLowerCase();
        const hashtags = p.hashtags.join(" ").toLowerCase();
        return caption.includes(q) || hashtags.includes(q);
      })
      .sort((a: any, b: any) => b._creationTime - a._creationTime)
      .slice(0, limit);

    const enriched = await Promise.all(
      matching.map(async (post: any) => {
        const postUser = await ctx.db.get(post.userId);
        const isLiked = user ? await ctx.db
          .query("likes")
          .withIndex("by_post_user", (q2) => q2.eq("postId", post._id).eq("userId", user._id))
          .first()
          .then(Boolean) : false;
        return { ...post, user: postUser, isLiked };
      }),
    );
    return enriched;
  },
});

export const searchHashtags = query({
  args: { query: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    if (!args.query.trim()) return [];

    const q = args.query.toLowerCase();
    const hashtags = await ctx.db.query("hashtags").collect();
    return hashtags
      .filter((h) => h.name.includes(q))
      .sort((a, b) => b.postCount - a.postCount)
      .slice(0, limit);
  },
});

export const explorePosts = query({
  args: { limit: v.optional(v.number()), supabaseId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx, args.supabaseId);
    const viewerId = user?._id as string | undefined;
    const limit = args.limit ?? 30;

    const posts = await ctx.db.query("posts").collect();

    // Filter to only viewable posts
    const viewable = [];
    for (const p of posts) {
      if (!p.isReel && await canViewContent(ctx, viewerId, p.userId)) {
        viewable.push(p);
      }
    }

    const trending = (viewable as any[])
      .sort((a, b) => (b.likesCount + b.commentsCount) - (a.likesCount + a.commentsCount))
      .slice(0, limit);

    const enriched = await Promise.all(
      trending.map(async (post: any) => {
        const postUser = await ctx.db.get(post.userId);
        const isLiked = user ? await ctx.db
          .query("likes")
          .withIndex("by_post_user", (q2) => q2.eq("postId", post._id).eq("userId", user._id))
          .first()
          .then(Boolean) : false;
        return { ...post, user: postUser, isLiked };
      }),
    );
    return enriched;
  },
});
