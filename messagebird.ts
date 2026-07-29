import { v } from "convex/values";
import { action } from "./_generated/server";

/**
 * Internal helper: calls the MessageBird REST API to send an SMS.
 * Shared by both actions below.
 */
async function doSendSms(recipient: string, message: string, originator?: string) {
  const apiKey = process.env.MESSAGEBIRD_API_KEY;
  if (!apiKey) {
    throw new Error(
      "MESSAGEBIRD_API_KEY is not configured. " +
      "Add it to your project's Keys/API Keys tab."
    );
  }

  const sender = originator || "Engage";

  const response = await fetch("https://rest.messagebird.com/messages", {
    method: "POST",
    headers: {
      Authorization: `AccessKey ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      originator: sender,
      recipients: [recipient],
      body: message,
    }),
  });

  const body = await response.json();

  if (!response.ok) {
    console.error("MessageBird API error:", body);
    throw new Error(
      `MessageBird SMS failed: ${body.errors?.[0]?.description || response.statusText}`
    );
  }

  return { success: true, messageId: body.id } as const;
}

/**
 * Send a raw SMS message via MessageBird (Bird).
 *
 * Requires MESSAGEBIRD_API_KEY to be set in the project's Keys tab.
 *
 * @example
 * // From frontend:
 * await sendSms({ recipient: "+1234567890", message: "Hello!" });
 */
export const sendSms = action({
  args: {
    recipient: v.string(),
    message: v.string(),
    originator: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    return await doSendSms(args.recipient, args.message, args.originator);
  },
});

/**
 * Send a pre-formatted notification SMS (like, comment, follow, message).
 * A convenience wrapper around sendSms.
 */
export const sendNotificationSms = action({
  args: {
    recipient: v.string(),
    type: v.union(
      v.literal("like"),
      v.literal("comment"),
      v.literal("follow"),
      v.literal("message"),
    ),
    fromUserName: v.optional(v.string()),
    originator: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    let message = "";

    switch (args.type) {
      case "like":
        message = `${args.fromUserName || "Someone"} liked your post on Engage!`;
        break;
      case "comment":
        message = `${args.fromUserName || "Someone"} commented on your post on Engage!`;
        break;
      case "follow":
        message = `${args.fromUserName || "Someone"} started following you on Engage!`;
        break;
      case "message":
        message = `You received a new message from ${args.fromUserName || "Someone"} on Engage!`;
        break;
    }

    return await doSendSms(args.recipient, message, args.originator);
  },
});
