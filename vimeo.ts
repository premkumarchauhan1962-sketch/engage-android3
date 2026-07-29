"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";

// Initialize Vimeo client (lazy-init so it only loads when used)
function getVimeoClient() {
  const Vimeo = require("@vimeo/vimeo").Vimeo;
  const clientId = process.env.VIMEO_CLIENT_ID;
  const clientSecret = process.env.VIMEO_CLIENT_SECRET;
  const accessToken = process.env.VIMEO_ACCESS_TOKEN;

  if (!accessToken) {
    throw new Error(
      "VIMEO_ACCESS_TOKEN environment variable is not set. " +
      "Add it to your Convex Dashboard environment variables."
    );
  }

  const client = new Vimeo(clientId || "", clientSecret || "", accessToken);
  return client;
}

/**
 * Upload a video to Vimeo.
 * Usage: Call this action from the frontend with the video URL to ingest.
 */
export const uploadVideo = action({
  args: {
    videoUrl: v.string(),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const client = getVimeoClient();

    return new Promise((resolve, reject) => {
      client.upload(
        args.videoUrl,
        {
          name: args.name || "Pulse Video",
          description: args.description || "Uploaded via Pulse",
        },
        (uri: string) => {
          // Extract video ID from the URI (/videos/{id})
          const videoId = uri.split("/").pop();
          resolve({
            vimeoUri: uri,
            vimeoId: videoId,
            embedUrl: `https://player.vimeo.com/video/${videoId}`,
            videoUrl: `https://vimeo.com/${videoId}`,
          });
        },
        (bytesUploaded: number, totalBytes: number) => {
          console.log(`Upload progress: ${bytesUploaded}/${totalBytes}`);
        },
        (error: Error) => {
          console.error("Vimeo upload failed:", error);
          reject(new Error(`Vimeo upload failed: ${error.message}`));
        },
      );
    });
  },
});

/**
 * Get video details from Vimeo.
 */
export const getVideo = action({
  args: { vimeoId: v.string() },
  handler: async (ctx, args) => {
    const client = getVimeoClient();
    const response = await fetch(`https://api.vimeo.com/videos/${args.vimeoId}`, {
      headers: {
        Authorization: `Bearer ${process.env.VIMEO_ACCESS_TOKEN}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Vimeo API error: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      vimeoId: args.vimeoId,
      embedUrl: `https://player.vimeo.com/video/${args.vimeoId}`,
      name: data.name,
      description: data.description,
      duration: data.duration,
      width: data.width,
      height: data.height,
      thumbnailUrl: data.pictures?.sizes?.[data.pictures.sizes.length - 1]?.link,
      playerEmbedUrl: data.player_embed_url,
    };
  },
});

/**
 * Search Vimeo videos (requires Vimeo Pro or higher).
 */
export const searchVideos = action({
  args: {
    query: v.string(),
    perPage: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const client = getVimeoClient();
    const perPage = args.perPage ?? 10;

    const response = await fetch(
      `https://api.vimeo.com/videos?query=${encodeURIComponent(args.query)}&per_page=${perPage}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.VIMEO_ACCESS_TOKEN}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Vimeo search error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data?.map((video: any) => ({
      vimeoId: video.uri.split("/").pop(),
      embedUrl: `https://player.vimeo.com/video/${video.uri.split("/").pop()}`,
      name: video.name,
      duration: video.duration,
      thumbnailUrl: video.pictures?.sizes?.[video.pictures.sizes.length - 1]?.link,
    })) ?? [];
  },
});
