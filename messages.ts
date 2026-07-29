import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser, ensureCurrentUser } from "./users";

export const sendMessage = mutation({
  args: {
    receiverId: v.id("users"),
    content: v.string(),
    imageUrl: v.optional(v.string()),
    supabaseId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ensureCurrentUser(ctx, args.supabaseId);
    if (!user) throw new Error("Not authenticated");

    await ctx.db.insert("messages", {
      senderId: user._id,
      receiverId: args.receiverId,
      content: args.content,
      imageUrl: args.imageUrl,
      createdAt: Date.now(),
    });

    const participants = [user._id, args.receiverId].sort();
    let conversation = await ctx.db
      .query("conversations")
      .withIndex("participants", (q) => q.eq("participantIds", participants))
      .first();

    if (conversation) {
      await ctx.db.patch(conversation._id, {
        lastMessageContent: args.content,
        lastMessageAt: Date.now(),
        lastSenderId: user._id,
      });
    } else {
      await ctx.db.insert("conversations", {
        participantIds: participants,
        lastMessageContent: args.content,
        lastMessageAt: Date.now(),
        lastSenderId: user._id,
      });
    }

    // No notification created — unread message count is shown as a badge on the Messages icon instead
  },
});

export const getConversations = query({
  args: { supabaseId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx, args.supabaseId);
    if (!user) return [];

    const conversations = await ctx.db.query("conversations").collect();
    const userConversations = conversations.filter((c) => c.participantIds.includes(user._id));
    userConversations.sort((a, b) => (b.lastMessageAt ?? 0) - (a.lastMessageAt ?? 0));

    const enriched = await Promise.all(
      userConversations.map(async (conv) => {
        const otherUserId = conv.participantIds.find((id) => id !== user._id);
        const otherUser = otherUserId ? await ctx.db.get(otherUserId) : null;
        return { ...conv, otherUser };
      }),
    );
    return enriched;
  },
});

export const getMessages = query({
  args: {
    otherUserId: v.id("users"),
    limit: v.optional(v.number()),
    supabaseId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx, args.supabaseId);
    if (!user) return [];

    const limit = args.limit ?? 50;

    const sent = await ctx.db
      .query("messages")
      .withIndex("by_participants", (q) => q.eq("senderId", user._id).eq("receiverId", args.otherUserId))
      .order("desc")
      .take(limit);

    const received = await ctx.db
      .query("messages")
      .withIndex("by_participants", (q) => q.eq("senderId", args.otherUserId).eq("receiverId", user._id))
      .order("desc")
      .take(limit);

    const all = [...sent, ...received].sort((a, b) => a.createdAt - b.createdAt);
    return all.slice(-limit);
  },
});

export const markAsRead = mutation({
  args: { messageIds: v.array(v.id("messages")) },
  handler: async (ctx, args) => {
    const now = Date.now();
    for (const id of args.messageIds) {
      await ctx.db.patch(id, { readAt: now });
    }
  },
});

export const getUnreadCount = query({
  args: { supabaseId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx, args.supabaseId);
    if (!user) return 0;

    const messages = await ctx.db.query("messages").withIndex("receiverId", (q) => q.eq("receiverId", user._id)).collect();
    return messages.filter((m) => !m.readAt).length;
  },
});
