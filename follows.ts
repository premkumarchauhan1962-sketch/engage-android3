import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser, ensureCurrentUser } from "./users";

/**
 * Follow or unfollow a user.
 * If the target account is private, creates a follow request instead.
 * Returns: "following" | "unfollowed" | "requested" | "cancelled"
 */
export const toggleFollow = mutation({
  args: { followingId: v.id("users"), supabaseId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await ensureCurrentUser(ctx, args.supabaseId);
    if (!user) throw new Error("Not authenticated");
    if (user._id === args.followingId) throw new Error("Cannot follow yourself");

    // Get the target user
    const target = await ctx.db.get(args.followingId);
    if (!target) throw new Error("User not found");

    // Check if already following (accepted follow)
    const existing = await ctx.db
      .query("follows")
      .withIndex("by_both", (q) => q.eq("followerId", user._id).eq("followingId", args.followingId))
      .first();

    // Check if there's a pending request
    const pendingRequest = await ctx.db
      .query("followRequests")
      .withIndex("by_both", (q) => q.eq("followerId", user._id).eq("followingId", args.followingId))
      .first();

    // If already following, unfollow
    if (existing) {
      await ctx.db.delete(existing._id);
      // Also clean up any follow request records
      if (pendingRequest) await ctx.db.delete(pendingRequest._id);
      return { action: "unfollowed" as const, following: false };
    }

    // If there's a pending request, cancel it
    if (pendingRequest && pendingRequest.status === "pending") {
      await ctx.db.delete(pendingRequest._id);
      // Remove the notification too
      const notif = await ctx.db
        .query("notifications")
        .withIndex("userId", (q) => q.eq("userId", args.followingId))
        .order("desc")
        .take(10);
      for (const n of notif) {
        if (n.fromUserId === user._id && n.type === "follow_request") {
          await ctx.db.delete(n._id);
          break;
        }
      }
      return { action: "cancelled" as const, following: false };
    }

    // If target is private, create a follow request
    if (target.isPrivate) {
      // Check if there was a previously declined request
      if (pendingRequest && pendingRequest.status === "declined") {
        // User can request again - update the existing record
        await ctx.db.patch(pendingRequest._id, {
          status: "pending",
          createdAt: Date.now(),
        });
      } else {
        await ctx.db.insert("followRequests", {
          followerId: user._id,
          followingId: args.followingId,
          status: "pending",
          createdAt: Date.now(),
        });
      }

      // Send a follow_request notification — only if one doesn't already exist from this user
      const existingNotif = await ctx.db
        .query("notifications")
        .withIndex("userId", (q) => q.eq("userId", args.followingId))
        .order("desc")
        .take(20);
      const hasExistingNotif = existingNotif.some((n) => n.fromUserId === user._id && n.type === "follow_request");
      if (!hasExistingNotif) {
        await ctx.db.insert("notifications", {
          userId: args.followingId,
          fromUserId: user._id,
          type: "follow_request",
          read: false,
          createdAt: Date.now(),
        });
      }

      return { action: "requested" as const, following: false };
    }

    // Public account — follow directly
    await ctx.db.insert("follows", { followerId: user._id, followingId: args.followingId });
    await ctx.db.insert("notifications", {
      userId: args.followingId,
      fromUserId: user._id,
      type: "follow",
      read: false,
      createdAt: Date.now(),
    });
    return { action: "following" as const, following: true };
  },
});

/**
 * Accept a follow request. Creates an actual follow relationship.
 */
export const acceptFollowRequest = mutation({
  args: { followerId: v.id("users"), supabaseId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await ensureCurrentUser(ctx, args.supabaseId);
    if (!user) throw new Error("Not authenticated");

    const request = await ctx.db
      .query("followRequests")
      .withIndex("by_both", (q) => q.eq("followerId", args.followerId).eq("followingId", user._id))
      .first();

    if (!request || request.status !== "pending") throw new Error("No pending request");

    // Update request status
    await ctx.db.patch(request._id, { status: "accepted" });

    // Create the actual follow relationship
    await ctx.db.insert("follows", { followerId: args.followerId, followingId: user._id });

    // Remove the follow_request notification so it disappears from the notifications page
    const notifs = await ctx.db
      .query("notifications")
      .withIndex("userId", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(20);
    for (const n of notifs) {
      if (n.fromUserId === args.followerId && n.type === "follow_request") {
        await ctx.db.delete(n._id);
        break;
      }
    }

    // Send a follow acceptance notification back to the follower
    await ctx.db.insert("notifications", {
      userId: args.followerId,
      fromUserId: user._id,
      type: "follow",
      read: false,
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Reject (decline) a follow request.
 */
export const rejectFollowRequest = mutation({
  args: { followerId: v.id("users"), supabaseId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await ensureCurrentUser(ctx, args.supabaseId);
    if (!user) throw new Error("Not authenticated");

    const request = await ctx.db
      .query("followRequests")
      .withIndex("by_both", (q) => q.eq("followerId", args.followerId).eq("followingId", user._id))
      .first();

    if (!request || request.status !== "pending") throw new Error("No pending request");

    // Update request status to declined (so user can request again later)
    await ctx.db.patch(request._id, { status: "declined" });

    // Remove the follow_request notification
    const notifs = await ctx.db
      .query("notifications")
      .withIndex("userId", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(20);
    for (const n of notifs) {
      if (n.fromUserId === args.followerId && n.type === "follow_request") {
        await ctx.db.delete(n._id);
        break;
      }
    }

    return { success: true };
  },
});

/**
 * Get pending follow requests for the current user.
 */
export const getPendingFollowRequests = query({
  args: { supabaseId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx, args.supabaseId);
    if (!user) return [];

    const requests = await ctx.db
      .query("followRequests")
      .withIndex("followingId", (q) => q.eq("followingId", user._id))
      .collect();

    const pending = requests.filter((r) => r.status === "pending");

    const enriched = await Promise.all(
      pending.map(async (r) => {
        const follower = await ctx.db.get(r.followerId);
        return { ...r, follower };
      }),
    );

    return enriched;
  },
});

/**
 * Check if the current user has a pending follow request to a specific user.
 */
export const hasPendingFollowRequest = query({
  args: { followingId: v.id("users"), supabaseId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx, args.supabaseId);
    if (!user) return false;

    const request = await ctx.db
      .query("followRequests")
      .withIndex("by_both", (q) => q.eq("followerId", user._id).eq("followingId", args.followingId))
      .first();

    return !!request && request.status === "pending";
  },
});

/**
 * Check if current user is following another user (only accepted follows count).
 */
export const isFollowing = query({
  args: { followingId: v.id("users"), supabaseId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx, args.supabaseId);
    if (!user) return false;
    const existing = await ctx.db
      .query("follows")
      .withIndex("by_both", (q) => q.eq("followerId", user._id).eq("followingId", args.followingId))
      .first();
    return !!existing;
  },
});

/**
 * Get followers (accepted follows only).
 */
export const getFollowers = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const follows = await ctx.db.query("follows").withIndex("followingId", (q) => q.eq("followingId", args.userId)).collect();
    const users = await Promise.all(follows.map((f) => ctx.db.get(f.followerId)));
    return users.filter(Boolean);
  },
});

/**
 * Get who the user is following (accepted only).
 */
export const getFollowing = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const follows = await ctx.db.query("follows").withIndex("followerId", (q) => q.eq("followerId", args.userId)).collect();
    const users = await Promise.all(follows.map((f) => ctx.db.get(f.followingId)));
    return users.filter(Boolean);
  },
});

export const getFollowersCount = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const follows = await ctx.db.query("follows").withIndex("followingId", (q) => q.eq("followingId", args.userId)).collect();
    return follows.length;
  },
});

export const getFollowingCount = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const follows = await ctx.db.query("follows").withIndex("followerId", (q) => q.eq("followerId", args.userId)).collect();
    return follows.length;
  },
});

/**
 * Delete a follow_request notification. Called after the user follows back.
 */
export const deleteFollowRequestNotif = mutation({
  args: { followerId: v.id("users"), supabaseId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await ensureCurrentUser(ctx, args.supabaseId);
    if (!user) return;
    const notifs = await ctx.db
      .query("notifications")
      .withIndex("userId", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(20);
    for (const n of notifs) {
      if (n.fromUserId === args.followerId && n.type === "follow_request") {
        await ctx.db.delete(n._id);
        break;
      }
    }
  },
});

/**
 * Check if a specific user follows the current user.
 */
export const isFollowedBy = query({
  args: { followerUserId: v.id("users"), supabaseId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx, args.supabaseId);
    if (!user) return false;
    const existing = await ctx.db
      .query("follows")
      .withIndex("by_both", (q) => q.eq("followerId", args.followerUserId).eq("followingId", user._id))
      .first();
    return !!existing;
  },
});

export const getSuggestedUsers = query({
  args: { limit: v.optional(v.number()), supabaseId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx, args.supabaseId);
    if (!user) return [];

    const limit = args.limit ?? 5;
    const follows = await ctx.db.query("follows").withIndex("followerId", (q) => q.eq("followerId", user._id)).collect();
    const followingIds = new Set(follows.map((f) => f.followingId));
    followingIds.add(user._id);

    const allUsers = await ctx.db.query("users").collect();
    const suggested = allUsers
      .filter((u) => !followingIds.has(u._id) && u.name)
      .slice(0, limit);

    return suggested;
  },
});
