import { v } from "convex/values";
import { mutation, query, MutationCtx, QueryCtx } from "./_generated/server";

/**
 * Sync a Supabase-authenticated user into Convex.
 * Creates a new user if they don't exist, or returns the existing one.
 */
// Reserved usernames that cannot be registered
const RESERVED_USERNAMES = [
  "engage", "admin", "root", "system", "mod", "moderator",
  "support", "help", "official", "staff", "team", "api",
  "instagram", "facebook", "twitter", "meta", "google",
  "settings", "privacy", "terms", "about", "contact",
  "explore", "search", "feed", "stories", "reels",
  "message", "messages", "notification", "notifications",
];

/**
 * Check if a username is available (not taken and not reserved).
 */
export const checkUsername = query({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    const normalized = args.username.toLowerCase().trim();

    // Check reserved usernames
    if (RESERVED_USERNAMES.includes(normalized)) {
      return { available: false, reason: "This username is reserved" };
    }

    // Check if already taken
    const existing = await ctx.db
      .query("users")
      .withIndex("username", (q) => q.eq("username", normalized))
      .first();

    return { available: !existing };
  },
});

/**
 * Sync a Supabase-authenticated user into Convex.
 * Creates a new user if they don't exist, or returns the existing one.
 */
export const syncSupabaseUser = mutation({
  args: {
    supabaseId: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    username: v.optional(v.string()),
    image: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if user exists by supabaseId
    let user = await ctx.db
      .query("users")
      .withIndex("supabaseId", (q) => q.eq("supabaseId", args.supabaseId))
      .first();

    if (user) return user;

    // Check if user exists by email
    if (args.email) {
      user = await ctx.db
        .query("users")
        .withIndex("email", (q) => q.eq("email", args.email!))
        .first();
      if (user) {
        // Link the supabaseId to existing user
        const updates: Record<string, any> = { supabaseId: args.supabaseId };
        // Also set username if provided and not already set
        if (args.username && !user.username) {
          // Check username uniqueness
          const usernameLower = args.username!.toLowerCase();
          const existing = await ctx.db
            .query("users")
            .withIndex("username", (q) => q.eq("username", usernameLower))
            .first();
          if (!existing || existing._id === user._id) {
            updates.username = usernameLower;
          }
        }
        await ctx.db.patch(user._id, updates);
        return await ctx.db.get(user._id);
      }
    }

    // Create new user
    const name = args.name || args.username || (args.email ? args.email.split("@")[0] : "User");
    const userData: Record<string, any> = {
      supabaseId: args.supabaseId,
      email: args.email,
      name,
      image: args.image,
      role: "user",
    };

    // Set username if provided and unique
    const rawUsername = args.username;
    if (rawUsername) {
      const usernameLower = rawUsername.toLowerCase();
      const existing = await ctx.db
        .query("users")
        .withIndex("username", (q) => q.eq("username", usernameLower))
        .first();
      if (!existing) {
        userData.username = usernameLower;
      }
    }

    const userId = await ctx.db.insert("users", userData);
    return await ctx.db.get(userId);
  },
});

/**
 * Get current user by Supabase ID (from the frontend auth state).
 */
export const currentUser = query({
  args: { supabaseId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (!args.supabaseId) return null;

    return await ctx.db
      .query("users")
      .withIndex("supabaseId", (q) => q.eq("supabaseId", args.supabaseId!))
      .first();
  },
});

export const getUserById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

export const getUserByUsername = query({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("username", (q) => q.eq("username", args.username))
      .first();
  },
});

export const updateProfile = mutation({
  args: {
    name: v.optional(v.string()),
    username: v.optional(v.string()),
    bio: v.optional(v.string()),
    website: v.optional(v.string()),
    phone: v.optional(v.string()),
    gender: v.optional(v.string()),
    isPrivate: v.optional(v.boolean()),
    image: v.optional(v.string()),
    supabaseId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!args.supabaseId) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("supabaseId", (q) => q.eq("supabaseId", args.supabaseId!))
      .first();
    if (!user) throw new Error("User not found");

    const updates: Record<string, any> = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.username !== undefined) updates.username = args.username;
    if (args.bio !== undefined) updates.bio = args.bio;
    if (args.website !== undefined) updates.website = args.website;
    if (args.phone !== undefined) updates.phone = args.phone;
    if (args.gender !== undefined) updates.gender = args.gender;
    if (args.isPrivate !== undefined) updates.isPrivate = args.isPrivate;
    if (args.image !== undefined) updates.image = args.image;

    await ctx.db.patch(user._id, updates);
    return await ctx.db.get(user._id);
  },
});

/**
 * Get or create current user for mutations (used by other Convex functions).
 * Looks up user by Supabase ID.
 */
export async function getCurrentUser(ctx: QueryCtx | MutationCtx, supabaseId?: string | null) {
  if (!supabaseId) return null;

  return await ctx.db
    .query("users")
    .withIndex("supabaseId", (q) => q.eq("supabaseId", supabaseId!))
    .first();
}

/**
 * Get or create current user for mutations.
 */
export async function ensureCurrentUser(ctx: MutationCtx, supabaseId?: string | null) {
  if (!supabaseId) return null;

  const user = await ctx.db
    .query("users")
    .withIndex("supabaseId", (q) => q.eq("supabaseId", supabaseId!))
    .first();
  return user;
}
