import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

export const ROLES = {
  ADMIN: "admin",
  USER: "user",
  MEMBER: "member",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.USER),
  v.literal(ROLES.MEMBER),
);
export type Role = Infer<typeof roleValidator>;

const schema = defineSchema(
  {
    users: defineTable({
      name: v.optional(v.string()),
      image: v.optional(v.string()),
      email: v.optional(v.string()),
      supabaseId: v.optional(v.string()),
      role: v.optional(roleValidator),
      username: v.optional(v.string()),
      bio: v.optional(v.string()),
      website: v.optional(v.string()),
      phone: v.optional(v.string()),
      gender: v.optional(v.string()),
      isPrivate: v.optional(v.boolean()),
    })
      .index("email", ["email"])
      .index("username", ["username"])
      .index("supabaseId", ["supabaseId"]),

    posts: defineTable({
      userId: v.id("users"),
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
      likesCount: v.number(),
      commentsCount: v.number(),
      savesCount: v.number(),
    })
      .index("userId", ["userId"])
      .index("isReel", ["isReel"])
      .searchIndex("search_caption", { searchField: "caption" })
      .searchIndex("search_hashtags", { searchField: "hashtags" }),

    stories: defineTable({
      userId: v.id("users"),
      imageUrl: v.optional(v.string()),
      videoUrl: v.optional(v.string()),
      song: v.optional(v.object({
        name: v.string(),
        artist: v.optional(v.string()),
        audioUrl: v.optional(v.string()),
        artwork: v.optional(v.string()),
      })),
      createdAt: v.number(),
      expiresAt: v.number(),
      viewedBy: v.array(v.id("users")),
      duration: v.optional(v.number()), // in ms, 15000 default for photos, video length for videos
    })
      .index("userId", ["userId"])
      .index("expiresAt", ["expiresAt"]),

    comments: defineTable({
      postId: v.id("posts"),
      userId: v.id("users"),
      content: v.string(),
      createdAt: v.number(),
    })
      .index("postId", ["postId"])
      .index("userId", ["userId"]),

    likes: defineTable({
      postId: v.id("posts"),
      userId: v.id("users"),
    })
      .index("postId", ["postId"])
      .index("userId", ["userId"])
      .index("by_post_user", ["postId", "userId"]),

    follows: defineTable({
      followerId: v.id("users"),
      followingId: v.id("users"),
    })
      .index("followerId", ["followerId"])
      .index("followingId", ["followingId"])
      .index("by_both", ["followerId", "followingId"]),

    messages: defineTable({
      senderId: v.id("users"),
      receiverId: v.id("users"),
      content: v.string(),
      imageUrl: v.optional(v.string()),
      createdAt: v.number(),
      readAt: v.optional(v.number()),
    })
      .index("senderId", ["senderId"])
      .index("receiverId", ["receiverId"])
      .index("by_participants", ["senderId", "receiverId", "createdAt"]),

    conversations: defineTable({
      participantIds: v.array(v.id("users")),
      lastMessageContent: v.optional(v.string()),
      lastMessageAt: v.optional(v.number()),
      lastSenderId: v.optional(v.id("users")),
    })
      .index("participants", ["participantIds"]),

    followRequests: defineTable({
      followerId: v.id("users"),
      followingId: v.id("users"),
      status: v.union(v.literal("pending"), v.literal("accepted"), v.literal("declined")),
      createdAt: v.number(),
    })
      .index("followerId", ["followerId"])
      .index("followingId", ["followingId"])
      .index("by_both", ["followerId", "followingId"])
      .index("status", ["status"]),

    notifications: defineTable({
      userId: v.id("users"),
      fromUserId: v.id("users"),
      type: v.union(
        v.literal("like"),
        v.literal("comment"),
        v.literal("follow"),
        v.literal("mention"),
        v.literal("message"),
        v.literal("follow_request"),
      ),
      postId: v.optional(v.id("posts")),
      read: v.boolean(),
      createdAt: v.number(),
    })
      .index("userId", ["userId"])
      .index("userId_read", ["userId", "read"]),

    saves: defineTable({
      userId: v.id("users"),
      postId: v.id("posts"),
    })
      .index("userId", ["userId"])
      .index("postId", ["postId"])
      .index("by_user_post", ["userId", "postId"]),

    storyLikes: defineTable({
      storyId: v.id("stories"),
      userId: v.id("users"),
    })
      .index("storyId", ["storyId"])
      .index("userId", ["userId"])
      .index("by_story_user", ["storyId", "userId"]),

    hashtags: defineTable({
      name: v.string(),
      postCount: v.number(),
    })
      .index("name", ["name"])
      .searchIndex("search_name", { searchField: "name" }),
  },
  {
    schemaValidation: false,
  },
);

export default schema;
