import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser, ensureCurrentUser } from "./users";

export const createStory = mutation({
  args: {
    imageUrl: v.optional(v.string()),
    videoUrl: v.optional(v.string()),
    song: v.optional(v.object({
      name: v.string(),
      artist: v.optional(v.string()),
      audioUrl: v.optional(v.string()),
      artwork: v.optional(v.string()),
    })),
    duration: v.optional(v.number()),
    supabaseId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ensureCurrentUser(ctx, args.supabaseId);
    if (!user) throw new Error("Not authenticated");
    if (!args.imageUrl && !args.videoUrl) throw new Error("Must provide image or video");

    const now = Date.now();
    const expiresAt = now + 24 * 60 * 60 * 1000;

    await ctx.db.insert("stories", {
      userId: user._id,
      imageUrl: args.imageUrl,
      videoUrl: args.videoUrl,
      song: args.song,
      createdAt: now,
      expiresAt,
      viewedBy: [],
      duration: args.duration,
    });
  },
});

export const deleteStory = mutation({
  args: {
    storyId: v.id("stories"),
    supabaseId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ensureCurrentUser(ctx, args.supabaseId);
    if (!user) throw new Error("Not authenticated");

    const story = await ctx.db.get(args.storyId);
    if (!story) throw new Error("Story not found");
    if (story.userId !== user._id) throw new Error("Not authorized to delete this story");

    await ctx.db.delete(args.storyId);
  },
});

export const getActiveStories = query({
  args: { supabaseId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx, args.supabaseId);
    if (!user) return [];

    const now = Date.now();

    const follows = await ctx.db.query("follows").withIndex("followerId", (q) => q.eq("followerId", user._id)).collect();
    const followingIds = new Set(follows.map((f) => f.followingId));
    followingIds.add(user._id);

    const allStories = await ctx.db.query("stories").collect();
    const activeStories = allStories.filter((s) => s.expiresAt > now && followingIds.has(s.userId));

    const storyMap = new Map<string, typeof activeStories>();
    for (const story of activeStories) {
      const existing = storyMap.get(story.userId) || [];
      existing.push(story);
      storyMap.set(story.userId, existing);
    }

    const result = await Promise.all(
      Array.from(storyMap.entries()).map(async ([userId, stories]) => {
        const storyUser = await ctx.db.get(userId as any);
        return {
          user: storyUser,
          stories: stories.sort((a, b) => a.createdAt - b.createdAt),
          hasUnseen: stories.some((s) => !s.viewedBy.includes(user._id)),
        };
      }),
    );

    return result.sort((a, b) => {
      if (a.hasUnseen && !b.hasUnseen) return -1;
      if (!a.hasUnseen && b.hasUnseen) return 1;
      return 0;
    });
  },
});

export const viewStory = mutation({
  args: { storyId: v.id("stories"), supabaseId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await ensureCurrentUser(ctx, args.supabaseId);
    if (!user) throw new Error("Not authenticated");

    const story = await ctx.db.get(args.storyId);
    if (!story) throw new Error("Story not found");

    if (!story.viewedBy.includes(user._id)) {
      await ctx.db.patch(args.storyId, {
        viewedBy: [...story.viewedBy, user._id],
      });
    }
  },
});

export const getMyStories = query({
  args: { supabaseId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx, args.supabaseId);
    if (!user) return [];

    const now = Date.now();
    const stories = await ctx.db.query("stories").withIndex("userId", (q) => q.eq("userId", user._id)).collect();
    return stories.filter((s) => s.expiresAt > now).sort((a, b) => a.createdAt - b.createdAt);
  },
});

export const updateStorySong = mutation({
  args: {
    storyId: v.id("stories"),
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

    const story = await ctx.db.get(args.storyId);
    if (!story) throw new Error("Story not found");
    if (story.userId !== user._id) throw new Error("Not authorized");

    await ctx.db.patch(args.storyId, { song: args.song });
  },
});

export const likeStory = mutation({
  args: {
    storyId: v.id("stories"),
    supabaseId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ensureCurrentUser(ctx, args.supabaseId);
    if (!user) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("storyLikes")
      .withIndex("by_story_user", (q) => q.eq("storyId", args.storyId).eq("userId", user._id))
      .first();

    if (!existing) {
      await ctx.db.insert("storyLikes", {
        storyId: args.storyId,
        userId: user._id,
      });

      // Notify story owner
      const story = await ctx.db.get(args.storyId);
      if (story && story.userId !== user._id) {
        await ctx.db.insert("notifications", {
          userId: story.userId,
          fromUserId: user._id,
          type: "like",
          read: false,
          createdAt: Date.now(),
        });
      }

      return { liked: true };
    }

    return { liked: false };
  },
});

export const unlikeStory = mutation({
  args: {
    storyId: v.id("stories"),
    supabaseId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ensureCurrentUser(ctx, args.supabaseId);
    if (!user) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("storyLikes")
      .withIndex("by_story_user", (q) => q.eq("storyId", args.storyId).eq("userId", user._id))
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
      return { unliked: true };
    }

    return { unliked: false };
  },
});

export const getStoryLikes = query({
  args: { storyId: v.id("stories"), supabaseId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const likes = await ctx.db
      .query("storyLikes")
      .withIndex("storyId", (q) => q.eq("storyId", args.storyId))
      .collect();
    return likes.length;
  },
});

export const getStoryLikers = query({
  args: { storyId: v.id("stories"), supabaseId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const likes = await ctx.db
      .query("storyLikes")
      .withIndex("storyId", (q) => q.eq("storyId", args.storyId))
      .collect();

    const users = await Promise.all(
      likes.map((l) => ctx.db.get(l.userId as any)),
    );
    return users.filter(Boolean);
  },
});

export const getStoryViewers = query({
  args: { storyId: v.id("stories") },
  handler: async (ctx, args) => {
    const story = await ctx.db.get(args.storyId);
    if (!story) return [];

    const users = await Promise.all(
      story.viewedBy.map((uid) => ctx.db.get(uid as any)),
    );
    return users.filter(Boolean);
  },
});

export const hasUserLikedStory = query({
  args: { storyId: v.id("stories"), supabaseId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx, args.supabaseId);
    if (!user) return false;

    const existing = await ctx.db
      .query("storyLikes")
      .withIndex("by_story_user", (q) => q.eq("storyId", args.storyId).eq("userId", user._id))
      .first();

    return !!existing;
  },
});

export const cleanupExpiredStories = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const expired = await ctx.db.query("stories").withIndex("expiresAt", (q) => q.lte("expiresAt", now)).collect();
    for (const story of expired) {
      await ctx.db.delete(story._id);
    }
    return expired.length;
  },
});
