/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as apivideo from "../apivideo.js";
import type * as auth from "../auth.js";
import type * as follows from "../follows.js";
import type * as http from "../http.js";
import type * as messagebird from "../messagebird.js";
import type * as messages from "../messages.js";
import type * as notifications from "../notifications.js";
import type * as posts from "../posts.js";
import type * as search from "../search.js";
import type * as stories from "../stories.js";
import type * as users from "../users.js";
import type * as vimeo from "../vimeo.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  apivideo: typeof apivideo;
  auth: typeof auth;
  follows: typeof follows;
  http: typeof http;
  messagebird: typeof messagebird;
  messages: typeof messages;
  notifications: typeof notifications;
  posts: typeof posts;
  search: typeof search;
  stories: typeof stories;
  users: typeof users;
  vimeo: typeof vimeo;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
