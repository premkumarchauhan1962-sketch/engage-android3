import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser, ensureCurrentUser } from "./users";

export const getNotifications = query({
  args: { limit: v.optional(v.number()), supabaseId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx, args.supabaseId);
    if (!user) return [];

    const limit = args.limit ?? 30;
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("userId", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(limit);

    // Exclude follow_request notifications (handled separately by getPendingFollowRequests)
    const filtered = notifications.filter((n) => n.type !== "follow_request");

    const enriched = await Promise.all(
      notifications.map(async (n) => {
        const fromUser = await ctx.db.get(n.fromUserId);
        const post = n.postId ? await ctx.db.get(n.postId) : null;
        return { ...n, fromUser, post };
      }),
    );
    return enriched;
  },
});

export const getUnreadNotificationCount = query({
  args: { supabaseId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx, args.supabaseId);
    if (!user) return 0;

    const unread = await ctx.db
      .query("notifications")
      .withIndex("userId_read", (q) => q.eq("userId", user._id).eq("read", false))
      .collect();
    return unread.length;
  },
});

export const markNotificationsAsRead = mutation({
  args: { supabaseId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await ensureCurrentUser(ctx, args.supabaseId);
    if (!user) return;

    const unread = await ctx.db
      .query("notifications")
      .withIndex("userId_read", (q) => q.eq("userId", user._id).eq("read", false))
      .collect();

    for (const n of unread) {
      await ctx.db.patch(n._id, { read: true });
    }
  },
});
