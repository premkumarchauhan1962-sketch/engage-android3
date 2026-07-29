"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";

/**
 * api.video integration for uploading, managing, and streaming videos.
 *
 * Requires API_VIDEO_API_KEY to be set in the project's Keys tab.
 *
 * Docs: https://docs.api.video/
 * Base URL: https://ws.api.video
 */

const API_BASE = "https://ws.api.video";

/**
 * Internal helper: make a JSON request to the api.video REST API.
 */
async function apiVideoFetch(
  path: string,
  options: { method?: string; body?: Record<string, unknown> } = {},
) {
  const apiKey = process.env.API_VIDEO_API_KEY;
  if (!apiKey) {
    throw new Error(
      "API_VIDEO_API_KEY is not configured. " +
      "Add it to your project's Keys/API Keys tab."
    );
  }

  // Get a temporary bearer token
  const tokenRes = await fetch(`${API_BASE}/auth/api-key`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey }),
  });

  if (!tokenRes.ok) {
    const errBody = await tokenRes.json().catch(() => ({}));
    const err = errBody as any;
    throw new Error(
      `api.video auth failed: ${err.title || tokenRes.statusText}`
    );
  }

  const tokenData = await tokenRes.json() as { access_token: string };
  const { access_token } = tokenData;

  const res = await fetch(`${API_BASE}${path}`, {
    method: options.method || "GET",
    headers: {
      Authorization: `Bearer ${access_token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  });

  const data = await res.json() as any;

  if (!res.ok) {
    throw new Error(
      `api.video error: ${data.title || data.detail || res.statusText}`
    );
  }

  return data as Record<string, unknown>;
}

/**
 * Create a video object and return an upload URL/token.
 * After calling this, upload the video file via the returned upload-token URL.
 */
export const createVideo = action({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    public: v.optional(v.boolean()),
    mp4Support: v.optional(v.boolean()),
    panoramic: v.optional(v.boolean()),
  },
  handler: async (_ctx, args) => {
    const d = (await apiVideoFetch("/videos", {
      method: "POST",
      body: {
        title: args.title,
        description: args.description,
        tags: args.tags,
        public: args.public ?? true,
        mp4Support: args.mp4Support ?? true,
        panoramic: args.panoramic ?? false,
      },
    })) as any;

    return {
      videoId: d.videoId as string,
      assetId: d.assets?.mp4 as string | undefined,
      playerUrl: `https://embed.api.video/${d.videoId}`,
      thumbnailUrl: d.assets?.thumbnail as string | undefined,
      uploadToken: d.uploadToken as string | undefined,
      title: d.title as string,
    };
  },
});

/**
 * Upload a video from a publicly accessible URL.
 * api.video will ingest the video from the source URL.
 */
export const uploadVideoFromUrl = action({
  args: {
    videoId: v.string(),
    sourceUrl: v.string(),
  },
  handler: async (_ctx, args) => {
    const d = (await apiVideoFetch(`/videos/${args.videoId}/source`, {
      method: "POST",
      body: { source: args.sourceUrl },
    })) as any;

    return {
      videoId: d.videoId as string,
      status: d.status as string,
      title: d.title as string,
      duration: d.duration as number | undefined,
    };
  },
});

/**
 * Get video details by ID.
 */
export const getVideo = action({
  args: { videoId: v.string() },
  handler: async (_ctx, args) => {
    const d = (await apiVideoFetch(`/videos/${args.videoId}`)) as any;

    return {
      videoId: d.videoId as string,
      title: d.title as string,
      description: d.description as string | undefined,
      duration: d.duration as number | undefined,
      publishedAt: d.publishedAt as string | undefined,
      tags: d.tags as string[] | undefined,
      playerUrl: `https://embed.api.video/${d.videoId}`,
      thumbnailUrl: d.assets?.thumbnail as string | undefined,
      mp4Url: d.assets?.mp4 as string | undefined,
      status: d.status as string | undefined,
    };
  },
});

/**
 * List videos in your api.video account.
 */
export const listVideos = action({
  args: {
    limit: v.optional(v.number()),
    currentPage: v.optional(v.number()),
    sortBy: v.optional(v.string()),
    sortOrder: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const params = new URLSearchParams();
    if (args.limit) params.set("pageSize", String(args.limit));
    if (args.currentPage) params.set("currentPage", String(args.currentPage));
    if (args.sortBy) params.set("sortBy", args.sortBy);
    if (args.sortOrder) params.set("sortOrder", args.sortOrder);

    const qs = params.toString();
    const d = (await apiVideoFetch(`/videos${qs ? `?${qs}` : ""}`)) as any;

    return {
      videos: (d.data as any[])?.map((v: any) => ({
        videoId: v.videoId as string,
        title: v.title as string,
        duration: v.duration as number | undefined,
        playerUrl: `https://embed.api.video/${v.videoId}`,
        thumbnailUrl: v.assets?.thumbnail as string | undefined,
      })) ?? [],
      totalCount: d.pagination?.pagesTotal as number ?? 0,
    };
  },
});

/**
 * Delete a video by ID.
 */
export const deleteVideo = action({
  args: { videoId: v.string() },
  handler: async (_ctx, args) => {
    await apiVideoFetch(`/videos/${args.videoId}`, { method: "DELETE" });
    return { success: true };
  },
});

/**
 * Update video metadata.
 */
export const updateVideo = action({
  args: {
    videoId: v.string(),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    public: v.optional(v.boolean()),
  },
  handler: async (_ctx, args) => {
    const body: Record<string, unknown> = {};
    if (args.title !== undefined) body.title = args.title;
    if (args.description !== undefined) body.description = args.description;
    if (args.tags !== undefined) body.tags = args.tags;
    if (args.public !== undefined) body.public = args.public;

    const d = (await apiVideoFetch(`/videos/${args.videoId}`, {
      method: "PATCH",
      body,
    })) as any;

    return {
      videoId: d.videoId as string,
      title: d.title as string,
      description: d.description as string | undefined,
    };
  },
});
