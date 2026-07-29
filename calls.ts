import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Initiate a voice or video call.
 * Creates a call document with status "ringing".
 */
export const initiateCall = mutation({
  args: {
    receiverId: v.id("users"),
    callType: v.union(v.literal("audio"), v.literal("video")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", identity.email ?? ""))
      .unique();
    if (!user) throw new Error("User not found");

    const callerId = user._id;
    const now = Date.now();

    // Check if there's already an active call between these users
    const existingCall = await ctx.db
      .query("calls")
      .withIndex("by_participants", (q) =>
        q.eq("callerId", callerId).eq("receiverId", args.receiverId)
      )
      .order("desc")
      .first();

    if (existingCall && existingCall.status === "ringing") {
      // Already ringing, return the existing call
      return { callId: existingCall._id, status: existingCall.status };
    }

    // End any old ringing calls from this caller
    const oldCalls = await ctx.db
      .query("calls")
      .withIndex("callerId", (q) => q.eq("callerId", callerId))
      .collect();

    for (const old of oldCalls) {
      if (old.status === "ringing" || old.status === "active") {
        await ctx.db.patch(old._id, { status: "ended", endedAt: now });
      }
    }

    const callId = await ctx.db.insert("calls", {
      callerId,
      receiverId: args.receiverId,
      callType: args.callType,
      status: "ringing",
      startedAt: now,
    });

    // Also create a notification for the receiver
    await ctx.db.insert("notifications", {
      userId: args.receiverId,
      fromUserId: callerId,
      type: "follow" as const,
      read: false,
      createdAt: now,
    });

    return { callId, status: "ringing" };
  },
});

/**
 * Answer an incoming call — sets status to "active".
 */
export const answerCall = mutation({
  args: {
    callId: v.id("calls"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const call = await ctx.db.get(args.callId);
    if (!call) throw new Error("Call not found");
    if (call.status !== "ringing") throw new Error("Call is no longer ringing");

    await ctx.db.patch(args.callId, { status: "active" });
    return { callId: args.callId, status: "active" };
  },
});

/**
 * End a call — sets status to "ended".
 */
export const endCall = mutation({
  args: {
    callId: v.id("calls"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const call = await ctx.db.get(args.callId);
    if (!call) throw new Error("Call not found");

    await ctx.db.patch(args.callId, { status: "ended", endedAt: Date.now() });
    return { callId: args.callId, status: "ended" };
  },
});

/**
 * Reject a call (same as ending, but marked as missed if never answered).
 */
export const rejectCall = mutation({
  args: {
    callId: v.id("calls"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const call = await ctx.db.get(args.callId);
    if (!call) throw new Error("Call not found");

    const status = call.status === "ringing" ? "missed" : "ended";
    await ctx.db.patch(args.callId, { status, endedAt: Date.now() });
    return { callId: args.callId, status };
  },
});

/**
 * Get pending incoming call for a user.
 */
export const getPendingIncomingCall = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const call = await ctx.db
      .query("calls")
      .withIndex("receiverId", (q) => q.eq("receiverId", args.userId))
      .order("desc")
      .first();

    if (!call || call.status !== "ringing") return null;

    // Get caller info
    const caller = await ctx.db.get(call.callerId);
    return {
      ...call,
      caller: caller
        ? { _id: caller._id, name: caller.name, image: caller.image, username: caller.username }
        : null,
    };
  },
});

/**
 * Get active call for a user (as caller or receiver).
 */
export const getActiveCall = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Check as caller
    const asCaller = await ctx.db
      .query("calls")
      .withIndex("callerId", (q) => q.eq("callerId", args.userId))
      .order("desc")
      .first();

    if (asCaller && (asCaller.status === "ringing" || asCaller.status === "active")) {
      const receiver = await ctx.db.get(asCaller.receiverId);
      return {
        ...asCaller,
        otherUser: receiver
          ? { _id: receiver._id, name: receiver.name, image: receiver.image, username: receiver.username }
          : null,
        isCaller: true,
      };
    }

    // Check as receiver
    const asReceiver = await ctx.db
      .query("calls")
      .withIndex("receiverId", (q) => q.eq("receiverId", args.userId))
      .order("desc")
      .first();

    if (asReceiver && (asReceiver.status === "ringing" || asReceiver.status === "active")) {
      const caller = await ctx.db.get(asReceiver.callerId);
      return {
        ...asReceiver,
        otherUser: caller
          ? { _id: caller._id, name: caller.name, image: caller.image, username: caller.username }
          : null,
        isCaller: false,
      };
    }

    return null;
  },
});
