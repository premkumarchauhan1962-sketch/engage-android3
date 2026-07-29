import { v } from "convex/values";
import { mutation, query, QueryCtx } from "./_generated/server";
import { getCurrentUser, ensureCurrentUser } from "./users";

/**
 * Helper: check if the requesting user can view the target user's content.
 * Content is viewable if:
 * - The target user is public (not private), OR
 * - The requesting user follows the target user, OR
 * - The requesting user IS the target user
 */
async function canViewContent(ctx: QueryCtx, viewerId: string | undefined, targetUserId: string): Promise<boolean> {
  const targetUser = await ctx.db.get(targetUserId as any) as any;
  if (!targetUser) return false;
  // Public account — anyone can view
  if (!targetUser.isPrivate) return true;
  // Private account — viewer must be the user themselves or follow them
  if (viewerId === targetUserId) return true;
  if (!viewerId) return false;
  const follow = await ctx.db
    .query("follows")
    .withIndex("by_both", (q) => q.eq("followerId", viewerId as any).eq("followingId", targetUserId as any))
    .first();
  return !!follow;
}

/**
 * Helper: filter an array of posts to only those the viewer can access.
 */
async function filterViewablePosts(ctx: QueryCtx, posts: any[], viewerId: string | undefined) {
  const results = [];
  for (const post of posts) {
    if (await canViewContent(ctx, viewerId, post.userId)) {
      results.push(post);
    }
  }
  return results;
}

export const listPosts = query({
  args: { limit: v.optional(v.number()), cursor: v.optional(v.string()), supabaseId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx, args.supabaseId);
    const viewerId = user?._id as string | undefined;
    const limit = args.limit ?? 10;

    let posts = await ctx.db
      .query("posts")
      .withIndex("isReel", (q) => q.eq("isReel", false))
      .order("desc")
      .take(limit + 1);

    // Filter out posts from private accounts the viewer doesn't follow
    const viewable = await filterViewablePosts(ctx, posts, viewerId);

    const hasMore = viewable.length > limit;
    const sliced = hasMore ? viewable.slice(0, limit) : viewable;

    const enriched = await Promise.all(
      sliced.map(async (post: any) => {
        const postUser = await ctx.db.get(post.userId);
        const isLiked = user ? await ctx.db
          .query("likes")
          .withIndex("by_post_user", (q) => q.eq("postId", post._id).eq("userId", user._id))
          .first()
          .then(Boolean) : false;
        const isSaved = user ? await ctx.db
          .query("saves")
          .withIndex("by_user_post", (q) => q.eq("userId", user._id).eq("postId", post._id))
          .first()
          .then(Boolean) : false;
        return { ...post, user: postUser, isLiked, isSaved };
      }),
    );

    return { posts: enriched, hasMore };
  },
});

export const getFeedPosts = query({
  args: { limit: v.optional(v.number()), supabaseId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx, args.supabaseId);
    if (!user) return { posts: [], hasMore: false };

    const limit = args.limit ?? 10;

    const followRecords = await ctx.db
      .query("follows")
      .withIndex("followerId", (q) => q.eq("followerId", user._id))
      .collect();
    const followingIds = followRecords.map((f) => f.followingId);
    followingIds.push(user._id);

    const allPosts = await ctx.db.query("posts").collect();
    const feedPosts = allPosts
      .filter((p) => followingIds.includes(p.userId) && !p.isReel)
      .sort((a, b) => b._creationTime - a._creationTime)
      .slice(0, limit + 1);

    const hasMore = feedPosts.length > limit;
    const sliced = hasMore ? feedPosts.slice(0, limit) : feedPosts;

    const enriched = await Promise.all(
      sliced.map(async (post) => {
        const postUser = await ctx.db.get(post.userId);
        const isLiked = await ctx.db
          .query("likes")
          .withIndex("by_post_user", (q) => q.eq("postId", post._id).eq("userId", user._id))
          .first()
          .then(Boolean);
        const isSaved = await ctx.db
          .query("saves")
          .withIndex("by_user_post", (q) => q.eq("userId", user._id).eq("postId", post._id))
          .first()
          .then(Boolean);
        return { ...post, user: postUser, isLiked, isSaved };
      }),
    );

    return { posts: enriched, hasMore };
  },
});

export const createPost = mutation({
  args: {
    imageUrl: v.optional(v.string()),
    videoUrl: v.optional(v.string()),
    caption: v.optional(v.string()),
    location: v.optional(v.string()),
    isReel: v.boolean(),
    hashtags: v.array(v.string()),
    song: v.optional(v.object({
      name: v.string(),
      artist: v.optional(v.string()),
      audioUrl: v.optional(v.string()),
      artwork: v.optional(v.string()),
    })),
    supabaseId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ensureCurrentUser(ctx, args.supabaseId);
    if (!user) throw new Error("Not authenticated");

    const postId = await ctx.db.insert("posts", {
      userId: user._id,
      imageUrl: args.imageUrl,
      videoUrl: args.videoUrl,
      caption: args.caption,
      location: args.location,
      isReel: args.isReel,
      hashtags: args.hashtags,
      song: args.song,
      likesCount: 0,
      commentsCount: 0,
      savesCount: 0,
    });

    for (const tag of args.hashtags) {
      const existing = await ctx.db
        .query("hashtags")
        .withIndex("name", (q) => q.eq("name", tag.toLowerCase()))
        .first();
      if (existing) {
        await ctx.db.patch(existing._id, { postCount: existing.postCount + 1 });
      } else {
        await ctx.db.insert("hashtags", { name: tag.toLowerCase(), postCount: 1 });
      }
    }

    return postId;
  },
});

export const getPost = query({
  args: { postId: v.id("posts"), supabaseId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx, args.supabaseId);
    const post = await ctx.db.get(args.postId);
    if (!post) return null;
    const postUser = await ctx.db.get(post.userId);
    const isLiked = user ? await ctx.db
      .query("likes")
      .withIndex("by_post_user", (q) => q.eq("postId", post._id).eq("userId", user._id))
      .first()
      .then(Boolean) : false;
    const isSaved = user ? await ctx.db
      .query("saves")
      .withIndex("by_user_post", (q) => q.eq("userId", user._id).eq("postId", post._id))
      .first()
      .then(Boolean) : false;
    return { ...post, user: postUser, isLiked, isSaved };
  },
});

export const deletePost = mutation({
  args: { postId: v.id("posts"), supabaseId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await ensureCurrentUser(ctx, args.supabaseId);
    if (!user) throw new Error("Not authenticated");
    const post = await ctx.db.get(args.postId);
    if (!post) throw new Error("Post not found");
    if (post.userId !== user._id && user.role !== "admin") throw new Error("Not authorized");

    const likes = await ctx.db.query("likes").withIndex("postId", (q) => q.eq("postId", args.postId)).collect();
    for (const l of likes) await ctx.db.delete(l._id);
    const comments = await ctx.db.query("comments").withIndex("postId", (q) => q.eq("postId", args.postId)).collect();
    for (const c of comments) await ctx.db.delete(c._id);
    const saves = await ctx.db.query("saves").withIndex("postId", (q) => q.eq("postId", args.postId)).collect();
    for (const s of saves) await ctx.db.delete(s._id);

    await ctx.db.delete(args.postId);
  },
});

export const toggleLike = mutation({
  args: { postId: v.id("posts"), supabaseId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await ensureCurrentUser(ctx, args.supabaseId);
    if (!user) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("likes")
      .withIndex("by_post_user", (q) => q.eq("postId", args.postId).eq("userId", user._id))
      .first();

    const post = await ctx.db.get(args.postId);
    if (!post) throw new Error("Post not found");

    if (existing) {
      await ctx.db.delete(existing._id);
      await ctx.db.patch(args.postId, { likesCount: post.likesCount - 1 });
      return false;
    } else {
      await ctx.db.insert("likes", { postId: args.postId, userId: user._id });
      await ctx.db.patch(args.postId, { likesCount: post.likesCount + 1 });

      if (post.userId !== user._id) {
        await ctx.db.insert("notifications", {
          userId: post.userId,
          fromUserId: user._id,
          type: "like",
          postId: args.postId,
          read: false,
          createdAt: Date.now(),
        });
      }
      return true;
    }
  },
});

export const getLikes = query({
  args: { postId: v.id("posts"), supabaseId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const likes = await ctx.db.query("likes").withIndex("postId", (q) => q.eq("postId", args.postId)).collect();
    const users = await Promise.all(likes.map((l) => ctx.db.get(l.userId)));
    return users.filter(Boolean);
  },
});

export const addComment = mutation({
  args: { postId: v.id("posts"), content: v.string(), supabaseId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await ensureCurrentUser(ctx, args.supabaseId);
    if (!user) throw new Error("Not authenticated");

    await ctx.db.insert("comments", {
      postId: args.postId,
      userId: user._id,
      content: args.content,
      createdAt: Date.now(),
    });

    const post = await ctx.db.get(args.postId);
    if (post) {
      await ctx.db.patch(args.postId, { commentsCount: post.commentsCount + 1 });

      if (post.userId !== user._id) {
        await ctx.db.insert("notifications", {
          userId: post.userId,
          fromUserId: user._id,
          type: "comment",
          postId: args.postId,
          read: false,
          createdAt: Date.now(),
        });
      }
    }
  },
});

export const getComments = query({
  args: { postId: v.id("posts"), supabaseId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const comments = await ctx.db
      .query("comments")
      .withIndex("postId", (q) => q.eq("postId", args.postId))
      .order("desc")
      .collect();
    const enriched = await Promise.all(
      comments.map(async (c) => {
        const commentUser = await ctx.db.get(c.userId);
        return { ...c, user: commentUser };
      }),
    );
    return enriched;
  },
});

export const deleteComment = mutation({
  args: { commentId: v.id("comments"), supabaseId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await ensureCurrentUser(ctx, args.supabaseId);
    if (!user) throw new Error("Not authenticated");
    const comment = await ctx.db.get(args.commentId);
    if (!comment) throw new Error("Comment not found");
    if (comment.userId !== user._id && user.role !== "admin") throw new Error("Not authorized");

    const post = await ctx.db.get(comment.postId);
    if (post) {
      await ctx.db.patch(comment.postId, { commentsCount: post.commentsCount - 1 });
    }
    await ctx.db.delete(args.commentId);
  },
});

export const toggleSave = mutation({
  args: { postId: v.id("posts"), supabaseId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await ensureCurrentUser(ctx, args.supabaseId);
    if (!user) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("saves")
      .withIndex("by_user_post", (q) => q.eq("userId", user._id).eq("postId", args.postId))
      .first();

    const post = await ctx.db.get(args.postId);
    if (!post) throw new Error("Post not found");

    if (existing) {
      await ctx.db.delete(existing._id);
      await ctx.db.patch(args.postId, { savesCount: post.savesCount - 1 });
      return false;
    } else {
      await ctx.db.insert("saves", { userId: user._id, postId: args.postId });
      await ctx.db.patch(args.postId, { savesCount: post.savesCount + 1 });
      return true;
    }
  },
});

export const getSavedPosts = query({
  args: { supabaseId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx, args.supabaseId);
    if (!user) return [];

    const saves = await ctx.db.query("saves").withIndex("userId", (q) => q.eq("userId", user._id)).collect();
    const posts = await Promise.all(
      saves.map(async (s) => {
        const post = await ctx.db.get(s.postId);
        if (!post) return null;
        const postUser = await ctx.db.get(post.userId);
        return { ...post, user: postUser, isSaved: true };
      }),
    );
    return posts.filter(Boolean);
  },
});

export const listReels = query({
  args: { limit: v.optional(v.number()), supabaseId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx, args.supabaseId);
    const viewerId = user?._id as string | undefined;
    const limit = args.limit ?? 20;
    let reels = await ctx.db
      .query("posts")
      .withIndex("isReel", (q) => q.eq("isReel", true))
      .order("desc")
      .take(limit);

    // Filter out reels from private accounts the viewer doesn't follow
    reels = await filterViewablePosts(ctx, reels, viewerId) as any;

    const enriched = await Promise.all(
      reels.map(async (reel: any) => {
        const reelUser = await ctx.db.get(reel.userId);
        const isLiked = user ? await ctx.db
          .query("likes")
          .withIndex("by_post_user", (q) => q.eq("postId", reel._id).eq("userId", user._id))
          .first()
          .then(Boolean) : false;
        return { ...reel, user: reelUser, isLiked };
      }),
    );
    return enriched;
  },
});

export const getPostsByUser = query({
  args: { userId: v.id("users"), isReel: v.optional(v.boolean()), supabaseId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx, args.supabaseId);
    const viewerId = user?._id as string | undefined;

    // Privacy check: cannot view a private user's posts without following
    if (!await canViewContent(ctx, viewerId, args.userId)) {
      return [];
    }

    let posts = await ctx.db.query("posts").withIndex("userId", (q) => q.eq("userId", args.userId)).collect();
    if (args.isReel !== undefined) {
      posts = posts.filter((p) => p.isReel === args.isReel);
    }
    posts.sort((a, b) => b._creationTime - a._creationTime);

    const enriched = await Promise.all(
      posts.map(async (post) => {
        const isLiked = user ? await ctx.db
          .query("likes")
          .withIndex("by_post_user", (q) => q.eq("postId", post._id).eq("userId", user._id))
          .first()
          .then(Boolean) : false;
        const isSaved = user ? await ctx.db
          .query("saves")
          .withIndex("by_user_post", (q) => q.eq("userId", user._id).eq("postId", post._id))
          .first()
          .then(Boolean) : false;
        return { ...post, isLiked, isSaved };
      }),
    );
    return enriched;
  },
});
